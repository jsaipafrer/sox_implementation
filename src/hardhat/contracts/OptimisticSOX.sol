// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import {DisputeDeployer} from "./DisputeDeployer.sol";

/**
 * @dev Enum representing the different states of the optimistic process
 */
enum OptimisticState {
    WaitPayment,
    WaitKey,
    WaitSB,
    WaitSV,
    InDispute,
    End
}

interface IOptimisticSOX {
    function buyer() external view returns (address);
    function vendor() external view returns (address);
    function sponsor() external view returns (address);
    function buyerDisputeSponsor() external view returns (address);
    function vendorDisputeSponsor() external view returns (address);

    function agreedPrice() external view returns (uint256);
    function timeoutIncrement() external view returns (uint256);

    function currState() external view returns (OptimisticState);

    function endDispute() external;
}

/**
 * @title OptimisticSOX
 * @notice A contract for handling the optimistic phase.
 * @dev This contract manages the states and transitions of an optimistic phase.
 */
contract OptimisticSOX is IOptimisticSOX {
    // TODO sponsorship/refunds

    // TODO: SET THE NECESSARY VALUES AND CONSTANTS
    /**
     * @dev The sponsor fees required for the transaction.
     */
    uint256 constant SPONSOR_FEES = 5 wei; // dummy value
    /**
     * @dev The dispute fees required for the transaction.
     */
    uint256 constant DISPUTE_FEES = 10 wei; // dummy value

    // Addresses
    /**
     * @dev The address of the buyer.
     */
    address public buyer;

    /**
     * @dev The address of the vendor.
     */
    address public vendor;

    /**
     * @dev The address of the sponsor.
     */
    address public sponsor;

    /**
     * @dev The address of the buyer's dispute sponsor.
     */
    address public buyerDisputeSponsor;

    /**
     * @dev The address of the vendor's dispute sponsor.
     */
    address public vendorDisputeSponsor;

    /**
     * @dev The address of the dispute contract.
     */
    address public disputeContract;

    /**
     * @dev The current state of the optimistic phase.
     */
    OptimisticState public currState;

    /**
     * @dev The decryption key.
     */
    bytes public key;

    /**
     * @dev The agreed price for the asset.
     */
    uint256 public agreedPrice;

    /**
     * @dev The tip for sponsoring the optimistic phase
     */
    uint256 public completionTip;

    /**
     * @dev The tip for sponsoring the dispute.
     */
    uint256 public disputeTip;

    /**
     * @dev The increment for the timeout.
     */
    uint256 public timeoutIncrement;

    /**
     * @dev The commitment hash.
     */
    bytes32 public commitment;

    /**
     * @dev The number of gates in the circuit.
     */
    uint32 public numGates;

    /**
     * @dev The number of blocks in the ciphertext.
     */
    uint32 public numBlocks;

    // Money states
    /**
     * @dev The deposit made by the sponsor.
     */
    uint256 public sponsorDeposit;

    /**
     * @dev The deposit made by the buyer.
     */
    uint256 public buyerDeposit;

    /**
     * @dev The deposit made by the buyer's dispute sponsor.
     */
    uint256 public sbDeposit;

    /**
     * @dev The deposit made by the vendor's dispute sponsor.
     */
    uint256 public svDeposit;

    /**
     * @dev The tip for the sponsor.
     */
    uint256 public sponsorTip;

    /**
     * @dev The tip for the buyer's dispute sponsor.
     */
    uint256 public sbTip;

    /**
     * @dev The tip for the vendor's dispute sponsor.
     */
    uint256 public svTip;

    /**
     * @dev The next time the timeout is triggered (unless state changes).
     */
    uint256 public nextTimeoutTime;

    // checks whether the sender and the state are expected for the execution
    // of a function
    modifier onlyExpected(address _sender, OptimisticState _state) {
        require(msg.sender == _sender, "Unexpected sender");
        require(
            currState == _state,
            "Cannot run this function in the current state"
        );
        _;
    }

    // transitions to the given state and increments the timeout
    function nextState(OptimisticState _s) internal {
        currState = _s;
        nextTimeoutTime = block.timestamp + timeoutIncrement;
    }

    constructor(
        address _buyer,
        address _vendor,
        uint256 _agreedPrice,
        uint256 _completionTip,
        uint256 _disputeTip,
        uint256 _timeoutIncrement,
        bytes32 _commitment,
        uint32 _numBlocks,
        uint32 _numGates
    ) payable {
        require(msg.value >= SPONSOR_FEES, "Not enough money to cover fees");
        sponsorDeposit = msg.value;
        sponsor = msg.sender;
        buyer = _buyer;
        vendor = _vendor;
        agreedPrice = _agreedPrice;
        completionTip = _completionTip;
        disputeTip = _disputeTip;
        timeoutIncrement = _timeoutIncrement;
        commitment = _commitment;
        numBlocks = _numBlocks;
        numGates = _numGates;
        nextState(OptimisticState.WaitPayment);
    }

    /**
     * @notice Function for the buyer to send the payment.
     * @dev This function is called by the buyer to send the payment for the transaction. 
     It reverts if the buyer doesn't send enough funds.
     */
    function sendPayment()
        public
        payable
        onlyExpected(buyer, OptimisticState.WaitPayment)
    {
        require(
            msg.value >= agreedPrice + completionTip,
            "Agreed price and completion tip is higher than deposit"
        );

        buyerDeposit = msg.value;
        sponsorTip = buyerDeposit - agreedPrice;

        nextState(OptimisticState.WaitKey);
    }

    /**
     * @notice Function for the vendor to send the key.
     * @dev This function is called by the vendor to send the key for the transaction.
     * @param _key The key to be sent.
     */
    function sendKey(
        bytes calldata _key
    ) public onlyExpected(vendor, OptimisticState.WaitKey) {
        key = _key;
        nextState(OptimisticState.WaitSB);
    }

    /**
     * @notice Function for the buyer's dispute sponsor to deposit the fees and tip
     * @dev This function is called by the buyer's dispute sponsor to send the
     dispute sponsor fee. It reverts if the amount deposited is too low.
     */
    function sendBuyerDisputeSponsorFee() public payable {
        require(
            currState == OptimisticState.WaitSB,
            "Cannot run this function in the current state"
        );

        require(
            msg.value >= DISPUTE_FEES + disputeTip,
            "Not enough money deposited to cover dispute fees + tip"
        );

        buyerDisputeSponsor = msg.sender;
        sbDeposit = msg.value;
        sbTip = msg.value - DISPUTE_FEES;
        nextState(OptimisticState.WaitSV);
    }

    /**
     * @notice Function for the vendor's dispute sponsor to deposit the fees and tip
     * @dev This function is called by the vendor's dispute sponsor to send the
     dispute sponsor fee. It reverts if the amount deposited is too low. It
     automatically deploys the dispute smart contract.
     */
    function sendVendorDisputeSponsorFee() public payable {
        require(
            currState == OptimisticState.WaitSV,
            "Cannot run this function in the current state"
        );

        require(
            msg.value >= DISPUTE_FEES + disputeTip,
            "Not enough money deposited to cover dispute fees + tip"
        );

        vendorDisputeSponsor = msg.sender;
        svDeposit = msg.value;
        svTip = msg.value - DISPUTE_FEES;

        disputeContract = DisputeDeployer.deployDispute(
            numBlocks,
            numGates,
            commitment
        );

        nextState(OptimisticState.InDispute);
    }

    /**
     * @notice Function for the dispute smart contract to signal that the dispute
     phase is over
     * @dev This function can only be called by the dispute smart contract and
     transitions this contract to the End state
     */
    function endDispute()
        public
        onlyExpected(disputeContract, OptimisticState.InDispute)
    {
        nextState(OptimisticState.End);
    }

    /**
     * @notice Function to complete the transaction.
     * @dev This function is called to complete the transaction either by the
     buyer whenever the contract is waiting for a dispute sponsor from the buyer
     or by anyone else after the timeout has passed during this same waiting time
     */
    function completeTransaction() public {
        require(
            currState == OptimisticState.WaitSB,
            "Not in a state where the transaction can be completed"
        );

        if (msg.sender != buyer) {
            // only the buyer can complete before timeout
            require(timeoutHasPassed(), "Timeout has not passed");
        }

        payable(vendor).transfer(agreedPrice);

        // consider that the remaining funds are for the sponsor
        payable(sponsor).transfer(address(this).balance);
        nextState(OptimisticState.End);
    }

    /**
     * @notice Function to cancel the transaction.
     * @dev This function is called to cancel the transaction at appropriate
     times but only when the timeout has passed
     */
    function cancelTransaction() public {
        require(timeoutHasPassed(), "Timeout has not passed");

        if (currState == OptimisticState.WaitPayment) {
            payable(sponsor).transfer(address(this).balance);
            return nextState(OptimisticState.End);
        } else if (currState == OptimisticState.WaitKey) {
            payable(buyer).transfer(agreedPrice);

            payable(sponsor).transfer(address(this).balance);
            return nextState(OptimisticState.End);
        } else if (currState == OptimisticState.WaitSV) {
            payable(buyerDisputeSponsor).transfer(sbDeposit + sbTip);

            payable(buyer).transfer(agreedPrice);

            payable(sponsor).transfer(address(this).balance);
            return nextState(OptimisticState.End);
        }

        revert("Not in a state in which the transaction can be cancelled");
    }

    /**
     * @notice Function to check if the timeout has passed.
     * @dev This function checks if the current time has passed the next timeout time.
     * @return A boolean indicating if the timeout has passed.
     */
    function timeoutHasPassed() public view returns (bool) {
        return block.timestamp >= nextTimeoutTime;
    }
}

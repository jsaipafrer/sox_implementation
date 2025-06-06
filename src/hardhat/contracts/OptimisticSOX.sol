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
    WaitSBFee,
    WaitSV,
    WaitSVFee,
    WaitDisputeStart,
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

contract OptimisticSOX is IOptimisticSOX {
    // TODO sponsorship/refunds

    // TODO: SET THE NECESSARY VALUES AND CONSTANTS
    uint256 constant SPONSOR_FEES = 5 wei; // dummy value
    uint256 constant DISPUTE_FEES = 10 wei; // dummy value

    // Addresses
    address public buyer;
    address public vendor;
    address public sponsor;
    address public buyerDisputeSponsor;
    address public vendorDisputeSponsor;
    address public disputeContract;

    /**
     * @dev The current state of the optimistic process
     */
    OptimisticState public currState;

    // Values agreed in precontract
    bytes public key;
    uint256 public agreedPrice;
    uint256 public completionTip;
    uint256 public disputeTip;
    uint256 public timeoutIncrement;
    bytes32 public commitment;
    uint256 public numGates;
    uint256 public numBlocks;

    // Money states
    uint256 public sponsorDeposit;
    uint256 public buyerDeposit;
    uint256 public sbDeposit;
    uint256 public svDeposit;
    uint256 public sponsorTip;
    uint256 public sbTip;
    uint256 public svTip;

    // Next time the timeout is triggered (unless state changes)
    uint256 public nextTimeoutTime;

    modifier onlyExpected(address _sender, OptimisticState _state) {
        require(msg.sender == _sender, "Unexpected sender");
        require(
            currState == _state,
            "Cannot run this function in the current state"
        );
        _;
    }

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
        uint256 _numGates,
        uint256 _numBlocks
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
        numGates = _numGates;
        numBlocks = _numBlocks;
        nextState(OptimisticState.WaitPayment);
    }

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

    function sendKey(
        bytes calldata _key
    ) public onlyExpected(vendor, OptimisticState.WaitKey) {
        key = _key;
        nextState(OptimisticState.WaitSB);
    }

    function registerBuyerDisputeSponsor(
        address _sb
    ) public payable onlyExpected(buyer, OptimisticState.WaitSB) {
        buyerDisputeSponsor = _sb;

        nextState(OptimisticState.WaitSBFee);
    }

    function sendBuyerDisputeSponsorFee()
        public
        payable
        onlyExpected(buyerDisputeSponsor, OptimisticState.WaitSBFee)
    {
        require(
            msg.value >= DISPUTE_FEES + disputeTip,
            "Not enough money deposited to cover dispute fees + tip"
        );

        sbDeposit = msg.value;
        sbTip = msg.value - DISPUTE_FEES;
        nextState(OptimisticState.WaitSV);
    }

    function registerVendorDisputeSponsor(
        address _sv
    ) public payable onlyExpected(vendor, OptimisticState.WaitSV) {
        vendorDisputeSponsor = _sv;

        nextState(OptimisticState.WaitSVFee);
    }

    function sendVendorDisputeSponsorFee()
        public
        payable
        onlyExpected(vendorDisputeSponsor, OptimisticState.WaitSVFee)
    {
        require(
            msg.value >= DISPUTE_FEES + disputeTip,
            "Not enough money deposited to cover dispute fees + tip"
        );

        svDeposit = msg.value;
        svTip = msg.value - DISPUTE_FEES;

        nextState(OptimisticState.WaitDisputeStart);
    }

    function startDispute() public {
        require(
            currState == OptimisticState.WaitDisputeStart,
            "Contract is not waiting for a dispute to start"
        );
        require(
            msg.sender == buyerDisputeSponsor ||
                msg.sender == vendorDisputeSponsor,
            "Only a dispute sponsor can start the dispute"
        );

        disputeContract = DisputeDeployer.deployDispute(
            numBlocks,
            numGates,
            commitment
        );

        nextState(OptimisticState.InDispute);
    }

    function endDispute()
        public
        onlyExpected(disputeContract, OptimisticState.InDispute)
    {
        nextState(OptimisticState.End);
    }

    function completeTransaction() public {
        require(
            currState == OptimisticState.WaitSB ||
                currState == OptimisticState.WaitSBFee,
            "Not in a state where the transaction can be completed"
        );

        if (msg.sender != buyer) {
            // only the buyer can complete before timeout
            require(timeoutHasPassed(), "Timeout has not passed");
        }

        payable(vendor).transfer(agreedPrice);

        if (currState == OptimisticState.WaitSBFee) {
            payable(buyer).transfer(sbTip);
        }

        // consider that the remaining funds are for the sponsor
        payable(sponsor).transfer(address(this).balance);
        nextState(OptimisticState.End);
    }

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
        } else if (currState == OptimisticState.WaitSVFee) {
            payable(buyerDisputeSponsor).transfer(sbDeposit + sbTip);

            payable(buyer).transfer(agreedPrice);

            payable(vendor).transfer(svTip);

            payable(sponsor).transfer(address(this).balance);
            return nextState(OptimisticState.End);
        }

        revert("Not in a state in which the transaction can be cancelled");
    }

    function timeoutHasPassed() public view returns (bool) {
        return block.timestamp >= nextTimeoutTime;
    }
}

// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

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

/**
 * @title HardcodeOptimisticSOX
 * @notice A reduced version of OptimisticSOX without some of the components
 * @dev Similar to ReducedOptimisticSOX but uses hardcoded values for the
 *      parameters that were previously set through the constructor.
 */
contract HardcodeOptimisticSOX {
    /**
     * @dev The sponsor fees required for the transaction.
     */
    uint256 constant SPONSOR_FEES = 5 wei;
    /**
     * @dev The dispute fees required for the transaction.
     */
    uint256 constant DISPUTE_FEES = 10 wei;

    // Addresses
    /**
     * @dev The address of the buyer.
     */
    address public buyer = 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266;

    /**
     * @dev The address of the vendor.
     */
    address public vendor = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8;

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
    uint256 public agreedPrice = 100;

    /**
     * @dev The increment for the timeout.
     */
    uint256 public timeoutIncrement = 120;

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

    constructor() payable {
        require(msg.value >= SPONSOR_FEES, "Not enough money to cover fees");
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
            msg.value >= agreedPrice,
            "Agreed price is higher than deposit"
        );

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
     * @notice Function for the buyer deposit the fees for the dispute
     * @dev This function is called by the buyer to send the
     dispute sponsor fee. It reverts if the amount deposited is too low.
     */
    function buyerSendDisputeFee()
        public
        payable
        onlyExpected(buyer, OptimisticState.WaitSB)
    {
        require(
            msg.value >= DISPUTE_FEES,
            "Not enough money deposited to cover dispute fees"
        );

        nextState(OptimisticState.WaitSV);
    }

    /**
     * @notice Function for the vendor's dispute sponsor to deposit the fees and tip
     * @dev This function is called by the vendor to send the
     dispute sponsor fee. It reverts if the amount deposited is too low.
     */
    function vendorSendDisputeFee()
        public
        payable
        onlyExpected(vendor, OptimisticState.WaitSV)
    {
        require(
            msg.value >= DISPUTE_FEES,
            "Not enough money deposited to cover dispute fees"
        );

        nextState(OptimisticState.InDispute);
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
            return nextState(OptimisticState.End);
        } else if (
            currState == OptimisticState.WaitKey ||
            currState == OptimisticState.WaitSV
        ) {
            payable(buyer).transfer(agreedPrice);

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

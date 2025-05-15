// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

contract OptimisticSOX {
    // TODO what about the sponsorship part ?

    // TODO: SET THE NECESSARY VALUES AND CONSTANTS
    uint256 constant SPONSOR_FEES = 5 wei; // dummy value
    uint256 constant DISPUTE_FEES = 10 wei; // dummy value

    // Addresses
    address public buyer;
    address public vendor;
    address public sponsor;
    address public buyerDisputeSponsor;
    address public vendorDisputeSponsor;

    // Finite state machine
    enum State {
        WaitPayment,
        WaitKey,
        WaitSB,
        WaitSBFee,
        WaitSV,
        WaitSVFee,
        InDispute,
        // TODO add dispute resolution stuff
        End
    }

    State public currState;

    bytes32 key;
    uint256 agreedPrice;

    // Money states
    uint256 sponsorDeposit;
    uint256 buyerDeposit;
    uint256 sbDeposit;
    uint256 svDeposit;
    uint256 sponsorTip;
    uint256 sbTip;
    uint256 svTip;

    // TODO: MANAGE TIMEOUTS
    uint256 public timeout;

    uint256 someTime = 10 seconds;

    modifier onlyExpected(address _sender, State _state) {
        require(msg.sender == _sender, "Unexpected sender");
        require(
            currState == _state,
            "Cannot run this function in the current state"
        );
        _;
    }

    function nextState(State _s, uint256 _timeout) internal {
        currState = _s;
        timeout = block.timestamp + _timeout;
    }

    constructor(address _buyer, address _vendor, uint256 _agreedPrice) payable {
        require(msg.value >= SPONSOR_FEES, "Not enough money to cover fees");
        sponsorDeposit = msg.value; // TODO how and when to decrement this
        sponsor = msg.sender;
        buyer = _buyer;
        vendor = _vendor;
        agreedPrice = _agreedPrice;
        nextState(State.WaitPayment, someTime);
    }

    function sendPayment()
        public
        payable
        onlyExpected(buyer, State.WaitPayment)
    {
        require(
            msg.value >= agreedPrice,
            "Agreed price is higher than deposit"
        );

        buyerDeposit = msg.value;
        sponsorTip = buyerDeposit - agreedPrice;

        nextState(State.WaitKey, someTime);
    }

    function sendKey(bytes32 _key) public onlyExpected(vendor, State.WaitKey) {
        // assuming key is of size <= 256b
        key = _key;
        nextState(State.WaitSB, someTime);
    }

    function registerBuyerDisputeSponsor(
        address _sb
    ) public payable onlyExpected(buyer, State.WaitSB) {
        sbTip = msg.value;
        buyerDisputeSponsor = _sb;
        nextState(State.WaitSBFee, someTime);
    }

    function sendBuyerDisputeSponsorFee()
        public
        payable
        onlyExpected(buyerDisputeSponsor, State.WaitSBFee)
    {
        require(
            msg.value >= DISPUTE_FEES,
            "Not enough money deposited to cover dispute fees"
        );
        sbDeposit = msg.value;
        nextState(State.WaitSV, someTime);
    }

    function registerVendorDisputeSponsor(
        address _sv
    ) public payable onlyExpected(vendor, State.WaitSV) {
        svTip = msg.value;
        vendorDisputeSponsor = _sv;
        nextState(State.WaitSVFee, someTime);
    }

    function sendVendorDisputeSponsorFee()
        public
        payable
        onlyExpected(vendorDisputeSponsor, State.WaitSVFee)
    {
        require(
            msg.value >= DISPUTE_FEES,
            "Not enough money deposited to cover dispute fees"
        );
        svDeposit = msg.value;
        // TODO go to dispute resolution
    }

    function completeTransaction() public {
        require(
            currState == State.WaitSB || currState == State.WaitSBFee,
            "Not in a state where the transaction can be completed"
        );
        require(timeoutHasPassed(), "Timeout has not passed");
        payable(vendor).transfer(agreedPrice);

        if (currState == State.WaitSBFee) {
            payable(buyer).transfer(sbTip);
        }

        payable(sponsor).transfer(address(this).balance);
        nextState(State.End, 0);
    }

    function cancelTransaction() public {
        require(timeoutHasPassed(), "Timeout has not passed");
        if (currState == State.WaitPayment) {
            payable(sponsor).transfer(address(this).balance);
            nextState(State.End, 0);
        } else if (currState == State.WaitKey) {
            payable(buyer).transfer(agreedPrice);

            payable(sponsor).transfer(address(this).balance);
            nextState(State.End, 0);
        } else if (currState == State.WaitSV) {
            payable(buyerDisputeSponsor).transfer(sbDeposit + sbTip);

            payable(buyer).transfer(agreedPrice);

            payable(sponsor).transfer(address(this).balance);
            nextState(State.End, 0);
        } else if (currState == State.WaitSVFee) {
            payable(buyerDisputeSponsor).transfer(sbDeposit + sbTip);

            payable(buyer).transfer(agreedPrice);

            payable(vendor).transfer(svTip);

            payable(sponsor).transfer(address(this).balance);
            nextState(State.End, 0);
        }

        require(
            false,
            "Not in a state in which the transaction can be cancelled"
        );
    }

    function timeoutHasPassed() public view returns (bool) {
        return block.timestamp > timeout;
    }

    // getters
    function getState() public view returns (State) {
        return currState;
    }

    function getKey() public view returns (bytes32) {
        return key;
    }
}

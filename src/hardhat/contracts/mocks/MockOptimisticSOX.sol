// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

contract MockOptimisticSOX {
    address public buyer;
    address public vendor;
    address public buyerDisputeSponsor;
    address public vendorDisputeSponsor;
    uint256 public timeoutIncrement;
    uint256 public agreedPrice;
    uint8 public currState = 6; // default WaitDisputeStart

    constructor(
        address _buyer,
        address _vendor,
        address _buyerDisputeSponsor,
        address _vendorDisputeSponsor,
        uint256 _timeoutIncrement,
        uint256 _agreedPrice
    ) {
        buyer = _buyer;
        vendor = _vendor;
        buyerDisputeSponsor = _buyerDisputeSponsor;
        vendorDisputeSponsor = _vendorDisputeSponsor;
        timeoutIncrement = _timeoutIncrement;
        agreedPrice = _agreedPrice;
    }

    function endDispute() external {}
    function setState(uint8 s) external {
        currState = s;
    }
}

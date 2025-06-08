// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import {DisputeDeployer} from "../DisputeDeployer.sol";

event DisputeDeployed(address deployed);

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

    function deployDispute(
        uint256 _numBlocks,
        uint256 _numGates,
        bytes32 _commitment
    ) external payable returns (address) {
        address deployed = DisputeDeployer.deployDispute(
            _numBlocks,
            _numGates,
            _commitment
        );
        emit DisputeDeployed(deployed);
        return deployed;
    }

    function endDispute() external {}
    function setState(uint8 s) external {
        currState = s;
    }
}

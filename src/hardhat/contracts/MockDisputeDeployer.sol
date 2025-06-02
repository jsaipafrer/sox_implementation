// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IOptimisticSOX} from "./OptimisticSOX.sol";

contract MockDisputeDeployer {
    function deployDispute(
        uint256,
        uint256,
        bytes32
    ) public view returns (address) {
        return address(this);
    }

    function endDispute(address optimistic) public {
        IOptimisticSOX(optimistic).endDispute();
    }
}

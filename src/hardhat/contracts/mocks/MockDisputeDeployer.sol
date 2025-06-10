// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IOptimisticSOX} from "../OptimisticSOX.sol";

library MockDisputeDeployer {
    function deployDispute(
        uint32,
        uint32,
        bytes32
    ) public view returns (address) {
        return address(this);
    }

    function endDispute(address optimistic) public {
        IOptimisticSOX(optimistic).endDispute();
    }
}

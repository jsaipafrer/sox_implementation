// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import {DisputeSOX} from "./DisputeSOX.sol";

library DisputeDeployer {
    function deployDispute(
        uint256 _numBlocks,
        uint256 _numGates,
        bytes32 _commitment
    ) public returns (address) {
        return
            address(
                new DisputeSOX{value: address(this).balance}(
                    address(this),
                    _numBlocks,
                    _numGates,
                    _commitment
                )
            );
    }
}

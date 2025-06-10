// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import {DisputeSOX} from "./DisputeSOX.sol";

/**
 * @title DisputeDeployer
 * @notice A library for deploying dispute contracts.
 * @dev This library provides a function to deploy a new dispute contract.
 */
library DisputeDeployer {
    /**
     * @notice Deploys a new dispute contract.
     * @dev This function creates a new instance of the DisputeSOX contract.
     * @param _numBlocks The number of blocks in the ciphertext.
     * @param _numGates The number of gates in the circuit.
     * @param _commitment The commitment value.
     * @return The address of the newly deployed dispute contract.
     */
    function deployDispute(
        uint32 _numBlocks,
        uint32 _numGates,
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

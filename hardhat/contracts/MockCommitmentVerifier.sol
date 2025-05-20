// SPDX-License-Identifier: GPL 3.0
pragma solidity ^0.8.0;

library MockCommitmentVerifier {
    function commit(
        bytes calldata,
        bytes calldata
    ) external pure returns (bytes32) {
        return bytes32(uint(0));
    }

    function open(
        bytes32,
        bytes[2] calldata _openingValue
    ) external pure returns (bytes[2] calldata) {
        return _openingValue;
    }
}

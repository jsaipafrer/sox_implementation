// SPDX-License-Identifier: GPL 3.0
pragma solidity ^0.8.0;

library CommitmentVerifier {
    function commitInternal(
        bytes calldata _data,
        bytes calldata _key
    ) internal pure returns (bytes32) {
        return keccak256(bytes.concat(_data, _key));
    }

    function commit(
        bytes calldata _data,
        bytes calldata _key
    ) external pure returns (bytes32) {
        return commitInternal(_data, _key);
    }

    function open(
        bytes32 _commitment,
        bytes[2] calldata _openingValue
    ) external pure returns (bytes[2] calldata) {
        require(
            commitInternal(_openingValue[0], _openingValue[1]) == _commitment,
            "Commitment and opening value do not match"
        );

        return _openingValue;
    }
}

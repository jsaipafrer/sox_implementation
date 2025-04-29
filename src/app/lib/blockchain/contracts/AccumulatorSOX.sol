// SPDX-License-Identifier: GPL 3.0
pragma solidity ^0.8.0;

import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

// TODO implement as a contract
interface AccumulatorVerifier {
    function verify(
        bytes32 root,
        bytes32[] calldata indices,
        bytes32[] calldata values,
        bytes32 proof
    ) external returns (bool);

    function verifyExt(
        uint256 i,
        bytes32 prevRoot,
        bytes32 currRoot,
        bytes32 addedVal,
        bytes32 proof
    ) external returns (bool);
}

contract AccumulatorVerifierSOX {
    struct IndexedValue {
        uint256 index;
        bytes32 value;
    }

    struct Proof {
        bytes32[] proofData;
        bool[] proofFlags;
    }

    function verify(
        bytes32 root,
        bytes32[] calldata indices,
        bytes32[] calldata values,
        Proof calldata proof
    ) public pure returns (bool) {
        // TODO how to handle indexedValues exactly ?? We need them to fit in bytes32 values somehow
        // probably remove a few bytes for the values themselves ? not ideal, as sha256 uses the entire 256bits/32bytes
        // or have them span 2 bytes32 ?
        IndexedValue[] memory indexedValues = new IndexedValue[](values.length);

        for (uint256 i = 0; i < values.length; i++) {
            indexedValues[i] = IndexedValue(i, values[i]);
        }

        return
            MerkleProof.multiProofVerify(
                proof.proofData,
                proof.proofFlags,
                root,
                values
            );
    }

    function verifyExt(
        uint256 i,
        bytes32 prevRoot,
        bytes32 currRoot,
        bytes32 addedVal,
        Proof calldata proof
    ) public view returns (bool) {
        bytes32[] memory iArr = new bytes32[](1);
        iArr[0] = bytes32(i);

        bytes32[] memory addedValArr = new bytes32[](1);
        addedValArr[0] = addedVal;

        if (!this.verify(currRoot, iArr, addedValArr, proof)) {
            return false;
        }

        bytes32 h = bytes32(uint(5)); // TODO compute h from the proof
        return h == prevRoot;
    }
}

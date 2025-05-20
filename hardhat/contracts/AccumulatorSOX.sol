// SPDX-License-Identifier: GPL 3.0
pragma solidity ^0.8.0;

library AccumulatorVerifier {
    function getNeighbor(uint256 index) internal pure returns (uint256) {
        if (index % 2 == 0) return index + 1;
        else return index - 1;
    }

    function hash(bytes32 left, bytes32 right) internal pure returns (bytes32) {
        return keccak256(bytes.concat(left, right));
    }

    function verify(
        bytes32 root,
        uint256[] memory indices,
        bytes32[] memory valuesKeccak,
        bytes32[][] memory proof
    ) public pure returns (bool) {
        // From https://arxiv.org/pdf/2002.07648, slighlty modified
        // by taking the proof in reverse order to use pop() instead of
        // dealing with the removal of the first element of the proof
        // also uses a 2d proof in order to deal with "lonely" elements
        // Assumes indices is sorted in increasing order
        if (indices.length != valuesKeccak.length) return false;

        for (uint256 l = 0; l < proof.length; l++) {
            uint256[2][] memory b = new uint256[2][](indices.length);
            uint256 bPrunedLength = 0;
            for (uint256 i = 0; i < indices.length; i++) {
                uint256 currIdx = indices[i];
                uint256 neighborIdx = getNeighbor(currIdx);

                if (neighborIdx < currIdx) b[i] = [neighborIdx, currIdx];
                else b[i] = [currIdx, neighborIdx];

                if (i < indices.length - 1 && neighborIdx == indices[i + 1]) {
                    bPrunedLength++;
                }
            }

            uint256[] memory nextIndices = new uint256[](bPrunedLength);
            bytes32[] memory nextValues = new bytes32[](bPrunedLength);
            uint256 nextElement = proof[l].length - 1;
            uint256 indicesI = 0;
            uint256 valuesI = 0;
            for (uint256 i = 0; i < b.length; i++) {
                if (i + 1 < b.length && b[i][0] == b[i + 1][0]) {
                    // duplicate found
                    // this means that b[i][0] and b[i][1] are elements of
                    // nextIndices. Furthermore, b[i] is computed based on
                    // nextIndices[i] and since we skip the duplicates,
                    // it can only be that b[i][0] == nextIndices[i]
                    // => the corresponding values are valuesKeccak[i]
                    // and valuesKeccak[i+1]
                    nextValues[valuesI] = hash(
                        valuesKeccak[i],
                        valuesKeccak[i + 1]
                    );
                    valuesI++;

                    i++; // skip next element (duplicate)
                } else if (nextElement >= 0) {
                    // index needed to hash elements in the correct order
                    uint256 correspondingIdx = indices[i];
                    uint256 neighborIdx = getNeighbor(correspondingIdx);

                    if (neighborIdx < correspondingIdx) {
                        nextValues[valuesI] = hash(
                            proof[l][nextElement],
                            valuesKeccak[i]
                        );
                        valuesI++;
                        nextElement--;
                    } else {
                        nextValues[valuesI] = hash(
                            valuesKeccak[i],
                            proof[l][nextElement]
                        );
                        valuesI++;
                        nextElement--;
                    }
                } else {
                    // proof layer is empty, move the element that must be combined to the next layer
                    nextValues[valuesI] = valuesKeccak[i];
                    valuesI++;
                }

                nextIndices[indicesI] = (indices[i] >> 1);
                indicesI++;
            }

            valuesKeccak = nextValues;
            indices = nextIndices;
        }

        require(
            valuesKeccak.length == 1,
            "Something went wrong during the verification"
        );
        return valuesKeccak[0] == root;
    }

    function verifyPrevious(
        bytes32 prevRoot,
        bytes32[][] calldata proof
    ) internal pure returns (bool) {
        bool firstFound = false;
        bytes32 computedRoot;
        for (uint256 i = 0; i < proof.length; i++) {
            uint256 nextElement = proof[i].length;
            while (nextElement >= 0) {
                if (!firstFound) {
                    computedRoot = proof[i][nextElement];
                    nextElement--;
                    firstFound = true;
                } else {
                    computedRoot = keccak256(
                        bytes.concat(proof[i][nextElement], computedRoot)
                    );
                    nextElement--;
                }
            }
        }
        return computedRoot == prevRoot;
    }

    function verifyExt(
        uint256 i,
        bytes32 prevRoot,
        bytes32 currRoot,
        bytes32 addedValKeccak,
        bytes32[][] calldata proof
    ) public pure returns (bool) {
        uint256[] memory iArr = new uint256[](1);
        iArr[0] = i;

        bytes32[] memory addedValKeccakArr = new bytes32[](1);
        addedValKeccakArr[0] = addedValKeccak;

        return
            verify(currRoot, iArr, addedValKeccakArr, proof) &&
            verifyPrevious(prevRoot, proof);
    }
}

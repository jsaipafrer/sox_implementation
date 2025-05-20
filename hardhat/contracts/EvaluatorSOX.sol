// SPDX-License-Identifier: GPL 3.0
pragma solidity ^0.8.0;

struct Instruction {
    function(bytes[] memory) internal pure returns (bytes memory) f;
}

library CircuitEvaluator {
    function getInstructionSet()
        internal
        pure
        returns (Instruction[7][1] memory)
    {
        return [
            /* version 0 */ [
                Instruction(sha256CompressionInstruction),
                Instruction(dummy),
                Instruction(dummy),
                Instruction(binAdd),
                Instruction(binMult),
                Instruction(binEquals),
                Instruction(concat)
            ]
        ];
    }

    function evaluateGate(
        uint[] calldata _gate, // == [op, s_1, ..., s_a]
        bytes[] memory _data, // == [v_1, ..., v_a]
        uint _version
    ) public pure returns (bytes memory) {
        Instruction[7][1] memory VERSION_INSTRUCTIONS = getInstructionSet();
        require(
            _version < VERSION_INSTRUCTIONS.length,
            "Invalid version number"
        );

        require(
            _data.length == _gate.length - 1,
            "Values doesn't have the required length"
        );

        return VERSION_INSTRUCTIONS[_version][_gate[1]].f(_data);
    }

    function ror(uint32 w, uint8 n) internal pure returns (uint32) {
        return ((w >> n) | (w << (32 - n)));
    }

    function internalCompression(
        uint32[8] memory _previousDigest,
        bytes memory _inputBlock
    ) internal pure returns (bytes memory) {
        // prettier-ignore
        uint32[64] memory K =  [
            0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5,
            0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
            0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
            0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
            0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
            0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
            0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
            0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
            0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
            0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
            0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3,
            0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
            0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5,
            0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
            0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
            0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
        ];

        uint32[] memory words = new uint32[](64);
        uint wordsI = 0;
        for (uint i = 0; i < 32; i += 4) {
            words[wordsI] = uint32(
                bytes4(
                    bytes.concat(
                        _inputBlock[0][i],
                        _inputBlock[0][i + 1],
                        _inputBlock[0][i + 2],
                        _inputBlock[0][i + 3]
                    )
                )
            );
            ++wordsI;
        }

        for (uint i = 0; i < 32; i += 4) {
            words[wordsI] = uint32(
                bytes4(
                    bytes.concat(
                        _inputBlock[1][i],
                        _inputBlock[1][i + 1],
                        _inputBlock[1][i + 2],
                        _inputBlock[1][i + 3]
                    )
                )
            );
            ++wordsI;
        }

        for (uint i = 16; i < 64; ++i) {
            uint32 s0 = ror(words[i - 15], 7) ^
                ror(words[i - 15], 18) ^
                (words[i - 15] >> 3);
            uint32 s1 = ror(words[i - 2], 17) ^
                ror(words[i - 2], 19) ^
                (words[i - 2] >> 10);
            words[i] = words[i - 16] + s0 + words[i - 7] + s1;
        }

        uint32 a = _previousDigest[0];
        uint32 b = _previousDigest[1];
        uint32 c = _previousDigest[2];
        uint32 d = _previousDigest[3];
        uint32 e = _previousDigest[4];
        uint32 f = _previousDigest[5];
        uint32 g = _previousDigest[6];
        uint32 h = _previousDigest[7];

        for (uint i = 0; i < 64; ++i) {
            uint32 s1 = ror(e, 6) ^ ror(e, 11) ^ ror(e, 25);
            uint32 ch = (e & f) ^ (~e & g);
            uint32 tmp1 = h + s1 + ch + K[i] + words[i];
            uint32 s0 = ror(a, 2) ^ ror(a, 13) ^ ror(a, 22);
            uint32 maj = (a & b) ^ (a & c) ^ (b & c);
            uint32 tmp2 = s0 + maj;

            h = g;
            g = f;
            f = e;
            e = d + tmp1;
            d = c;
            c = b;
            b = a;
            a = tmp1 + tmp2;
        }

        return
            bytes.concat(
                bytes4(_previousDigest[0] + a),
                bytes4(_previousDigest[1] + b),
                bytes4(_previousDigest[2] + c),
                bytes4(_previousDigest[3] + d),
                bytes4(_previousDigest[4] + e),
                bytes4(_previousDigest[5] + f),
                bytes4(_previousDigest[6] + g),
                bytes4(_previousDigest[7] + h)
            );
    }

    /*
    Data format:
    _data = [previous digest (optional; 32 bytes), block (64 bytes)]
    */
    function sha256CompressionInstruction(
        bytes[] memory _data
    ) internal pure returns (bytes memory) {
        require(_data.length > 0, "Data is empty");
        uint32[8] memory previousDigest = [
            // initial hash values
            0x6a09e667,
            0xbb67ae85,
            0x3c6ef372,
            0xa54ff53a,
            0x510e527f,
            0x9b05688c,
            0x1f83d9ab,
            0x5be0cd19
        ];
        bytes memory inputBlock;

        if (_data.length > 1) {
            require(
                _data[0].length == 32,
                "Previous digest must be 32 bytes long"
            );

            require(
                _data[1].length == 64,
                "Block to hash must be 64 bytes long"
            );
            // a previous digest has been passed
            inputBlock = _data[1];

            previousDigest[0] = uint32(
                bytes4(
                    bytes.concat(
                        _data[0][0],
                        _data[0][1],
                        _data[0][2],
                        _data[0][3]
                    )
                )
            );
            previousDigest[1] = uint32(
                bytes4(
                    bytes.concat(
                        _data[0][4],
                        _data[0][5],
                        _data[0][6],
                        _data[0][7]
                    )
                )
            );
            previousDigest[2] = uint32(
                bytes4(
                    bytes.concat(
                        _data[0][8],
                        _data[0][9],
                        _data[0][10],
                        _data[0][11]
                    )
                )
            );
            previousDigest[3] = uint32(
                bytes4(
                    bytes.concat(
                        _data[0][12],
                        _data[0][13],
                        _data[0][14],
                        _data[0][15]
                    )
                )
            );
            previousDigest[4] = uint32(
                bytes4(
                    bytes.concat(
                        _data[0][16],
                        _data[0][17],
                        _data[0][18],
                        _data[0][19]
                    )
                )
            );
            previousDigest[5] = uint32(
                bytes4(
                    bytes.concat(
                        _data[0][20],
                        _data[0][21],
                        _data[0][22],
                        _data[0][23]
                    )
                )
            );
            previousDigest[6] = uint32(
                bytes4(
                    bytes.concat(
                        _data[0][24],
                        _data[0][25],
                        _data[0][26],
                        _data[0][27]
                    )
                )
            );
            previousDigest[7] = uint32(
                bytes4(
                    bytes.concat(
                        _data[0][28],
                        _data[0][29],
                        _data[0][30],
                        _data[0][31]
                    )
                )
            );
        } else {
            require(
                _data[0].length == 64,
                "Block to hash must be 64 bytes long"
            );

            inputBlock = _data[0];
        }

        return internalCompression(previousDigest, inputBlock);
    }

    // function keyExpansion(bytes16 _key) internal pure returns (bytes16) {
    //     // prettier-ignore
    //     uint8[32] memory roundConstants = [
    //         0x00, 0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40,
    //         0x80, 0x1B, 0x36, 0x6C, 0xD8, 0xAB, 0x4D, 0x9A,
    //         0x2F, 0x5E, 0xBC, 0x63, 0xC6, 0x97, 0x35, 0x6A,
    //         0xD4, 0xB3, 0x7D, 0xFA, 0xEF, 0xC5, 0x91, 0x39
    //     ];

    //     return bytes16(uint128(1));
    // }

    // function encryptBlock(
    //     bytes16 _key,
    //     bytes16 _block
    // ) internal pure returns (bytes16) {
    //     return bytes16(uint128(1));
    // }

    // function encryptBlockInstruction(
    //     bytes32 _key,
    //     bytes32[] calldata _data
    // ) internal pure returns (bytes32) {
    //     // TODO
    //     return bytes32(uint(1));
    // }

    // function decryptBlockInstruction(
    //     bytes32 _key,
    //     bytes32[] calldata _data
    // ) internal pure returns (bytes32) {
    //     // TODO
    //     return bytes32(uint(1));
    // }

    function dummy(bytes[] memory) internal pure returns (bytes memory) {
        bytes memory res = new bytes(32);
        return res;
    }

    function binEquals(
        bytes[] memory _data
    ) internal pure returns (bytes memory) {
        require(_data.length == 2, "Equality requires exactly 2 operators");

        bytes memory res = new bytes(32);
        if (_data[0].length != _data[1].length) return res;

        for (uint i = 0; i < _data[0].length; ++i)
            if (_data[0][i] != _data[1][i]) return res;

        assembly {
            mstore(add(res, 32), 1)
        }

        return res;
    }

    function binAdd(bytes[] memory _data) internal pure returns (bytes memory) {
        require(_data.length == 2, "Addition requires exactly 2 operators");
        require(
            _data[0].length == 32 && _data[1].length == 32,
            "Addition operators must be exactly 32 bytes long"
        );

        unchecked {
            return
                bytes.concat(
                    bytes32(uint(bytes32(_data[0])) + uint(bytes32(_data[1])))
                );
        }
    }

    function binMult(
        bytes[] memory _data
    ) internal pure returns (bytes memory) {
        require(
            _data.length == 2,
            "Multiplication requires exactly 2 operators"
        );
        require(
            _data[0].length == 32 && _data[1].length == 32,
            "Multiplication operators must be exactly 32 bytes long"
        );

        unchecked {
            return
                bytes.concat(
                    bytes32(uint(bytes32(_data[0])) * uint(bytes32(_data[1])))
                );
        }
    }

    function concat(bytes[] memory _data) internal pure returns (bytes memory) {
        require(
            _data.length > 0,
            "Concatenation requires at least one element"
        );
        if (_data.length == 1) return _data[0];

        bytes memory res = bytes.concat(_data[0], _data[1]);

        for (uint i = 2; i < _data.length; ++i) {
            res = bytes.concat(res, _data[i]);
        }

        return res;
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

library AES128CtrEvaluator {
    uint8 constant Nb = 4;
    uint8 constant Nk = 4;
    uint8 constant Nr = 10;

    function getSBox() internal pure returns (uint8[256] memory) {
        // prettier-ignore
        return [
             99,124,119,123,242,107,111,197, 48,  1,103, 43,254,215,171,118, 
            202,130,201,125,250, 89, 71,240,173,212,162,175,156,164,114,192, 
            183,253,147, 38, 54, 63,247,204, 52,165,229,241,113,216, 49, 21, 
              4,199, 35,195, 24,150,  5,154,  7, 18,128,226,235, 39,178,117, 
              9,131, 44, 26, 27,110, 90,160, 82, 59,214,179, 41,227, 47,132, 
             83,209,  0,237, 32,252,177, 91,106,203,190, 57, 74, 76, 88,207, 
            208,239,170,251, 67, 77, 51,133, 69,249,  2,127, 80, 60,159,168, 
             81,163, 64,143,146,157, 56,245,188,182,218, 33, 16,255,243,210, 
            205, 12, 19,236, 95,151, 68, 23,196,167,126, 61,100, 93, 25,115, 
             96,129, 79,220, 34, 42,144,136, 70,238,184, 20,222, 94, 11,219, 
            224, 50, 58, 10, 73,  6, 36, 92,194,211,172, 98,145,149,228,121, 
            231,200, 55,109,141,213, 78,169,108, 86,244,234,101,122,174,  8, 
            186,120, 37, 46, 28,166,180,198,232,221,116, 31, 75,189,139,138, 
            112, 62,181,102, 72,  3,246, 14, 97, 53, 87,185,134,193, 29,158, 
            225,248,152, 17,105,217,142,148,155, 30,135,233,206, 85, 40,223, 
            140,161,137, 13,191,230, 66,104, 65,153, 45, 15,176, 84,187, 22
        ];
    }

    function subWord(uint32 word) internal pure returns (uint32) {
        uint8[256] memory sbox = getSBox();

        return
            (uint32(sbox[uint8(word >> 24)]) << 24) |
            (uint32(sbox[uint8(word >> 16)]) << 16) |
            (uint32(sbox[uint8(word >> 8)]) << 8) |
            (uint32(sbox[uint8(word)]));
    }

    function rotWord(uint32 word) internal pure returns (uint32) {
        return (word << 8) | (word >> 24);
    }

    function keyExpansion(
        bytes16 key
    ) internal pure returns (uint32[44] memory w) {
        for (uint8 i = 0; i < Nk; i++) {
            w[i] = ((uint32(uint8(key[i * 4])) << 24) |
                (uint32(uint8(key[i * 4 + 1])) << 16) |
                (uint32(uint8(key[i * 4 + 2])) << 8) |
                uint32(uint8(key[i * 4 + 3])));
        }

        uint32 temp;
        for (uint8 i = Nk; i < Nb * (Nr + 1); i++) {
            temp = w[i - 1];
            if (i % Nk == 0) {
                temp = subWord(rotWord(temp)) ^ rcon(i / Nk);
            }
            w[i] = w[i - Nk] ^ temp;
        }
    }

    function rcon(uint8 i) internal pure returns (uint32) {
        uint8 c = 1;
        if (i == 0) return 0;
        while (--i != 0) {
            c = xtime(c);
        }
        return uint32(c) << 24;
    }

    function xtime(uint8 x) internal pure returns (uint8) {
        return ((x << 1) ^ ((x >> 7) * 0x1b));
    }

    function addRoundKey(
        uint8[16] memory state,
        uint32[4] memory w
    ) internal pure {
        for (uint8 i = 0; i < 4; i++) {
            state[i * 4 + 0] ^= uint8(w[i] >> 24);
            state[i * 4 + 1] ^= uint8(w[i] >> 16);
            state[i * 4 + 2] ^= uint8(w[i] >> 8);
            state[i * 4 + 3] ^= uint8(w[i]);
        }
    }

    function subBytes(uint8[16] memory state) internal pure {
        uint8[256] memory sbox = getSBox();
        for (uint8 i = 0; i < 16; i++) {
            state[i] = sbox[state[i]];
        }
    }

    function shiftRows(uint8[16] memory state) internal pure {
        uint8 temp;

        // Row 1
        temp = state[1];
        state[1] = state[5];
        state[5] = state[9];
        state[9] = state[13];
        state[13] = temp;

        // Row 2
        temp = state[2];
        state[2] = state[10];
        state[10] = temp;
        temp = state[6];
        state[6] = state[14];
        state[14] = temp;

        // Row 3
        temp = state[3];
        state[3] = state[15];
        state[15] = state[11];
        state[11] = state[7];
        state[7] = temp;
    }

    function mixColumns(uint8[16] memory state) internal pure {
        for (uint8 i = 0; i < 4; i++) {
            uint8 a0 = state[i * 4];
            uint8 a1 = state[i * 4 + 1];
            uint8 a2 = state[i * 4 + 2];
            uint8 a3 = state[i * 4 + 3];

            state[i * 4 + 0] = xtime(a0) ^ xtime(a1) ^ a1 ^ a2 ^ a3;
            state[i * 4 + 1] = a0 ^ xtime(a1) ^ xtime(a2) ^ a2 ^ a3;
            state[i * 4 + 2] = a0 ^ a1 ^ xtime(a2) ^ xtime(a3) ^ a3;
            state[i * 4 + 3] = xtime(a0) ^ a0 ^ a1 ^ a2 ^ xtime(a3);
        }
    }

    function encryptBlockInternal(
        bytes16 plaintext,
        bytes16 key
    ) internal pure returns (bytes16) {
        uint8[16] memory state;
        for (uint8 i = 0; i < 16; i++) {
            state[i] = uint8(plaintext[i]);
        }

        uint32[44] memory roundKeys = keyExpansion(key);

        addRoundKey(state, sliceRoundKey(roundKeys, 0));

        for (uint8 round = 1; round < Nr; round++) {
            subBytes(state);
            shiftRows(state);
            mixColumns(state);
            addRoundKey(state, sliceRoundKey(roundKeys, round * 4));
        }

        subBytes(state);
        shiftRows(state);
        addRoundKey(state, sliceRoundKey(roundKeys, Nr * 4));

        bytes16 result;
        for (uint8 i = 0; i < 16; i++) {
            result |= bytes16(bytes1(state[i])) >> (i * 8);
        }
        return result;
    }

    function sliceRoundKey(
        uint32[44] memory w,
        uint8 offset
    ) internal pure returns (uint32[4] memory rk) {
        for (uint8 i = 0; i < 4; i++) {
            rk[i] = w[offset + i];
        }
    }

    function incrementCounter(bytes16 ctr) internal pure returns (bytes16) {
        uint128 num = uint128(bytes16(ctr));
        return bytes16(bytes16(uint128(num + 1)));
    }

    function encryptBlock(
        bytes[] memory _data
    ) public pure returns (bytes memory) {
        require(_data.length == 3, "Invalid _data array length");
        require(_data[0].length == 16, "Key must be 16 bytes long");
        require(
            _data[1].length <= 64,
            "Plaintext must be at most 64 bytes long"
        );
        require(_data[2].length == 16, "Counter must be 16 bytes long");

        if (_data[1].length == 0) {
            return _data[1];
        }

        bytes16 key = bytes16(_data[0]);
        bytes memory plaintext = _data[1];
        bytes16 counter = bytes16(_data[2]);

        uint256 blocks = (plaintext.length + 15) / 16;
        bytes memory ciphertext = new bytes(plaintext.length);

        for (uint256 i = 0; i < blocks; i++) {
            bytes16 keystream = encryptBlockInternal(counter, key);

            for (uint256 j = 0; j < 16 && i * 16 + j < plaintext.length; j++) {
                ciphertext[i * 16 + j] = plaintext[i * 16 + j] ^ keystream[j];
            }

            counter = incrementCounter(counter);
        }

        return ciphertext;
    }

    function decryptBlock(
        bytes[] memory _data
    ) public pure returns (bytes memory) {
        return encryptBlock(_data);
    }
}

import { ethers } from "hardhat";
import { expect } from "chai";

describe("AES128 Library", function () {
    let testAes128: any;

    before(async () => {
        const TestAES128 = await ethers.getContractFactory("TestAES128Ctr");
        testAes128 = await TestAES128.deploy();
        await testAes128.waitForDeployment();
    });

    it("encrypts the NIST test vector correctly", async () => {
        // NIST test vector: https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.197.pdf Appendix C
        const plaintext = "0x00112233445566778899aabbccddeeff";
        const key = "0x000102030405060708090a0b0c0d0e0f";
        const expectedCiphertext = "0x69c4e0d86a7b0430d8cdb78070b4c55a";

        const result = await testAes128.encrypt(plaintext, key);

        expect(result).to.equal(expectedCiphertext);
    });

    it("returns different ciphertext for different keys", async () => {
        const plaintext = "0x00112233445566778899aabbccddeeff";
        const key1 = "0x000102030405060708090a0b0c0d0e0f";
        const key2 = "0x0f0e0d0c0b0a09080706050403020100";

        const ct1 = await testAes128.encrypt(plaintext, key1);
        const ct2 = await testAes128.encrypt(plaintext, key2);

        expect(ct1).to.not.equal(ct2);
    });

    it("returns different ciphertexts for different plaintexts", async () => {
        const key = "0x000102030405060708090a0b0c0d0e0f";
        const pt1 = "0x00112233445566778899aabbccddeeff";
        const pt2 = "0xffeeddccbbaa99887766554433221100";

        const ct1 = await testAes128.encrypt(pt1, key);
        const ct2 = await testAes128.encrypt(pt2, key);

        expect(ct1).to.not.equal(ct2);
    });
});

import { expect } from "chai";
import hre from "hardhat";
import "@nomicfoundation/hardhat-chai-matchers";
import { CommitmentVerifier } from "../typechain-types";
import { commit, openCommitment } from "../../src/app/lib/commitment";

const { ethers } = hre;

function randInt(a: number, b: number): number {
    return a + Math.floor(Math.random() * (b - a));
}

describe("Commitments", function () {
    let commitmentVerifier: CommitmentVerifier;

    async function deployContractCorrect() {
        const CommitmentVerifier = await ethers.getContractFactory(
            "CommitmentVerifier"
        );
        commitmentVerifier = await CommitmentVerifier.deploy();
        await commitmentVerifier.waitForDeployment();
    }

    before(async function () {
        await deployContractCorrect();
    });

    it("Should create commitments that match the client's", async () => {
        for (let i = 0; i < 100; ++i) {
            const data = ethers.randomBytes(randInt(0, 1023));
            const key = ethers.randomBytes(randInt(0, 1023));

            const clientCommitment = commit(data, key);
            const contractCommitment = await commitmentVerifier.commit(
                data,
                key
            );

            expect(contractCommitment).to.be.equal(
                ethers.hexlify(clientCommitment)
            );
        }
    });

    it("Should verify its own commitments", async () => {
        for (let i = 0; i < 100; ++i) {
            const data = ethers.randomBytes(randInt(0, 1023));
            const key = ethers.randomBytes(randInt(0, 1023));

            const commitment = await commitmentVerifier.commit(data, key);

            await expect(
                commitmentVerifier.open(ethers.getBytes(commitment), [
                    data,
                    key,
                ])
            ).to.not.be.reverted;
        }
    });

    it("Should return the same opening value when the commitment is verified", async () => {
        for (let i = 0; i < 100; ++i) {
            const data = ethers.randomBytes(randInt(0, 1023));
            const key = ethers.randomBytes(randInt(0, 1023));

            const commitment = await commitmentVerifier.commit(data, key);
            const openingValue = await commitmentVerifier.open(
                ethers.getBytes(commitment),
                [data, key]
            );

            expect(openingValue[0]).to.be.equal(ethers.hexlify(data));
            expect(openingValue[1]).to.be.equal(ethers.hexlify(key));
        }
    });

    it("Should verify the client's commitments", async () => {
        for (let i = 0; i < 100; ++i) {
            const data = ethers.randomBytes(randInt(0, 1023));
            const key = ethers.randomBytes(randInt(0, 1023));

            const clientCommitment = commit(data, key);

            await expect(
                commitmentVerifier.open(ethers.getBytes(clientCommitment), [
                    data,
                    key,
                ])
            ).not.to.be.reverted;
        }
    });

    it("Should produce commitments that the client can verify", async () => {
        for (let i = 0; i < 100; ++i) {
            const data = ethers.randomBytes(randInt(0, 1023));
            const key = ethers.randomBytes(randInt(0, 1023));

            const commitment = await commitmentVerifier.commit(data, key);
            const openFct = () => {
                openCommitment(ethers.getBytes(commitment), [data, key]);
            };

            expect(openFct).to.not.throw();
        }
    });

    it("Should revert when a bad commitment is supplied to its verify function", async () => {
        for (let i = 0; i < 100; ++i) {
            const data = ethers.randomBytes(randInt(0, 1023));
            const key = ethers.randomBytes(randInt(0, 1023));

            expect(commitmentVerifier.open(data, [data, key])).to.be.reverted;
        }
    });
});

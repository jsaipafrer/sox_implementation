import { time } from "@nomicfoundation/hardhat-network-helpers";
import hre from "hardhat";
import "@nomicfoundation/hardhat-chai-matchers";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { hex_to_bytes } from "../../../app/lib/crypto_lib/crypto_lib";
import { BigNumberish } from "ethers";

const { ethers } = hre;

const NB_RUNS = 100;

/*
·················································································································
|  Solidity and Network Configuration                                                                           │
····························|·················|················|················|································
|  Solidity: 0.8.28         ·  Optim: true    ·  Runs: 1000    ·  viaIR: true   ·     Block: 30,000,000 gas     │
····························|·················|················|················|································
|  Network: ETHEREUM        ·  L1: 10 gwei                     ·                ·        2607.12 usd/eth        │
····························|·················|················|················|················|···············
|  Contracts / Methods      ·  Min            ·  Max           ·  Avg           ·  # calls       ·  usd (avg)   │
····························|·················|················|················|················|···············
|  OptimisticSOX            ·                                                                                   │
····························|·················|················|················|················|···············
|      completeTransaction  ·              -  ·             -  ·        58,963  ·           100  ·        1.54  │
····························|·················|················|················|················|···············
|      sendKey              ·              -  ·             -  ·        59,013  ·           100  ·        1.54  │
····························|·················|················|················|················|···············
|      sendPayment          ·              -  ·             -  ·       101,564  ·           100  ·        2.65  │
····························|·················|················|················|················|···············
|  Deployments                                ·                                 ·  % of limit    ·              │
····························|·················|················|················|················|···············
|  AccumulatorVerifier      ·              -  ·             -  ·       540,226  ·         1.8 %  ·       14.08  │
····························|·················|················|················|················|···············
|  CircuitEvaluator         ·              -  ·             -  ·     1,489,876  ·           5 %  ·       38.84  │
····························|·················|················|················|················|···············
|  CommitmentOpener         ·              -  ·             -  ·       176,168  ·         0.6 %  ·        4.59  │
····························|·················|················|················|················|···············
|  DisputeDeployer          ·      2,256,470  ·     2,256,650  ·     2,256,639  ·         7.5 %  ·       58.83  │
····························|·················|················|················|················|···············
|  OptimisticSOX            ·      1,463,675  ·     1,463,687  ·     1,463,686  ·         4.9 %  ·       38.16  │
····························|·················|················|················|················|···············
|  Key                                                                                                          │
·················································································································
|  ◯  Execution gas for this method does not include intrinsic gas overhead                                     │
·················································································································
|  △  Cost was non-zero but below the precision setting for the currency display (see options)                  │
·················································································································
|  Toolchain:  hardhat                                                                                          │
·················································································································
*/

let buyer: HardhatEthersSigner;
let vendor: HardhatEthersSigner;
let sponsor: HardhatEthersSigner;

before(async function () {
    [buyer, vendor, sponsor] = await ethers.getSigners();
});

describe("ReducedOptimisticSOX", function () {
    it("End-to-end optimistic, no dispute", async function () {
        for (let i = 0; i < NB_RUNS; ++i) {
            const fac = await ethers.getContractFactory("ReducedOptimisticSOX");
            const rSOX = await fac
                .connect(buyer)
                .deploy(
                    buyer,
                    vendor,
                    100n,
                    100n,
                    new Uint8Array([
                        0xab, 0xab, 0xab, 0xab, 0xab, 0xab, 0xab, 0xab, 0xab,
                        0xab, 0xab, 0xab, 0xab, 0xab, 0xab, 0xab, 0xab, 0xab,
                        0xab, 0xab, 0xab, 0xab, 0xab, 0xab, 0xab, 0xab, 0xab,
                        0xab, 0xab, 0xab, 0xab, 0xab,
                    ]),
                    30n,
                    60n,
                    { value: 50n }
                );
            await rSOX.waitForDeployment();

            // buyer sends payment
            await rSOX.connect(buyer).sendPayment({ value: 1000n });

            // vendor sends key
            await rSOX.connect(vendor).sendKey(ethers.toUtf8Bytes("key"));

            // "wait" for timeout
            await time.increase(1000n);

            // vendor asks to complete contract
            await rSOX.connect(vendor).completeTransaction();
        }
    });
});

describe("ReducedDisputeSOX", function () {
    it("Only dispute", async function () {
        const numBlocks = 1 << 24; // number of 64B blocks in 1GB (2^30 / 2^6)
        const numGates = 4 * numBlocks - 4;
        const openingValue = new Uint8Array([
            0xab, 0xab, 0xab, 0xab, 0xab, 0xab, 0xab, 0xab, 0xab, 0xab, 0xab,
            0xab, 0xab, 0xab, 0xab, 0xab, 0xab, 0xab, 0xab, 0xab, 0xab, 0xab,
            0xab, 0xab, 0xab, 0xab, 0xab, 0xab, 0xab, 0xab, 0xab, 0xab,
        ]);

        // keccak256 hash of 0xababab...ab (32 times)
        const commitment = new Uint8Array([
            0x7d, 0x3a, 0x60, 0x8b, 0xb8, 0x50, 0xf4, 0x7c, 0x2d, 0x77, 0xd6,
            0xbe, 0x73, 0xb8, 0xf9, 0x3c, 0x94, 0xa8, 0x02, 0x64, 0xb7, 0xbb,
            0x3c, 0xc5, 0xc7, 0xd2, 0xfb, 0x54, 0xd0, 0x7e, 0xf6, 0xb9,
        ]);

        const getSampleGate = (gateNum: bigint): bigint[] => {
            if (
                gateNum <= numBlocks - 1 ||
                BigInt(4 * numBlocks - 4) < gateNum
            ) {
                // out of bounds
                throw Error("out of bounds gate index");
            }

            if (BigInt(numBlocks) == gateNum) {
                // IV + 4
                return [3n, 0n, arrayIdxToConstantIdx(0)];
            }

            if (numBlocks < gateNum && gateNum <= 2 * numBlocks - 3) {
                // previous + 4
                return [3n, gateNum - 1n, arrayIdxToConstantIdx(0)];
            }

            if (BigInt(2 * numBlocks - 2) == gateNum) {
                // IV as counter for AES-CTR
                return [2n, arrayIdxToConstantIdx(3), 1n, 0n];
            }

            if (2 * numBlocks - 2 < gateNum && gateNum <= 3 * numBlocks - 4) {
                // General case for AES-CTR
                return [
                    1n,
                    arrayIdxToConstantIdx(3),
                    gateNum - 2n * BigInt(numBlocks) + 3n,
                    gateNum - BigInt(numBlocks) + 1n,
                ];
            }

            if (BigInt(3 * numBlocks - 3) == gateNum) {
                // First SHA256 compression
                return [0n, BigInt(2 * numBlocks - 2)];
            }

            if (3 * numBlocks - 3 < gateNum && gateNum <= 4 * numBlocks - 6) {
                // Other non-final SHA256 compression
                return [0n, gateNum - 1n, gateNum - BigInt(numBlocks) + 1n];
            }

            if (BigInt(4 * numBlocks - 5) == gateNum) {
                // Final SHA256 compression + padding
                return [
                    7n,
                    BigInt(4 * numBlocks - 6),
                    BigInt(3 * numBlocks - 4),
                    arrayIdxToConstantIdx(2),
                ];
            }

            if (BigInt(4 * numBlocks - 4) == gateNum) {
                // Comparison gate
                return [
                    5n,
                    BigInt(4 * numBlocks - 5),
                    arrayIdxToConstantIdx(1),
                ];
            }

            throw Error();
        };

        const getSampleValue = (gateNum: bigint): Uint8Array => {
            if (
                BigInt(4 * numBlocks - 4) < gateNum &&
                (gateNum & BigInt(1 << 31)) == 0n
            ) {
                // out of bounds
                throw Error("out of bounds value index; not a constant");
            }

            if ((gateNum & BigInt(1 << 31)) != 0n) {
                // constant
                const constIdx = gateNum ^ BigInt(1 << 31);

                switch (constIdx) {
                    case 0n:
                        // increment value
                        return bigintToBigEndianUint8Array(4n);

                    case 1n:
                        // description (SHA256 hash)
                        return new Uint8Array([
                            0xaa, 0xaa, 0xaa, 0xaa, 0xaa, 0xaa, 0xaa, 0xaa,
                            0xaa, 0xaa, 0xaa, 0xaa, 0xaa, 0xaa, 0xaa, 0xaa,
                            0xaa, 0xaa, 0xaa, 0xaa, 0xaa, 0xaa, 0xaa, 0xaa,
                            0xaa, 0xaa, 0xaa, 0xaa, 0xaa, 0xaa, 0xaa, 0xaa,
                        ]);

                    case 2n:
                        // plaintext size in bytes (2^30)
                        return new Uint8Array([
                            0x00, 0x00, 0x00, 0x00, 0x40, 0x00, 0x00, 0x00,
                        ]);

                    case 3n:
                        // 128b key
                        return new Uint8Array([
                            0xee, 0xee, 0xee, 0xee, 0xee, 0xee, 0xee, 0xee,
                            0xee, 0xee, 0xee, 0xee, 0xee, 0xee, 0xee, 0xee,
                        ]);

                    default:
                        throw Error("weird constant");
                }
            }

            if (gateNum == 0n) {
                // IV
                return new Uint8Array(16);
            }

            if (1 <= gateNum && gateNum <= numBlocks - 1) {
                // Ciphertext
                return new Uint8Array([
                    0xfe, 0xfe, 0xfe, 0xfe, 0xfe, 0xfe, 0xfe, 0xfe, 0xfe, 0xfe,
                    0xfe, 0xfe, 0xfe, 0xfe, 0xfe, 0xfe, 0xfe, 0xfe, 0xfe, 0xfe,
                    0xfe, 0xfe, 0xfe, 0xfe, 0xfe, 0xfe, 0xfe, 0xfe, 0xfe, 0xfe,
                    0xfe, 0xfe, 0xfe, 0xfe, 0xfe, 0xfe, 0xfe, 0xfe, 0xfe, 0xfe,
                    0xfe, 0xfe, 0xfe, 0xfe, 0xfe, 0xfe, 0xfe, 0xfe, 0xfe, 0xfe,
                    0xfe, 0xfe, 0xfe, 0xfe, 0xfe, 0xfe,
                ]);
            }

            if (numBlocks <= gateNum && gateNum <= 2 * numBlocks - 3) {
                // Counter
                const ctr = 4n * (gateNum - BigInt(numBlocks) + 1n);
                return bigintToBigEndianUint8Array(ctr);
            }

            if (2 * numBlocks - 2 <= gateNum && gateNum <= 3 * numBlocks - 4) {
                // AES-CTR
                return new Uint8Array([
                    0xc0, 0xc0, 0xc0, 0xc0, 0xc0, 0xc0, 0xc0, 0xc0, 0xc0, 0xc0,
                    0xc0, 0xc0, 0xc0, 0xc0, 0xc0, 0xc0, 0xc0, 0xc0, 0xc0, 0xc0,
                    0xc0, 0xc0, 0xc0, 0xc0, 0xc0, 0xc0, 0xc0, 0xc0, 0xc0, 0xc0,
                    0xc0, 0xc0, 0xc0, 0xc0, 0xc0, 0xc0, 0xc0, 0xc0, 0xc0, 0xc0,
                    0xc0, 0xc0, 0xc0, 0xc0, 0xc0, 0xc0, 0xc0, 0xc0, 0xc0, 0xc0,
                    0xc0, 0xc0, 0xc0, 0xc0, 0xc0, 0xc0,
                ]);
            }

            if (3 * numBlocks - 3 <= gateNum && gateNum <= 4 * numBlocks - 5) {
                // SHA256 compression
                return new Uint8Array([
                    0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11,
                    0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11,
                    0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11,
                    0x11, 0x11,
                ]);
            }

            if (BigInt(4 * numBlocks - 4) == gateNum) {
                // Comparison gate
                return new Uint8Array([1]);
            }

            throw Error("wtf");
        };

        for (let i = 0; i < NB_RUNS; ++i) {
            const fac = await ethers.getContractFactory("ReducedDisputeSOX");
            const rDispute = await fac
                .connect(buyer)
                .deploy(
                    buyer,
                    vendor,
                    100n,
                    100n,
                    numBlocks,
                    numGates,
                    commitment,
                    { value: 50n }
                );
            await rDispute.waitForDeployment();

            let state;
            do {
                state = await rDispute.currState();
                await rDispute.connect(buyer).respondChallenge(randomBytes());
                // await rDispute.connect(vendor).giveOpinion(Math.random() < 0.5);
                await rDispute.connect(vendor).giveOpinion(false); // FIXME remove this
            } while (state === 0n);

            const gateNum = await rDispute.a();
            const gate = getSampleGate(gateNum);
            const values: Uint8Array[] = [];
            for (let g of gate.slice(1)) {
                values.push(getSampleValue(g));
            }

            // TODO might need actual proofs ? hope not mdr
            if (state === 2n) {
                await rDispute
                    .connect(vendor)
                    .submitCommitment(
                        openingValue,
                        gateNum,
                        gate,
                        values,
                        0n,
                        randomBytes(),
                        [[]],
                        [[]],
                        [[]],
                        [[]]
                    );
            } else if (state === 3n) {
                await rDispute
                    .connect(vendor)
                    .submitCommitmentLeft(
                        openingValue,
                        gateNum,
                        gate,
                        values,
                        0n,
                        randomBytes(),
                        [[]],
                        [[]],
                        [[]]
                    );
            } else if (state === 4n) {
                await rDispute.connect(vendor).submitCommitmentRight([[]]);
            }

            state = await rDispute.currState();
            if (state == 5n) {
            } else if (state == 6n) {
            }
            // vendor asks to complete contract
            await rDispute.connect(vendor).completeTransaction();
        }
    });
});

describe("Reduced", function () {
    it("End-to-end with dispute", async function () {
        for (let i = 0; i < NB_RUNS; ++i) {
            // TODO
        }
    });
});

function randomBytes(size: number = 32): Uint8Array {
    const array = new Uint8Array(size);
    window.crypto.getRandomValues(array);
    return array;
}

function arrayIdxToConstantIdx(idx: number): bigint {
    return BigInt((1 << 31) | idx);
}

function bigintToBigEndianUint8Array(num: bigint): Uint8Array {
    const buffer = new ArrayBuffer(16); // Create a buffer of 16 bytes
    const view = new DataView(buffer);

    // Set the bigint in the first 8 bytes (big-endian)
    view.setBigUint64(0, num, false); // First 8 bytes
    view.setBigUint64(8, BigInt(0), false); // Next 8 bytes (set to 0)

    return new Uint8Array(buffer);
}

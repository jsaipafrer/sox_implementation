import { time } from "@nomicfoundation/hardhat-network-helpers";
import hre from "hardhat";
import "@nomicfoundation/hardhat-chai-matchers";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { getRandomValues } from "crypto";

const { ethers } = hre;

const NB_RUNS = 100;

/*
···················································································································
|  Solidity and Network Configuration                                                                             │
······························|·················|················|················|································
|  Solidity: 0.8.28           ·  Optim: true    ·  Runs: 1000    ·  viaIR: true   ·     Block: 30,000,000 gas     │
······························|·················|················|················|································
|  Network: ETHEREUM          ·  L1: 0.26807 gwei                ·                ·        4587.44 usd/eth        │
······························|·················|················|················|················|···············
|  Contracts / Methods        ·  Min            ·  Max           ·  Avg           ·  # calls       ·  usd (avg)   │
······························|·················|················|················|················|···············
|  HardcodeDisputeSOX         ·                                                                                   │
······························|·················|················|················|················|···············
|      cancelDispute          ·              -  ·             -  ·        47,674  ·           100  ·        0.06  │
······························|·················|················|················|················|···············
|      giveOpinion            ·         41,730  ·        42,314  ·        41,839  ·          2544  ·        0.05  │
······························|·················|················|················|················|···············
|      respondChallenge       ·         58,576  ·        58,600  ·        58,598  ·          2544  ·        0.07  │
······························|·················|················|················|················|···············
|      submitCommitment       ·        107,405  ·     5,105,639  ·     1,751,665  ·           100  ·        2.15  │
······························|·················|················|················|················|···············
|  HardcodeOptimisticSOX      ·                                                                                   │
······························|·················|················|················|················|···············
|      buyerSendDisputeFee    ·              -  ·             -  ·        35,921  ·           100  ·        0.04  │
······························|·················|················|················|················|···············
|      completeTransaction    ·              -  ·             -  ·        44,947  ·           100  ·        0.06  │
······························|·················|················|················|················|···············
|      sendKey                ·              -  ·             -  ·        56,725  ·           200  ·        0.07  │
······························|·················|················|················|················|···············
|      sendPayment            ·              -  ·             -  ·        37,922  ·           200  ·        0.05  │
······························|·················|················|················|················|···············
|      vendorSendDisputeFee   ·              -  ·             -  ·        33,667  ·           100  ·        0.04  │
······························|·················|················|················|················|···············
|  ReducedDisputeSOX          ·                                                                                   │
······························|·················|················|················|················|···············
|      cancelDispute          ·              -  ·             -  ·        47,674  ·           100  ·        0.06  │
······························|·················|················|················|················|···············
|      giveOpinion            ·         41,730  ·        42,314  ·        41,839  ·          2556  ·        0.05  │
······························|·················|················|················|················|···············
|      respondChallenge       ·         58,564  ·        58,600  ·        58,599  ·          2556  ·        0.07  │
······························|·················|················|················|················|···············
|      submitCommitment       ·        107,394  ·     5,105,639  ·     1,546,616  ·           100  ·        1.90  │
······························|·················|················|················|················|···············
|  ReducedOptimisticSOX       ·                                                                                   │
······························|·················|················|················|················|···············
|      buyerSendDisputeFee    ·              -  ·             -  ·        35,921  ·           100  ·        0.04  │
······························|·················|················|················|················|···············
|      completeTransaction    ·              -  ·             -  ·        44,947  ·           100  ·        0.06  │
······························|·················|················|················|················|···············
|      sendKey                ·              -  ·             -  ·        56,725  ·           200  ·        0.07  │
······························|·················|················|················|················|···············
|      sendPayment            ·              -  ·             -  ·        37,922  ·           200  ·        0.05  │
······························|·················|················|················|················|···············
|      vendorSendDisputeFee   ·              -  ·             -  ·        33,667  ·           100  ·        0.04  │
······························|·················|················|················|················|···············
|  Deployments                                  ·                                 ·  % of limit    ·              │
······························|·················|················|················|················|···············
|  HardcodeDisputeSOX         ·              -  ·             -  ·     2,095,084  ·           7 %  ·        2.58  │
······························|·················|················|················|················|···············
|  HardcodeOptimisticSOX      ·              -  ·             -  ·       791,718  ·         2.6 %  ·        0.97  │
······························|·················|················|················|················|···············
|  ReducedDisputeSOX          ·              -  ·             -  ·     2,098,785  ·           7 %  ·        2.58  │
······························|·················|················|················|················|···············
|  ReducedOptimisticSOX       ·              -  ·             -  ·       794,762  ·         2.6 %  ·        0.98  │
······························|·················|················|················|················|···············
|  Key                                                                                                            │
···················································································································
|  ◯  Execution gas for this method does not include intrinsic gas overhead                                       │
···················································································································
|  △  Cost was non-zero but below the precision setting for the currency display (see options)                    │
···················································································································
|  Toolchain:  hardhat                                                                                            │
···················································································································
*/

/*
Measurements done with files of 1GB (2^30 B)
Reduced:
    - Optimistic: 
        - Deployment: 794,762 gas
        - Execution: 139,594 gas

    - Dispute:
        - Deployment: 2,098,785 gas
        - Execution:
            - Average (over 100 runs): 4,480,289 gas
            - Worst case: 7,846,665 gas

    Comparison with OptiSwap:
        Deployment (without the libraries, only deployed once): Similar costs.
            Note that by rerunning the measurements locally, we get a gas
            cost of 645,946 gas for OptiSwap's optimistic contract. The
            cost difference with our implementation is due to our usage of
            message errors in the `require()` clauses. Storing these messages
            increases the price in a substantial manner. Adding these to 
            OptiSwap's optimistic contract increases the price to almost 900k 
            gas.

        Execution:
            - Optimistic: Execution costs are higher than on Optiswap's paper.
            After investigation, it appears that this difference is probably
            due to differences in the measurement method. Running similar
            measurements locally, we get an execution cost of 127,808 gas for
            Optiswap's optimistic contract. The difference of 12,000 gas is 
            probably due to the extra checks done on our implementation and
            the use of `selfdestruct` in OptiSwap's (now deprecated).

            - Dispute: The average execution cost for the AES-CTR + SHA-256
            circuit is lower than OptiSwap's. However, the worst case's price
            is almost 1.5M gas higher. This price is dominated by the gate that
            needs to be evaluated by the smart contract. In our case, the 
            evaluation of the AES gate is the most expensive (>5M gas).

Hardcoded:
    - Optimistic:
        - Deployment: 791,718 gas
        - Execution: 139,594 gas

    - Dispute:
        - Deployment: 2,095,084 gas
        - Execution:
            - Average (over 100 runs): 4,480,289 gas
            - Worst case: 7,846,665 gas

    Hardcoded values change almost nothing, it just makes the deployment barely cheaper.
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
                .deploy(buyer, vendor, 100n, 120n, { value: 50n });
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

    it("End-to-end optimistic, with dispute trigger", async function () {
        for (let i = 0; i < NB_RUNS; ++i) {
            const fac = await ethers.getContractFactory("ReducedOptimisticSOX");
            const rSOX = await fac
                .connect(buyer)
                .deploy(buyer, vendor, 100n, 120n, { value: 50n });
            await rSOX.waitForDeployment();

            // buyer sends payment
            await rSOX.connect(buyer).sendPayment({ value: 1000n });

            // vendor sends key
            await rSOX.connect(vendor).sendKey(ethers.toUtf8Bytes("key"));

            // buyer sends dispute fee to start the dispute
            await rSOX.connect(buyer).buyerSendDisputeFee({ value: 1000n });

            // vendor sends dispute fee to start the dispute
            await rSOX.connect(vendor).vendorSendDisputeFee({ value: 1000n });
        }
    });
});

describe("HardcodeOptimisticSOX", function () {
    it("End-to-end optimistic, no dispute", async function () {
        for (let i = 0; i < NB_RUNS; ++i) {
            const fac = await ethers.getContractFactory(
                "HardcodeOptimisticSOX"
            );
            const rSOX = await fac.connect(buyer).deploy({ value: 50n });
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

    it("End-to-end optimistic, with dispute trigger", async function () {
        for (let i = 0; i < NB_RUNS; ++i) {
            const fac = await ethers.getContractFactory(
                "HardcodeOptimisticSOX"
            );
            const rSOX = await fac.connect(buyer).deploy({ value: 50n });
            await rSOX.waitForDeployment();

            // buyer sends payment
            await rSOX.connect(buyer).sendPayment({ value: 1000n });

            // vendor sends key
            await rSOX.connect(vendor).sendKey(ethers.toUtf8Bytes("key"));

            // buyer sends dispute fee to start the dispute
            await rSOX.connect(buyer).buyerSendDisputeFee({ value: 1000n });

            // vendor sends dispute fee to start the dispute
            await rSOX.connect(vendor).vendorSendDisputeFee({ value: 1000n });
        }
    });
});

describe("ReducedDisputeSOX", function () {
    it("Only dispute", async function () {
        const AccumulatorVerifierFactory = await ethers.getContractFactory(
            "AccumulatorVerifier"
        );
        const accumulatorVerifier = await AccumulatorVerifierFactory.deploy();
        await accumulatorVerifier.waitForDeployment();

        const SHA256EvaluatorFactory = await ethers.getContractFactory(
            "SHA256Evaluator"
        );
        const sha256Evaluator = await SHA256EvaluatorFactory.deploy();
        await sha256Evaluator.waitForDeployment();

        const SimpleOperationsEvaluatorFactory =
            await ethers.getContractFactory("SimpleOperationsEvaluator");
        const simpleOperationsEvaluator =
            await SimpleOperationsEvaluatorFactory.deploy();
        await simpleOperationsEvaluator.waitForDeployment();

        const AES128CtrEvaluatorFactory = await ethers.getContractFactory(
            "AES128CtrEvaluator"
        );
        const aes128CtrEvaluator = await AES128CtrEvaluatorFactory.deploy();
        await aes128CtrEvaluator.waitForDeployment();

        const CircuitEvaluatorFactory = await ethers.getContractFactory(
            "CircuitEvaluator",
            {
                libraries: {
                    SHA256Evaluator: await sha256Evaluator.getAddress(),
                    SimpleOperationsEvaluator:
                        await simpleOperationsEvaluator.getAddress(),
                    AES128CtrEvaluator: await aes128CtrEvaluator.getAddress(),
                },
            }
        );
        const circuitEvaluator = await CircuitEvaluatorFactory.deploy();
        await circuitEvaluator.waitForDeployment();

        const CommitmentOpenerFactory = await ethers.getContractFactory(
            "CommitmentOpener"
        );
        const commitmentOpener = await CommitmentOpenerFactory.deploy();
        await commitmentOpener.waitForDeployment();

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

        for (let i = 0; i < NB_RUNS; ++i) {
            const fac = await ethers.getContractFactory("ReducedDisputeSOX", {
                libraries: {
                    AccumulatorVerifier: await accumulatorVerifier.getAddress(),
                    CircuitEvaluator: await circuitEvaluator.getAddress(),
                    CommitmentOpener: await commitmentOpener.getAddress(),
                },
            });
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
                    { value: 500n }
                );
            await rDispute.waitForDeployment();

            let state = await rDispute.currState();
            while (state === 0n) {
                await rDispute.connect(buyer).respondChallenge(randomBytes());
                await rDispute.connect(vendor).giveOpinion(Math.random() < 0.5);
                state = await rDispute.currState();
            }

            const gateNum = await rDispute.a();
            const gate = getSampleGate(gateNum, numBlocks);
            const values: Uint8Array[] = [];
            for (let g of gate.slice(1)) {
                values.push(getSampleValue(g, numBlocks));
            }
            const gateUint32 = gate.map((v) => BigInt.asUintN(32, v));

            if (state === 2n) {
                // mix of "left"s and "right"s (most common)
                await rDispute
                    .connect(vendor)
                    .submitCommitment(
                        openingValue,
                        gateNum,
                        gateUint32,
                        values,
                        0n,
                        randomBytes(),
                        [[]],
                        [[]],
                        [[]],
                        [[]]
                    );
            } else if (state === 3n) {
                // only "left"s
                await rDispute
                    .connect(vendor)
                    .submitCommitmentLeft(
                        openingValue,
                        gateNum,
                        gateUint32,
                        values,
                        0n,
                        randomBytes(),
                        [[]],
                        [[]],
                        [[]]
                    );
            } else if (state === 4n) {
                // only "right"s
                await rDispute.connect(vendor).submitCommitmentRight([[]]);
            }

            state = await rDispute.currState();
            if (state == 5n) {
                rDispute.connect(vendor).completeDispute();
            } else if (state == 6n) {
                rDispute.connect(buyer).cancelDispute();
            }
        }
    });
});

describe("HardcodeDisputeSOX", function () {
    it("Only dispute", async function () {
        const AccumulatorVerifierFactory = await ethers.getContractFactory(
            "AccumulatorVerifier"
        );
        const accumulatorVerifier = await AccumulatorVerifierFactory.deploy();
        await accumulatorVerifier.waitForDeployment();

        const SHA256EvaluatorFactory = await ethers.getContractFactory(
            "SHA256Evaluator"
        );
        const sha256Evaluator = await SHA256EvaluatorFactory.deploy();
        await sha256Evaluator.waitForDeployment();

        const SimpleOperationsEvaluatorFactory =
            await ethers.getContractFactory("SimpleOperationsEvaluator");
        const simpleOperationsEvaluator =
            await SimpleOperationsEvaluatorFactory.deploy();
        await simpleOperationsEvaluator.waitForDeployment();

        const AES128CtrEvaluatorFactory = await ethers.getContractFactory(
            "AES128CtrEvaluator"
        );
        const aes128CtrEvaluator = await AES128CtrEvaluatorFactory.deploy();
        await aes128CtrEvaluator.waitForDeployment();

        const CircuitEvaluatorFactory = await ethers.getContractFactory(
            "CircuitEvaluator",
            {
                libraries: {
                    SHA256Evaluator: await sha256Evaluator.getAddress(),
                    SimpleOperationsEvaluator:
                        await simpleOperationsEvaluator.getAddress(),
                    AES128CtrEvaluator: await aes128CtrEvaluator.getAddress(),
                },
            }
        );
        const circuitEvaluator = await CircuitEvaluatorFactory.deploy();
        await circuitEvaluator.waitForDeployment();

        const CommitmentOpenerFactory = await ethers.getContractFactory(
            "CommitmentOpener"
        );
        const commitmentOpener = await CommitmentOpenerFactory.deploy();
        await commitmentOpener.waitForDeployment();

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

        for (let i = 0; i < NB_RUNS; ++i) {
            const fac = await ethers.getContractFactory("HardcodeDisputeSOX", {
                libraries: {
                    AccumulatorVerifier: await accumulatorVerifier.getAddress(),
                    CircuitEvaluator: await circuitEvaluator.getAddress(),
                    CommitmentOpener: await commitmentOpener.getAddress(),
                },
            });
            const rDispute = await fac.connect(buyer).deploy({ value: 500n });
            await rDispute.waitForDeployment();

            let state = await rDispute.currState();
            while (state === 0n) {
                await rDispute.connect(buyer).respondChallenge(randomBytes());
                await rDispute.connect(vendor).giveOpinion(Math.random() < 0.5);
                state = await rDispute.currState();
            }

            const gateNum = await rDispute.a();
            const gate = getSampleGate(gateNum, numBlocks);
            const values: Uint8Array[] = [];
            for (let g of gate.slice(1)) {
                values.push(getSampleValue(g, numBlocks));
            }
            const gateUint32 = gate.map((v) => BigInt.asUintN(32, v));

            if (state === 2n) {
                // mix of "left"s and "right"s (most common)
                await rDispute
                    .connect(vendor)
                    .submitCommitment(
                        openingValue,
                        gateNum,
                        gateUint32,
                        values,
                        0n,
                        randomBytes(),
                        [[]],
                        [[]],
                        [[]],
                        [[]]
                    );
            } else if (state === 3n) {
                // only "left"s
                await rDispute
                    .connect(vendor)
                    .submitCommitmentLeft(
                        openingValue,
                        gateNum,
                        gateUint32,
                        values,
                        0n,
                        randomBytes(),
                        [[]],
                        [[]],
                        [[]]
                    );
            } else if (state === 4n) {
                // only "right"s
                await rDispute.connect(vendor).submitCommitmentRight([[]]);
            }

            state = await rDispute.currState();
            if (state == 5n) {
                rDispute.connect(vendor).completeDispute();
            } else if (state == 6n) {
                rDispute.connect(buyer).cancelDispute();
            }
        }
    });
});

function randomBytes(size: number = 32): Uint8Array {
    const array = new Uint8Array(size);
    getRandomValues(array);
    return array;
}

function arrayIdxToConstantIdx(idx: number): bigint {
    return BigInt((1 << 31) | idx);
}

function bigintToBigEndianUint8Array(num: bigint): Uint8Array {
    const buffer = new ArrayBuffer(16); // Create a buffer of 16 bytes
    const view = new DataView(buffer);

    // Set the bigint in the last 8 bytes (big-endian)
    view.setBigUint64(8, BigInt(0), false); // First 8 bytes (set to 0)
    view.setBigUint64(0, num, false); // First 8 bytes

    return new Uint8Array(buffer);
}

function getSampleGate(gateNum: bigint, numBlocks: number): bigint[] {
    if (gateNum <= numBlocks - 1 || BigInt(4 * numBlocks - 4) < gateNum) {
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
        return [5n, BigInt(4 * numBlocks - 5), arrayIdxToConstantIdx(1)];
    }

    throw Error();
}

function getSampleValue(gateNum: bigint, numBlocks: number): Uint8Array {
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
                    0xaa, 0xaa, 0xaa, 0xaa, 0xaa, 0xaa, 0xaa, 0xaa, 0xaa, 0xaa,
                    0xaa, 0xaa, 0xaa, 0xaa, 0xaa, 0xaa, 0xaa, 0xaa, 0xaa, 0xaa,
                    0xaa, 0xaa, 0xaa, 0xaa, 0xaa, 0xaa, 0xaa, 0xaa, 0xaa, 0xaa,
                    0xaa, 0xaa,
                ]);

            case 2n:
                // plaintext size in bytes (2^30)
                return new Uint8Array([
                    0x00, 0x00, 0x00, 0x00, 0x40, 0x00, 0x00, 0x00,
                ]);

            case 3n:
                // 128b key
                return new Uint8Array([
                    0xee, 0xee, 0xee, 0xee, 0xee, 0xee, 0xee, 0xee, 0xee, 0xee,
                    0xee, 0xee, 0xee, 0xee, 0xee, 0xee,
                ]);

            default:
                throw Error(`weird constant ${constIdx} of gate ${gateNum}`);
        }
    }

    if (gateNum == 0n) {
        // IV
        return new Uint8Array(16);
    }

    if (1 <= gateNum && gateNum <= numBlocks - 1) {
        // Ciphertext
        return new Uint8Array([
            0xfe, 0xfe, 0xfe, 0xfe, 0xfe, 0xfe, 0xfe, 0xfe, 0xfe, 0xfe, 0xfe,
            0xfe, 0xfe, 0xfe, 0xfe, 0xfe, 0xfe, 0xfe, 0xfe, 0xfe, 0xfe, 0xfe,
            0xfe, 0xfe, 0xfe, 0xfe, 0xfe, 0xfe, 0xfe, 0xfe, 0xfe, 0xfe, 0xfe,
            0xfe, 0xfe, 0xfe, 0xfe, 0xfe, 0xfe, 0xfe, 0xfe, 0xfe, 0xfe, 0xfe,
            0xfe, 0xfe, 0xfe, 0xfe, 0xfe, 0xfe, 0xfe, 0xfe, 0xfe, 0xfe, 0xfe,
            0xfe, 0xfe, 0xfe, 0xfe, 0xfe, 0xfe, 0xfe, 0xfe, 0xfe,
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
            0xc0, 0xc0, 0xc0, 0xc0, 0xc0, 0xc0, 0xc0, 0xc0, 0xc0, 0xc0, 0xc0,
            0xc0, 0xc0, 0xc0, 0xc0, 0xc0, 0xc0, 0xc0, 0xc0, 0xc0, 0xc0, 0xc0,
            0xc0, 0xc0, 0xc0, 0xc0, 0xc0, 0xc0, 0xc0, 0xc0, 0xc0, 0xc0, 0xc0,
            0xc0, 0xc0, 0xc0, 0xc0, 0xc0, 0xc0, 0xc0, 0xc0, 0xc0, 0xc0, 0xc0,
            0xc0, 0xc0, 0xc0, 0xc0, 0xc0, 0xc0, 0xc0, 0xc0, 0xc0, 0xc0, 0xc0,
            0xc0, 0xc0, 0xc0, 0xc0, 0xc0, 0xc0, 0xc0, 0xc0, 0xc0,
        ]);
    }

    if (3 * numBlocks - 3 <= gateNum && gateNum <= 4 * numBlocks - 5) {
        // SHA256 compression
        return new Uint8Array([
            0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11,
            0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11,
            0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11,
        ]);
    }

    if (BigInt(4 * numBlocks - 4) == gateNum) {
        // Comparison gate
        return new Uint8Array([1]);
    }

    throw Error("wtf");
}

import hre from "hardhat";
import "@nomicfoundation/hardhat-chai-matchers";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { bytesToHex } from "../../app/lib/helpers";

const { ethers } = hre;

function randInt(a: number, b: number): number {
    return a + Math.floor(Math.random() * (b - a));
}

export async function deployRealContracts(
    sponsor: HardhatEthersSigner,
    buyer: HardhatEthersSigner,
    vendor: HardhatEthersSigner,
    withRandomValues?: boolean
) {
    const GWEI_MULT = 1_000_000_000n;

    const AccumulatorVerifierFactory = await ethers.getContractFactory(
        "AccumulatorVerifier"
    );
    const accumulatorVerifier = await AccumulatorVerifierFactory.deploy();
    await accumulatorVerifier.waitForDeployment();

    const CircuitEvaluatorFactory = await ethers.getContractFactory(
        "CircuitEvaluator"
    );
    const circuitEvaluator = await CircuitEvaluatorFactory.deploy();
    await circuitEvaluator.waitForDeployment();

    const CommitmentVerifierFactory = await ethers.getContractFactory(
        "CommitmentVerifier"
    );
    const commitmentVerifier = await CommitmentVerifierFactory.deploy();
    await commitmentVerifier.waitForDeployment();

    const libFactory = await ethers.getContractFactory("DisputeDeployer", {
        libraries: {
            AccumulatorVerifier: await accumulatorVerifier.getAddress(),
            CircuitEvaluator: await circuitEvaluator.getAddress(),
            CommitmentVerifier: await commitmentVerifier.getAddress(),
        },
    });
    const disputeDeployer = await libFactory.connect(sponsor).deploy();
    await disputeDeployer.waitForDeployment();

    let sponsorAmount = 500n * GWEI_MULT;
    let agreedPrice = 30n * GWEI_MULT;
    let completionTip = 80n * GWEI_MULT;
    let disputeTip = 120n * GWEI_MULT;
    let timeoutIncrement = 3600n; // 1 hour
    let num_blocks = 1024n;
    let num_gates = 4n * num_blocks + 1n;
    let commitment = new Uint8Array(32);

    if (withRandomValues) {
        sponsorAmount = BigInt(randInt(250, 1001)) * GWEI_MULT;
        agreedPrice = BigInt(randInt(1, 101)) * GWEI_MULT;
        completionTip = BigInt(randInt(1, 111)) * GWEI_MULT;
        disputeTip = BigInt(randInt(20, 201)) * GWEI_MULT;
        timeoutIncrement = BigInt(randInt(60, 121));
        num_blocks = BigInt(randInt(512, 2048));
        num_gates = 4n * num_blocks + BigInt(randInt(512, 2048));
    }

    const factory = await ethers.getContractFactory("OptimisticSOX", {
        libraries: {
            DisputeDeployer: await disputeDeployer.getAddress(),
        },
    });

    const commitmentHex = bytesToHex(commitment, true);
    const contract = await factory
        .connect(sponsor)
        .deploy(
            await buyer.getAddress(),
            await vendor.getAddress(),
            agreedPrice,
            completionTip,
            disputeTip,
            timeoutIncrement,
            commitmentHex,
            num_gates,
            num_blocks,
            {
                value: sponsorAmount,
            }
        );
    await contract.waitForDeployment();

    return {
        contract,
        sponsorAmount,
        agreedPrice,
        completionTip,
        disputeTip,
        timeoutIncrement,
        disputeDeployer,
        accumulatorVerifier,
        circuitEvaluator,
        commitmentVerifier,
    };
}

export async function deployDisputeWithMockOptimistic(
    numBlocks: bigint,
    numGates: bigint,
    commitment: Uint8Array,
    buyer: HardhatEthersSigner,
    vendor: HardhatEthersSigner,
    buyerDisputeSponsor: HardhatEthersSigner,
    vendorDisputeSponsor: HardhatEthersSigner,
    withRandomValues?: boolean
) {
    const GWEI_MULT = 1_000_000_000n;
    let agreedPrice = 30n * GWEI_MULT;
    let timeoutIncrement = 3600n;

    if (withRandomValues) {
        agreedPrice = BigInt(randInt(1, 101)) * GWEI_MULT;
        timeoutIncrement = BigInt(randInt(1800, 18001)) * GWEI_MULT;
    }

    // Deploy linked libraries
    const AccumulatorVerifierFactory = await ethers.getContractFactory(
        "AccumulatorVerifier"
    );
    const accumulatorVerifier = await AccumulatorVerifierFactory.deploy();
    await accumulatorVerifier.waitForDeployment();

    const CircuitEvaluatorFactory = await ethers.getContractFactory(
        "CircuitEvaluator"
    );
    const circuitEvaluator = await CircuitEvaluatorFactory.deploy();
    await circuitEvaluator.waitForDeployment();

    const CommitmentVerifierFactory = await ethers.getContractFactory(
        "CommitmentVerifier"
    );
    const commitmentVerifier = await CommitmentVerifierFactory.deploy();
    await commitmentVerifier.waitForDeployment();

    const OptimisticSOXFactory = await ethers.getContractFactory(
        "MockOptimisticSOX"
    );
    const optimistic = await OptimisticSOXFactory.deploy(
        buyer,
        vendor,
        buyerDisputeSponsor,
        vendorDisputeSponsor,
        timeoutIncrement,
        agreedPrice
    );
    await optimistic.waitForDeployment();

    // Deploy the main contract with linked libraries
    const DisputeSOXFactory = await ethers.getContractFactory("DisputeSOX", {
        libraries: {
            AccumulatorVerifier: await accumulatorVerifier.getAddress(),
            CircuitEvaluator: await circuitEvaluator.getAddress(),
            CommitmentVerifier: await commitmentVerifier.getAddress(),
        },
    });

    const contract = await DisputeSOXFactory.deploy(
        await optimistic.getAddress(),
        numBlocks,
        numGates,
        commitment,
        { value: agreedPrice }
    );
    await contract.waitForDeployment();

    return {
        contract,
        agreedPrice,
        timeoutIncrement,
        accumulatorVerifier,
        circuitEvaluator,
        commitmentVerifier,
        optimistic,
    };
}

import { expect } from "chai";
import { ethers } from "hardhat";

describe("DisputeDeployer via TestDisputeDeployer", () => {
    it("should deploy DisputeSOX with correct constructor arguments", async () => {
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

        // Deploy the DisputeDeployer library
        const libFactory = await ethers.getContractFactory("DisputeDeployer", {
            libraries: {
                AccumulatorVerifier: await accumulatorVerifier.getAddress(),
                CircuitEvaluator: await circuitEvaluator.getAddress(),
                CommitmentOpener: await commitmentOpener.getAddress(),
            },
        });
        const lib = await libFactory.deploy();
        await lib.waitForDeployment();

        // Deploy TestDisputeDeployer, linking the library
        const factory = await ethers.getContractFactory("MockOptimisticSOX", {
            libraries: {
                DisputeDeployer: await lib.getAddress(),
            },
        });

        const mockOptimistic = await factory.deploy(
            ethers.ZeroAddress,
            ethers.ZeroAddress,
            ethers.ZeroAddress,
            ethers.ZeroAddress,
            1,
            1
        );
        await mockOptimistic.waitForDeployment();

        const numBlocks = 100;
        const numGates = 200;
        const commitment = ethers.keccak256(
            ethers.toUtf8Bytes("test-commitment")
        );

        const tx = await mockOptimistic.deployDispute(
            numBlocks,
            numGates,
            commitment,
            {
                value: ethers.parseEther("1.0"),
            }
        );

        const receipt = await tx.wait();
        const deployedAddr = receipt!.logs[0]!.args[0];

        const dispute = await ethers.getContractAt("DisputeSOX", deployedAddr);

        // console.log(await dispute.optimisticContract());
        // expect(await dispute.optimisticContract()).to.equal(
        //     await mockOptimistic.getAddress()
        // );
        expect(await dispute.numBlocks()).to.equal(numBlocks);
        expect(await dispute.numGates()).to.equal(numGates);
        expect(await dispute.commitment()).to.equal(commitment);
    });
});

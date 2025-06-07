import { writeFileSync } from "fs";
import { ethers } from "hardhat";
import hre from "hardhat";
import { PROVIDER } from "../app/lib/blockchain/config";

async function main() {
    const deployer = (await PROVIDER.listAccounts()).slice(-1)[0];

    let addresses = new Map();
    for (const lName of [
        "SHA256Evaluator",
        "SimpleOperationsEvaluator",
        "AES128CtrEvaluator",
        "AccumulatorVerifier",
        "CommitmentOpener",
    ]) {
        let factory = await ethers.getContractFactory(lName);
        let lib = await factory.connect(deployer).deploy();
        await lib.waitForDeployment();
        addresses.set(lName, await lib.getAddress());
    }

    // circuit evaluator depends on some of the others
    const CircuitEvaluatorFactory = await ethers.getContractFactory(
        "CircuitEvaluator",
        {
            libraries: {
                SHA256Evaluator: await addresses.get("SHA256Evaluator"),
                SimpleOperationsEvaluator: await addresses.get(
                    "SimpleOperationsEvaluator"
                ),
                AES128CtrEvaluator: await addresses.get("AES128CtrEvaluator"),
            },
        }
    );
    const circuitEvaluator = await CircuitEvaluatorFactory.connect(
        deployer
    ).deploy();
    await circuitEvaluator.waitForDeployment();
    addresses.set("CircuitEvaluator", await circuitEvaluator.getAddress());

    // dispute deployer depends on the others
    const DisputeDeployerFactory = await ethers.getContractFactory(
        "DisputeDeployer",
        {
            libraries: {
                AccumulatorVerifier: await addresses.get("AccumulatorVerifier"),
                CommitmentOpener: await addresses.get("CommitmentOpener"),
                CircuitEvaluator: await addresses.get("CircuitEvaluator"),
            },
        }
    );
    let disputeDeployer = await DisputeDeployerFactory.connect(
        deployer
    ).deploy();
    await disputeDeployer.waitForDeployment();
    addresses.set("DisputeDeployer", await disputeDeployer.getAddress());

    // link libraries to contracts
    const optimisticFac = await ethers.getContractFactory("OptimisticSOX", {
        libraries: {
            DisputeDeployer: addresses.get("DisputeDeployer"),
        },
    });

    const optimisticArtifact = await hre.artifacts.readArtifact(
        "OptimisticSOX"
    );

    const optimisticData = {
        abi: optimisticArtifact.abi,
        bytecode: optimisticFac.bytecode,
    };

    const disputeFac = await ethers.getContractFactory("DisputeSOX", {
        libraries: {
            AccumulatorVerifier: addresses.get("AccumulatorVerifier"),
            CommitmentOpener: addresses.get("CommitmentOpener"),
            CircuitEvaluator: addresses.get("CircuitEvaluator"),
        },
    });

    const disputeArtifact = await hre.artifacts.readArtifact("DisputeSOX");

    const disputeData = {
        abi: disputeArtifact.abi,
        bytecode: disputeFac.bytecode,
    };

    writeFileSync(
        "../app/lib/blockchain/contracts/OptimisticSOX.json",
        JSON.stringify(optimisticData)
    );
    writeFileSync(
        "../app/lib/blockchain/contracts/DisputeSOX.json",
        JSON.stringify(disputeData)
    );

    console.log("Deployed!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

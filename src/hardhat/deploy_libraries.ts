import { writeFileSync } from "fs";
import { ethers } from "hardhat";
import hre from "hardhat";
import { PROVIDER } from "../app/lib/blockchain/config";

async function main() {
    const deployer = (await PROVIDER.listAccounts()).slice(-1)[0];

    let addresses = new Map();
    for (const lName of [
        "AccumulatorVerifier",
        "CommitmentVerifier",
        "CircuitEvaluator",
    ]) {
        let factory = await ethers.getContractFactory(lName);
        let lib = await factory.connect(deployer).deploy();
        await lib.waitForDeployment();
        addresses.set(lName, await lib.getAddress());
    }

    // dispute deployer depends on the others
    let factory = await ethers.getContractFactory("DisputeDeployer", {
        libraries: {
            AccumulatorVerifier: addresses.get("AccumulatorVerifier"),
            CommitmentVerifier: addresses.get("CommitmentVerifier"),
            CircuitEvaluator: addresses.get("CircuitEvaluator"),
        },
    });
    let lib = await factory.connect(deployer).deploy();
    await lib.waitForDeployment();
    addresses.set("DisputeDeployer", await lib.getAddress());

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
            CommitmentVerifier: addresses.get("CommitmentVerifier"),
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

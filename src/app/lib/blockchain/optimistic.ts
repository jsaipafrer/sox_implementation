import { abi, bytecode } from "./contracts/OptimisticSOX.json";
import { SPONSOR_WALLET } from "./config";
import { Contract, ContractFactory, ethers, parseEther } from "ethers";
import { bytesArraysAreEqual } from "../helpers";

export async function deployOptimisticContract(
    pkBuyer: string,
    pkVendor: string,
    price: number,
    completionTip: number,
    disputeTip: number,
    timeoutIncrement: number
): Promise<string> {
    const factory = new ContractFactory(abi, bytecode);
    const contract = await factory
        .connect(SPONSOR_WALLET)
        .deploy(
            pkBuyer,
            pkVendor,
            price,
            completionTip,
            disputeTip,
            timeoutIncrement,
            { value: parseEther("1") }
        );
    await contract.waitForDeployment();
    return await contract.getAddress();
}

export async function getBlockchainContractInfo(contractAddr: `0x${string}`) {
    const state = await readFromContract(contractAddr, "state");
    // const key = await readFromContract(contractAddr, "getKey");

    return {
        state,
        // key,
    };
}

async function readFromContract(contractAddr: `0x${string}`, name: string) {
    // return await PUBLIC_CLIENT.readContract({
    //     address: contractAddr,
    //     abi: ABI,
    //     functionName: name,
    // });
}

import { abi, bytecode } from "./contracts/OptimisticSOX.json";
import { SPONSOR_WALLET } from "./config";
import { ContractFactory, ethers } from "ethers";
import { bytesArraysAreEqual, linkLibrary } from "../helpers";

const linkedBytecode = linkLibrary(bytecode.object, {
    ["contracts/DisputeDeployer.sol:DisputeDeployer"]:
        "0x14dC79964da2C08b23698B3D3cc7Ca32193d9955",
});

export async function deployOptimisticContract(
    pkBuyer: string,
    pkVendor: string,
    price: number,
    completionTip: number,
    disputeTip: number,
    timeoutIncrement: number
): Promise<string> {
    return "";
    // const tx_hash = await SPONSOR_WALLET.deployContract({
    //     abi: ABI,
    //     account: SPONSOR_ACCOUNT,
    //     bytecode: BYTECODE,
    //     args: [
    //         pkBuyer,
    //         pkVendor,
    //         price,
    //         completionTip,
    //         disputeTip,
    //         timeoutIncrement,
    //     ],
    //     value: parseEther("1"),
    // });
    // const tx = await PUBLIC_CLIENT.getTransactionReceipt({
    //     hash: tx_hash,
    // });
    // return tx.contractAddress!;
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

console.log(linkedBytecode);

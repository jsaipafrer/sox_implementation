import contract from "./contracts/OptimisticSOX.json";
import { PUBLIC_CLIENT, SPONSOR_ACCOUNT, SPONSOR_WALLET } from "./config";
import { getContractAddress, parseEther } from "viem";

const ABI = contract.abi;
const BYTECODE = contract.bytecode.object as `0x${string}`;

export async function deployOptimisticContract(
    pkBuyer: string,
    pkVendor: string,
    price: number
): Promise<`0x${string}`> {
    const tx_hash = await SPONSOR_WALLET.deployContract({
        abi: ABI,
        account: SPONSOR_ACCOUNT,
        bytecode: BYTECODE,
        args: [pkBuyer, pkVendor, price],
        value: parseEther("1"),
    });

    const tx = await PUBLIC_CLIENT.getTransactionReceipt({
        hash: tx_hash,
    });

    return tx.contractAddress;
}

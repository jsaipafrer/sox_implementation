import { http, createPublicClient, formatEther } from "viem";
import { anvil } from "viem/chains";
import { contractAbi, contractAddress } from "./contract.js";

const accounts = [
    "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
    "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
    "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc",
    "0x976EA74026E726554dB657fA54763abd0C3a0aa9",
    "0x14dC79964da2C08b23698B3D3cc7Ca32193d9955",
    "0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f", // test account for simple transactions
    "0xa0Ee7A142d267C1f36714E4a8F75612F20a79720", // deployer
];

const client = createPublicClient({
    chain: anvil,
    transport: http(),
});

async function printCounter() {
    // read transaction (no gas fee!)
    const data = await client.readContract({
        address: contractAddress,
        abi: contractAbi,
        functionName: "message",
    });

    console.log(`counter is currently: ${data}`);
}

for (const a of accounts) {
    const balance = await client.getBalance({
        address: a,
    });

    console.log(`${a}:\t${balance} wei\t(= ${formatEther(balance)} ETH)`);
}

const balance = await client.getBalance({ address: contractAddress });

console.log("\n=====");
console.log(`Contract balance:\t\t\t\t${balance} wei`);
console.log("\n");
await printCounter();

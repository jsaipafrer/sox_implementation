import { http, createPublicClient } from "viem";
import { anvil } from "viem/chains";

const client = createPublicClient({
    chain: anvil,
    transport: http(),
});

const transaction = await client.getTransaction({
    hash: "0x7203cdc9f146ad04e440fa22511fb1e087faf6409d4d0737d95aca3c8e914023",
});

console.log(transaction);

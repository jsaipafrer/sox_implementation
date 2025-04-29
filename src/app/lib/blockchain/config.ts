import { createPublicClient, createWalletClient, http } from "viem";
import { anvil } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

const BUYER_SK =
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const VENDOR_SK =
    "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";
const SPONSOR_SK =
    "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a";
const BUYER_DISPUTE_SPONSOR_SK =
    "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6";
const VENDOR_DISPUTE_SPONSOR_SK =
    "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a";

export const BUYER_ACCOUNT = privateKeyToAccount(BUYER_SK);
export const BUYER_WALLET = createWalletClient({
    account: BUYER_ACCOUNT,
    chain: anvil,
    transport: http(),
});

export const VENDOR_ACCOUNT = privateKeyToAccount(VENDOR_SK);
export const VENDOR_WALLET = createWalletClient({
    account: VENDOR_ACCOUNT,
    chain: anvil,
    transport: http(),
});

export const SPONSOR_ACCOUNT = privateKeyToAccount(SPONSOR_SK);
export const SPONSOR_WALLET = createWalletClient({
    account: SPONSOR_ACCOUNT,
    chain: anvil,
    transport: http(),
});

export const BUYER_DISPUTE_SPONSOR_ACCOUNT = privateKeyToAccount(
    BUYER_DISPUTE_SPONSOR_SK
);
export const BUYER_DISPUTE_SPONSOR_WALLET = createWalletClient({
    account: BUYER_DISPUTE_SPONSOR_ACCOUNT,
    chain: anvil,
    transport: http(),
});

export const VENDOR_DISPUTE_SPONSOR_ACCOUNT = privateKeyToAccount(
    VENDOR_DISPUTE_SPONSOR_SK
);
export const VENDOR_DISPUTE_SPONSOR_WALLET = createWalletClient({
    account: VENDOR_DISPUTE_SPONSOR_ACCOUNT,
    chain: anvil,
    transport: http(),
});

export const PUBLIC_CLIENT = createPublicClient({
    chain: anvil,
    transport: http(),
});

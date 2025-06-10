import { abi, bytecode } from "./contracts/DisputeSOX.json";
import { PK_SK_MAP, PROVIDER } from "./config";
import { Contract, Wallet, isAddress } from "ethers";

export async function getDisputeState(contractAddr: string) {
    if (!isAddress(contractAddr)) return;

    const contract = new Contract(contractAddr, abi, PROVIDER);
    return await contract.currState().catch(() => {});
}

export async function getChallenge(contractAddr: string) {
    if (!isAddress(contractAddr)) return;

    const contract = new Contract(contractAddr, abi, PROVIDER);
    return await contract.chall();
}

export async function respondChallenge(
    buyerAddr: string,
    contractAddr: string,
    response: string
) {
    let contract = new Contract(contractAddr, abi, PROVIDER);
    const privateKey = PK_SK_MAP.get(buyerAddr);
    if (!privateKey) return;

    const wallet = new Wallet(privateKey, PROVIDER);
    await (contract.connect(wallet) as Contract).respondChallenge(response);
}

export async function getLatestChallengeResponse(contractAddr: string) {
    if (!isAddress(contractAddr)) return;

    let contract = new Contract(contractAddr, abi, PROVIDER);
    return await contract.getLatestBuyerResponse();
}

export async function getNextDisputeTimeout(contractAddr: string) {
    if (!isAddress(contractAddr)) return;

    const contract = new Contract(contractAddr, abi, PROVIDER);
    return await contract.nextTimeoutTime().catch(() => {});
}

export async function giveOpinion(
    vendorAddr: string,
    contractAddr: string,
    opinion: boolean
) {
    let contract = new Contract(contractAddr, abi, PROVIDER);
    const privateKey = PK_SK_MAP.get(vendorAddr);
    if (!privateKey) return;

    const wallet = new Wallet(privateKey, PROVIDER);
    await (contract.connect(wallet) as Contract).giveOpinion(opinion);
}

export async function submitCommitment(
    openingValue: string,
    gateNum: number,
    gateFlat: number[],
    values: Uint8Array[],
    version: number,
    currAcc: Uint8Array,
    proof1: Uint8Array[][],
    proof2: Uint8Array[][],
    proof3: Uint8Array[][],
    proofExt: Uint8Array[][],
    vendorAddr: string,
    contractAddr: string
) {
    let contract = new Contract(contractAddr, abi, PROVIDER);
    const privateKey = PK_SK_MAP.get(vendorAddr);
    if (!privateKey) return;
    const wallet = new Wallet(privateKey, PROVIDER);

    await (contract.connect(wallet) as Contract).submitCommitment(
        openingValue,
        gateNum,
        gateFlat,
        values,
        version,
        currAcc,
        proof1,
        proof2,
        proof3,
        proofExt
    );
}

export async function submitCommitmentLeft(
    openingValue: string,
    gateNum: number,
    gateFlat: number[],
    values: Uint8Array[],
    version: number,
    currAcc: Uint8Array,
    proof1: Uint8Array[][],
    proof2: Uint8Array[][],
    proofExt: Uint8Array[][],
    vendorAddr: string,
    contractAddr: string
) {
    let contract = new Contract(contractAddr, abi, PROVIDER);
    const privateKey = PK_SK_MAP.get(vendorAddr);
    if (!privateKey) return;
    const wallet = new Wallet(privateKey, PROVIDER);

    await (contract.connect(wallet) as Contract).submitCommitmentLeft(
        openingValue,
        gateNum,
        gateFlat,
        values,
        version,
        currAcc,
        proof1,
        proof2,
        proofExt
    );
}

export async function submitCommitmentRight(
    proof: Uint8Array[][],
    vendorAddr: string,
    contractAddr: string
) {
    let contract = new Contract(contractAddr, abi, PROVIDER);
    const privateKey = PK_SK_MAP.get(vendorAddr);
    if (!privateKey) return;
    const wallet = new Wallet(privateKey, PROVIDER);

    await (contract.connect(wallet) as Contract).submitCommitmentRight(proof);
}

export async function finishDispute(
    state: number,
    requesterAddr: string,
    contractAddr: string
) {
    let contract = new Contract(contractAddr, abi, PROVIDER);
    const privateKey = PK_SK_MAP.get(requesterAddr);
    if (!privateKey) return;
    const wallet = new Wallet(privateKey, PROVIDER);

    if (state == 5) {
        await (contract.connect(wallet) as Contract).completeDispute();
    } else if (state == 6) {
        await (contract.connect(wallet) as Contract).cancelDispute();
    }
}

export async function endDisputeTimeout(
    contractAddr: string,
    requesterAddr: string
) {
    if (!isAddress(contractAddr)) return;

    const contract = new Contract(contractAddr, abi, PROVIDER);
    const state = await contract.currState();
    const privateKey = PK_SK_MAP.get(requesterAddr);
    if (!privateKey) return;
    const wallet = new Wallet(privateKey, PROVIDER);

    if ([0, 5].includes(Number(state))) {
        await (contract.connect(wallet) as Contract).completeDispute();
        return true;
    } else if (state != 7) {
        await (contract.connect(wallet) as Contract).cancelDispute();
        return false;
    } else {
        throw Error("Cannot end dispute when it is already over");
    }
}

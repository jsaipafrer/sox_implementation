import { abi as oAbi, bytecode } from "./contracts/OptimisticSOX.json";
import { abi as dAbi } from "./contracts/DisputeSOX.json";
import { PK_SK_MAP, PROVIDER } from "./config";
import {
    Contract,
    ContractFactory,
    Wallet,
    isAddress,
    parseEther,
} from "ethers";

export async function deployOptimisticContract(
    pkBuyer: string,
    pkVendor: string,
    price: number,
    completionTip: number,
    disputeTip: number,
    timeoutIncrement: number,
    commitment: string,
    numBlocks: number,
    numGates: number,
    sponsorAddr: string
): Promise<string> {
    const factory = new ContractFactory(oAbi, bytecode);

    const privateKey = PK_SK_MAP.get(sponsorAddr);
    if (!privateKey) return "ERROR";

    const wallet = new Wallet(privateKey, PROVIDER);

    const contract = await factory
        .connect(wallet)
        .deploy(
            pkBuyer,
            pkVendor,
            price,
            completionTip,
            disputeTip,
            timeoutIncrement,
            commitment,
            numBlocks,
            numGates,
            { value: parseEther("1") }
        );
    await contract.waitForDeployment();
    return await contract.getAddress();
}

export async function getOptimisticState(contractAddr: string) {
    if (!isAddress(contractAddr)) return;

    const contract = new Contract(contractAddr, oAbi, PROVIDER);
    return await contract.currState().catch(() => {});
}

export async function getNextOptimisticTimeout(contractAddr: string) {
    if (!isAddress(contractAddr)) return;

    const contract = new Contract(contractAddr, oAbi, PROVIDER);
    return await contract.nextTimeoutTime().catch(() => {});
}

export async function getBasicInfo(
    contractAddr: string,
    withDispute?: boolean
) {
    if (!isAddress(contractAddr)) return;
    let contract = new Contract(contractAddr, oAbi, PROVIDER);
    let key = await contract.key();

    if (withDispute) {
        let disputeAddr = await contract.disputeContract();
        contract = new Contract(disputeAddr, dAbi, PROVIDER);
    }

    return {
        state: await contract.currState(),
        key: key,
        nextTimeout: await contract.nextTimeoutTime(),
        commitment: await contract.commitment(),
    };
}

export async function getDetails(contractAddr: string) {
    if (!isAddress(contractAddr)) return;
    const contract = new Contract(contractAddr, oAbi, PROVIDER);

    console.log(await contract.currState());
    return {
        state: await contract.currState(),
        key: await contract.key(),
        nextTimeout: await contract.nextTimeoutTime(),
        buyer: await contract.buyer(),
        vendor: await contract.vendor(),
        sponsor: await contract.sponsor(),
        bSponsor: await contract.buyerDisputeSponsor(),
        vSponsor: await contract.vendorDisputeSponsor(),
        completionTip: await contract.completionTip(),
        disputeTip: await contract.disputeTip(),
        sponsorDeposit: await contract.sponsorDeposit(),
        buyerDeposit: await contract.buyerDeposit(),
        bSponsorDeposit: await contract.sbDeposit(),
        vSponsorDeposit: await contract.svDeposit(),
        commitment: await contract.commitment(),
        numBlocks: await contract.numBlocks(),
        numGates: await contract.numGates(),
    };
}

export async function sendPayment(
    payerAddr: string,
    contractAddr: string,
    amount: number
) {
    const contract = new Contract(contractAddr, oAbi, PROVIDER);
    const privateKey = PK_SK_MAP.get(payerAddr);
    if (!privateKey) return;

    const wallet = new Wallet(privateKey, PROVIDER);
    return await (contract.connect(wallet) as Contract).sendPayment({
        value: amount,
    });
}

export async function sendKey(
    vendorAddr: string,
    contractAddr: string,
    key: string
) {
    const contract = new Contract(contractAddr, oAbi, PROVIDER);
    const privateKey = PK_SK_MAP.get(vendorAddr);
    if (!privateKey) return;

    const wallet = new Wallet(privateKey, PROVIDER);
    return await (contract.connect(wallet) as Contract).sendKey(key);
}

export async function sendSbFee(sbAddr: string, contractAddr: string) {
    const contract = new Contract(contractAddr, oAbi, PROVIDER);
    const privateKey = PK_SK_MAP.get(sbAddr);
    if (!privateKey) return;

    const wallet = new Wallet(privateKey, PROVIDER);
    return await (
        contract.connect(wallet) as Contract
    ).sendBuyerDisputeSponsorFee({ value: BigInt(100000n) }); // TODO SET AMOUNT
}

export async function sendSvFee(svAddr: string, contractAddr: string) {
    const contract = new Contract(contractAddr, oAbi, PROVIDER);
    const privateKey = PK_SK_MAP.get(svAddr);
    if (!privateKey) return;

    console.log(privateKey);
    const wallet = new Wallet(privateKey, PROVIDER);
    await (contract.connect(wallet) as Contract).sendVendorDisputeSponsorFee({
        value: BigInt(100000n),
    }); // TODO SET AMOUNT

    return await contract.disputeContract();
}

export async function startDispute(sponsorAddr: string, contractAddr: string) {
    const contract = new Contract(contractAddr, oAbi, PROVIDER);
    const privateKey = PK_SK_MAP.get(sponsorAddr);
    if (!privateKey) return;

    const wallet = new Wallet(privateKey, PROVIDER);
    await (contract.connect(wallet) as Contract).startDispute();

    return await contract.disputeContract();
}

export async function endOptimisticTimeout(
    contractAddr: string,
    requesterAddr: string
) {
    if (!isAddress(contractAddr)) return;

    const contract = new Contract(contractAddr, oAbi, PROVIDER);
    const state = await contract.currState();
    const privateKey = PK_SK_MAP.get(requesterAddr);
    if (!privateKey) return;
    const wallet = new Wallet(privateKey, PROVIDER);

    if (state == 2n) {
        await (contract.connect(wallet) as Contract).completeTransaction();
        return true;
    } else if (state != 4n && state != 5n) {
        await (contract.connect(wallet) as Contract).cancelTransaction();
        return false;
    } else {
        throw Error("Cannot end transaction when in dispute or already over");
    }
}

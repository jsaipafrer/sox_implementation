import { abi, bytecode } from "./contracts/OptimisticSOX.json";
import { PK_SK_MAP, PROVIDER, SPONSOR_WALLET } from "./config";
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

export async function getState(contractAddr: string) {
    if (!isAddress(contractAddr)) return;

    const contract = new Contract(contractAddr, abi, PROVIDER);
    return await contract.currState().catch(() => {});
}

export async function getBasicInfo(contractAddr: string) {
    if (!isAddress(contractAddr)) return;
    const contract = new Contract(contractAddr, abi, PROVIDER);

    return {
        state: await contract.currState(),
        key: await contract.key(),
        nextTimeout: await contract.nextTimeoutTime(),
    };
}

export async function getDetails(contractAddr: string) {
    if (!isAddress(contractAddr)) return;
    const contract = new Contract(contractAddr, abi, PROVIDER);

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
    };
}

export async function sendPayment(
    payerAddr: string,
    contractAddr: string,
    amount: number
) {
    const contract = new Contract(contractAddr, abi, PROVIDER);
    const privateKey = PK_SK_MAP.get(payerAddr);
    if (!privateKey) return;

    const wallet = new Wallet(privateKey, PROVIDER);
    return await (contract.connect(wallet) as Contract).sendPayment({
        value: amount,
    });
}

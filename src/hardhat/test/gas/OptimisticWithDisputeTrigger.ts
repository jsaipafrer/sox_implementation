import hre from "hardhat";
import "@nomicfoundation/hardhat-chai-matchers";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { commit } from "../../../app/lib/commitment";
import { deployRealContracts } from "../deployers";

const { ethers } = hre;

const NB_RUNS = 100;

/*
··························································································································
|  Solidity and Network Configuration                                                                                    │
·····································|·················|················|················|································
|  Solidity: 0.8.28                  ·  Optim: true    ·  Runs: 2000    ·  viaIR: true   ·     Block: 30,000,000 gas     │
·····································|·················|················|················|································
|  Network: ETHEREUM                 ·  L1: 1 gwei                      ·                ·        2607.04 usd/eth        │
·····································|·················|················|················|················|···············
|  Contracts / Methods               ·  Min            ·  Max           ·  Avg           ·  # calls       ·  usd (avg)   │
·····································|·················|················|················|················|···············
|  OptimisticSOX                     ·                                                                                   │
·····································|·················|················|················|················|···············
|      registerBuyerDisputeSponsor   ·              -  ·             -  ·        82,560  ·           100  ·        0.22  │
·····································|·················|················|················|················|···············
|      registerVendorDisputeSponsor  ·              -  ·             -  ·        83,132  ·           100  ·        0.22  │
·····································|·················|················|················|················|···············
|      sendBuyerDisputeSponsorFee    ·              -  ·             -  ·        58,434  ·           100  ·        0.15  │
·····································|·················|················|················|················|···············
|      sendKey                       ·              -  ·             -  ·        59,010  ·           100  ·        0.15  │
·····································|·················|················|················|················|···············
|      sendPayment                   ·              -  ·             -  ·       101,564  ·           100  ·        0.26  │
·····································|·················|················|················|················|···············
|      sendVendorDisputeSponsorFee   ·              -  ·             -  ·        58,390  ·           100  ·        0.15  │
·····································|·················|················|················|················|···············
|      startDispute                  ·              -  ·             -  ·     2,193,946  ·           100  ·        5.72  │
·····································|·················|················|················|················|···············
|  Deployments                                         ·                                 ·  % of limit    ·              │
·····································|·················|················|················|················|···············
|  AccumulatorVerifier               ·              -  ·             -  ·       546,499  ·         1.8 %  ·        1.42  │
·····································|·················|················|················|················|···············
|  CircuitEvaluator                  ·              -  ·             -  ·     1,552,476  ·         5.2 %  ·        4.05  │
·····································|·················|················|················|················|···············
|  CommitmentVerifier                ·              -  ·             -  ·       238,137  ·         0.8 %  ·        0.62  │
·····································|·················|················|················|················|···············
|  DisputeDeployer                   ·      2,390,386  ·     2,390,482  ·     2,390,474  ·           8 %  ·        6.23  │
·····································|·················|················|················|················|···············
|  OptimisticSOX                     ·      1,474,421  ·     1,474,433  ·     1,474,432  ·         4.9 %  ·        3.84  │
·····································|·················|················|················|················|···············
|  Key                                                                                                                   │
··························································································································
|  ◯  Execution gas for this method does not include intrinsic gas overhead                                              │
··························································································································
|  △  Cost was non-zero but below the precision setting for the currency display (see options)                           │
··························································································································
|  Toolchain:  hardhat                                                                                                   │
··························································································································
*/

let buyer: HardhatEthersSigner;
let vendor: HardhatEthersSigner;
let sponsor: HardhatEthersSigner;
let buyerDisputeSponsor: HardhatEthersSigner;
let vendorDisputeSponsor: HardhatEthersSigner;

before(async function () {
    [buyer, vendor, sponsor, buyerDisputeSponsor, vendorDisputeSponsor] =
        await ethers.getSigners();
});

describe("OptimisticSOX", function () {
    it("End-to-end optimistic + dispute, only optimistic", async function () {
        for (let i = 0; i < NB_RUNS; ++i) {
            const {
                contract,
                sponsorAmount,
                agreedPrice,
                completionTip,
                disputeTip,
                timeoutIncrement,
                disputeDeployer,
                accumulatorVerifier,
                circuitEvaluator,
                commitmentVerifier,
            } = await deployRealContracts(sponsor, buyer, vendor);

            // buyer sends payment
            await contract
                .connect(buyer)
                .sendPayment({ value: agreedPrice + completionTip });

            // vendor sends key
            await contract.connect(vendor).sendKey(ethers.toUtf8Bytes("key"));

            // buyer registers its dispute sponsor
            await contract
                .connect(buyer)
                .registerBuyerDisputeSponsor(buyerDisputeSponsor, {
                    value: disputeTip,
                });

            // sb deposits dispute fees
            await contract
                .connect(buyerDisputeSponsor)
                .sendBuyerDisputeSponsorFee({ value: 10n });

            // vendor registers its dispute sponsor
            await contract
                .connect(vendor)
                .registerVendorDisputeSponsor(vendorDisputeSponsor, {
                    value: disputeTip,
                });

            // sv deposits dispute fees
            await contract
                .connect(vendorDisputeSponsor)
                .sendVendorDisputeSponsorFee({ value: 10n });

            // sb starts the dispute
            const numBlocks = 100n;
            const numGates = 401n;
            const commitment = commit(
                ethers.toUtf8Bytes("commitment data"),
                ethers.toUtf8Bytes("commitment key")
            );
            await contract.connect(buyerDisputeSponsor).startDispute();

            // TODO Impersonate dispute contract and end the dispute
            /*const disputeContractAddr = await contract.disputeContract();
            await hre.network.provider.request({
                method: "hardhat_impersonateAccount",
                params: [disputeContractAddr],
            });
            await network.provider.send("hardhat_setBalance", [
                disputeContractAddr,
                "0xfde0b6b3a7640000",
            ]);

            const disputeSigner = await ethers.getSigner(disputeContractAddr);

            await contract.connect(disputeSigner).endDispute();

            await hre.network.provider.request({
                method: "hardhat_stopImpersonatingAccount",
                params: [],
            });*/
        }
    });
});

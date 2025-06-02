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
·····································|··················|···············|················|································
|  Solidity: 0.8.28                  ·  Optim: false    ·  Runs: 200    ·  viaIR: true   ·     Block: 30,000,000 gas     │
·····································|··················|···············|················|································
|  Network: ETHEREUM                 ·  L1: 1 gwei                      ·                ·        2559.44 usd/eth        │
·····································|··················|···············|················|················|···············
|  Contracts / Methods               ·  Min             ·  Max          ·  Avg           ·  # calls       ·  usd (avg)   │
·····································|··················|···············|················|················|···············
|  OptimisticSOX                     ·                                                                                   │
·····································|··················|···············|················|················|···············
|      registerBuyerDisputeSponsor   ·               -  ·            -  ·        84,928  ·           100  ·        0.22  │
·····································|··················|···············|················|················|···············
|      registerVendorDisputeSponsor  ·               -  ·            -  ·        85,456  ·           100  ·        0.22  │
·····································|··················|···············|················|················|···············
|      sendBuyerDisputeSponsorFee    ·               -  ·            -  ·        60,304  ·           100  ·        0.15  │
·····································|··················|···············|················|················|···············
|      sendKey                       ·               -  ·            -  ·        60,799  ·           100  ·        0.16  │
·····································|··················|···············|················|················|···············
|      sendPayment                   ·               -  ·            -  ·       104,465  ·           100  ·        0.27  │
·····································|··················|···············|················|················|···············
|      sendVendorDisputeSponsorFee   ·               -  ·            -  ·        60,260  ·           100  ·        0.15  │
·····································|··················|···············|················|················|···············
|      startDispute                  ·               -  ·            -  ·     3,605,503  ·           100  ·        9.23  │
·····································|··················|···············|················|················|···············
|  Deployments                                          ·                                ·  % of limit    ·              │
·····································|··················|···············|················|················|···············
|  AccumulatorVerifier               ·               -  ·            -  ·     1,127,352  ·         3.8 %  ·        2.89  │
·····································|··················|···············|················|················|···············
|  CircuitEvaluator                  ·               -  ·            -  ·     3,717,581  ·        12.4 %  ·        9.51  │
·····································|··················|···············|················|················|···············
|  CommitmentVerifier                ·               -  ·            -  ·       406,656  ·         1.4 %  ·        1.04  │
·····································|··················|···············|················|················|···············
|  DisputeDeployer                   ·       4,309,719  ·    4,309,815  ·     4,309,807  ·        14.4 %  ·       11.03  │
·····································|··················|···············|················|················|···············
|  OptimisticSOX                     ·       2,317,803  ·    2,317,815  ·     2,317,814  ·         7.7 %  ·        5.93  │
·····································|··················|···············|················|················|···············
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
            await contract
                .connect(buyerDisputeSponsor)
                .startDispute(numBlocks, numGates, commitment);

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

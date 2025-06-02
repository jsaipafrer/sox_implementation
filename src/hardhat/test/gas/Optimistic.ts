import { time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import "@nomicfoundation/hardhat-chai-matchers";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { commit } from "../../../app/lib/commitment";
import { deployRealContracts } from "../deployers";

const { ethers } = hre;

const NB_RUNS = 100;

/*
·················································································································
|  Solidity and Network Configuration                                                                           │
····························|··················|···············|················|································
|  Solidity: 0.8.28         ·  Optim: false    ·  Runs: 200    ·  viaIR: true   ·     Block: 30,000,000 gas     │
····························|··················|···············|················|································
|  Network: ETHEREUM        ·  L1: 1 gwei                      ·                ·        2559.44 usd/eth        │
····························|··················|···············|················|················|···············
|  Contracts / Methods      ·  Min             ·  Max          ·  Avg           ·  # calls       ·  usd (avg)   │
····························|··················|···············|················|················|···············
|  OptimisticSOX            ·                                                                                   │
····························|··················|···············|················|················|···············
|      completeTransaction  ·               -  ·            -  ·        62,406  ·           100  ·        0.16  │
····························|··················|···············|················|················|···············
|      sendKey              ·               -  ·            -  ·        60,799  ·           100  ·        0.16  │
····························|··················|···············|················|················|···············
|      sendPayment          ·               -  ·            -  ·       104,465  ·           100  ·        0.27  │
····························|··················|···············|················|················|···············
|  Deployments                                 ·                                ·  % of limit    ·              │
····························|··················|···············|················|················|···············
|  AccumulatorVerifier      ·               -  ·            -  ·     1,127,352  ·         3.8 %  ·        2.89  │
····························|··················|···············|················|················|···············
|  CircuitEvaluator         ·               -  ·            -  ·     3,717,581  ·        12.4 %  ·        9.51  │
····························|··················|···············|················|················|···············
|  CommitmentVerifier       ·               -  ·            -  ·       406,656  ·         1.4 %  ·        1.04  │
····························|··················|···············|················|················|···············
|  DisputeDeployer          ·       4,309,599  ·    4,309,815  ·     4,309,801  ·        14.4 %  ·       11.03  │
····························|··················|···············|················|················|···············
|  OptimisticSOX            ·       2,317,803  ·    2,317,815  ·     2,317,814  ·         7.7 %  ·        5.93  │
····························|··················|···············|················|················|···············
|  Key                                                                                                          │
·················································································································
|  ◯  Execution gas for this method does not include intrinsic gas overhead                                     │
·················································································································
|  △  Cost was non-zero but below the precision setting for the currency display (see options)                  │
·················································································································
|  Toolchain:  hardhat                                                                                          │
·················································································································

*/

let buyer: HardhatEthersSigner;
let vendor: HardhatEthersSigner;
let sponsor: HardhatEthersSigner;

before(async function () {
    [buyer, vendor, sponsor] = await ethers.getSigners();
});

describe("OptimisticSOX", function () {
    it("End-to-end optimistic, no dispute", async function () {
        for (let i = 0; i < NB_RUNS; ++i) {
            const { contract, agreedPrice, completionTip, timeoutIncrement } =
                await deployRealContracts(sponsor, buyer, vendor);

            // buyer sends payment
            await contract
                .connect(buyer)
                .sendPayment({ value: agreedPrice + completionTip });

            // vendor sends key
            await contract.connect(vendor).sendKey(ethers.toUtf8Bytes("key"));

            // "wait" for timeout
            await time.increase(timeoutIncrement + 5n);

            // vendor asks to complete contract
            await contract.connect(vendor).completeTransaction();
        }
    });
});

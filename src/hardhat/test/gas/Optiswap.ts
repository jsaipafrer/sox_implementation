import { time } from "@nomicfoundation/hardhat-network-helpers";
import hre from "hardhat";
import "@nomicfoundation/hardhat-chai-matchers";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { getRandomValues } from "crypto";

const { ethers } = hre;

const NB_RUNS = 100;

/*
·············································································································
|  Solidity and Network Configuration                                                                       │
························|·················|················|················|································
|  Solidity: 0.8.28     ·  Optim: true    ·  Runs: 1000    ·  viaIR: true   ·     Block: 30,000,000 gas     │
························|·················|················|················|································
|  Network: ETHEREUM    ·  L1: 0.30597 gwei                ·                ·        4592.75 usd/eth        │
························|·················|················|················|················|···············
|  Contracts / Methods  ·  Min            ·  Max           ·  Avg           ·  # calls       ·  usd (avg)   │
························|·················|················|················|················|···············
|  fileSaleOptimistic   ·                                                                                   │
························|·················|················|················|················|···············
|      accept           ·              -  ·             -  ·        33,648  ·           100  ·        0.05  │
························|·················|················|················|················|···············
|      noComplain       ·              -  ·             -  ·        35,435  ·           100  ·        0.05  │
························|·················|················|················|················|···············
|      revealKey        ·              -  ·             -  ·        58,725  ·           100  ·        0.08  │
························|·················|················|················|················|···············
|  Deployments                            ·                                 ·  % of limit    ·              │
························|·················|················|················|················|···············
|  fileSaleOptimistic   ·              -  ·             -  ·       645,964  ·         2.2 %  ·        0.91  │
························|·················|················|················|················|···············
|  Key                                                                                                      │
·············································································································
|  ◯  Execution gas for this method does not include intrinsic gas overhead                                 │
·············································································································
|  △  Cost was non-zero but below the precision setting for the currency display (see options)              │
·············································································································
|  Toolchain:  hardhat                                                                                      │
·············································································································
*/

let buyer: HardhatEthersSigner;
let vendor: HardhatEthersSigner;
let sponsor: HardhatEthersSigner;

before(async function () {
    [buyer, vendor, sponsor] = await ethers.getSigners();
});

describe("Optiswap", function () {
    it("", async function () {
        for (let i = 0; i < NB_RUNS; ++i) {
            const fac = await ethers.getContractFactory("fileSaleOptimistic");
            const rSOX = await fac.connect(vendor).deploy();
            await rSOX.waitForDeployment();

            // buyer sends payment
            await rSOX.connect(buyer).accept({ value: 1000n });

            // vendor sends key
            await rSOX
                .connect(vendor)
                .revealKey(
                    ethers.toUtf8Bytes("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")
                );

            // vendor asks to complete contract
            await rSOX.connect(buyer).noComplain();
        }
    });
});

import hre from "hardhat";
import "@nomicfoundation/hardhat-chai-matchers";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { commit } from "../../../app/lib/commitment";
import { deployRealContracts } from "../deployers";
import { acc, prove, proveExt } from "../../../app/lib/accumulator";
import {
    compileBasicCircuit,
    compileSHAOnlyCircuit,
} from "../../../app/lib/circuits/compilator";
import { circuitToBytesArray } from "../../../app/lib/helpers";
import { evaluateCircuit } from "../../../app/lib/circuits/evaluator";

const { ethers } = hre;

const NB_RUNS = 1;

/*
··························································································································
|  Solidity and Network Configuration                                                                                    │
·····································|··················|···············|················|································
|  Solidity: 0.8.28                  ·  Optim: false    ·  Runs: 200    ·  viaIR: true   ·     Block: 30,000,000 gas     │
·····································|··················|···············|················|································
|  Network: ETHEREUM                 ·  L1: 3 gwei                      ·                ·        2674.33 usd/eth        │
·····································|··················|···············|················|················|···············
|  Contracts / Methods               ·  Min             ·  Max          ·  Avg           ·  # calls       ·  usd (avg)   │
·····································|··················|···············|················|················|···············
|  DisputeSOX                        ·                                                                                   │
·····································|··················|···············|················|················|···············
|      giveOpinion                   ·          51,863  ·       56,825  ·        52,381  ·           160  ·        0.42  │
·····································|··················|···············|················|················|···············
|      respondChallenge              ·               -  ·            -  ·        62,822  ·           160  ·        0.50  │
·····································|··················|···············|················|················|···············
|      submitCommitment              ·               -  ·            -  ·     1,054,496  ·            10  ·        8.46  │
·····································|··················|···············|················|················|···············
|  OptimisticSOX                     ·                                                                                   │
·····································|··················|···············|················|················|···············
|      registerBuyerDisputeSponsor   ·               -  ·            -  ·        84,928  ·            10  ·        0.68  │
·····································|··················|···············|················|················|···············
|      registerVendorDisputeSponsor  ·               -  ·            -  ·        85,456  ·            10  ·        0.69  │
·····································|··················|···············|················|················|···············
|      sendBuyerDisputeSponsorFee    ·               -  ·            -  ·        60,304  ·            10  ·        0.48  │
·····································|··················|···············|················|················|···············
|      sendKey                       ·               -  ·            -  ·        60,799  ·            10  ·        0.49  │
·····································|··················|···············|················|················|···············
|      sendPayment                   ·               -  ·            -  ·       104,465  ·            10  ·        0.84  │
·····································|··················|···············|················|················|···············
|      sendVendorDisputeSponsorFee   ·               -  ·            -  ·        60,260  ·            10  ·        0.48  │
·····································|··················|···············|················|················|···············
|      startDispute                  ·               -  ·            -  ·     3,605,503  ·            10  ·       28.93  │
·····································|··················|···············|················|················|···············
|  Deployments                                          ·                                ·  % of limit    ·              │
·····································|··················|···············|················|················|···············
|  AccumulatorVerifier               ·               -  ·            -  ·     1,127,352  ·         3.8 %  ·        9.04  │
·····································|··················|···············|················|················|···············
|  CircuitEvaluator                  ·               -  ·            -  ·     3,583,354  ·        11.9 %  ·       28.75  │
·····································|··················|···············|················|················|···············
|  CommitmentVerifier                ·               -  ·            -  ·       406,656  ·         1.4 %  ·        3.26  │
·····································|··················|···············|················|················|···············
|  DisputeDeployer                   ·       4,309,719  ·    4,309,815  ·     4,309,803  ·        14.4 %  ·       34.58  │
·····································|··················|···············|················|················|···············
|  OptimisticSOX                     ·       2,317,791  ·    2,317,803  ·     2,317,802  ·         7.7 %  ·       18.60  │
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

describe("End-to-end", function () {
    it("End-to-end with 2^16 ct blocks", async function () {
        const numBlocks = 1 << 8;
        const circuit = compileBasicCircuit(numBlocks);
        const circuitBytes = circuitToBytesArray(circuit.circuit);
        const hCircuit = acc(circuitBytes);

        console.log(numBlocks);
        console.log(circuit.circuit.length);

        const ct = [];
        for (let i = 0; i < numBlocks; ++i) ct.push(new Uint8Array(64));
        circuit.constants[0] = new Uint8Array(32);
        const [, values] = await evaluateCircuit(ct, circuit);
        const hCt = acc(ct);

        const commitment = commit(hCircuit, hCt);

        for (let i = 0; i < NB_RUNS; ++i) {
            const {
                contract: optimisticContract,
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
            await optimisticContract
                .connect(buyer)
                .sendPayment({ value: agreedPrice + completionTip });

            // vendor sends key
            await optimisticContract
                .connect(vendor)
                .sendKey(ethers.toUtf8Bytes("key"));

            // buyer registers its dispute sponsor
            await optimisticContract
                .connect(buyer)
                .registerBuyerDisputeSponsor(buyerDisputeSponsor, {
                    value: disputeTip,
                });

            // sb deposits dispute fees
            await optimisticContract
                .connect(buyerDisputeSponsor)
                .sendBuyerDisputeSponsorFee({ value: 10n });

            // vendor registers its dispute sponsor
            await optimisticContract
                .connect(vendor)
                .registerVendorDisputeSponsor(vendorDisputeSponsor, {
                    value: disputeTip,
                });

            // sv deposits dispute fees
            await optimisticContract
                .connect(vendorDisputeSponsor)
                .sendVendorDisputeSponsorFee({ value: 10n });

            // sb starts the dispute
            await optimisticContract
                .connect(buyerDisputeSponsor)
                .startDispute(
                    numBlocks,
                    BigInt(circuit.circuit.length),
                    commitment
                );

            const disputeContractAddr =
                await optimisticContract.disputeContract();
            const disputeContract = await ethers.getContractAt(
                "DisputeSOX",
                disputeContractAddr
            );

            // do challenge-response until we get to state WaitVendorData
            // buyer responds to challenge
            let challenge = await disputeContract.chall();
            let hpre = acc(values.slice(numBlocks, Number(challenge)));
            await disputeContract.connect(buyer).respondChallenge(hpre);

            // vendor disagrees once
            await disputeContract.connect(vendor).giveOpinion(false);

            // continue doing the same but now vendor agrees
            let state = await disputeContract.currState();
            while (state == 0n) {
                // buyer responds to challenge
                challenge = await disputeContract.chall();
                hpre = acc(values.slice(numBlocks, Number(challenge)));
                await disputeContract.connect(buyer).respondChallenge(hpre);

                // vendor decides randomly if they agree or not
                await disputeContract.connect(vendor).giveOpinion(true);
                state = await disputeContract.currState();
            }

            // challenge-response is over, should be in state WaitVendorData
            if (state != 2n) throw new Error("unexpected state, should be 2");

            // vendor submits its commitment and the proofs
            let sInL = [];
            let sNotInLMinusM = [];
            const hCircuitCt: [Uint8Array, Uint8Array] = [hCircuit, hCt];
            const gateNum = await disputeContract.a();
            const gate = circuit.circuit[Number(gateNum)].flat();

            for (let i = 1; i < gate.length; ++i) {
                if (gate[i] <= numBlocks) {
                    sInL.push(gate[i]);
                } else {
                    sNotInLMinusM.push(gate[i] - numBlocks);
                }
            }

            let submissionValues = [];
            for (let i = 1; i < gate.length; ++i) {
                submissionValues.push(values[gate[i]]);
            }

            // FIXME check indices !!
            const version = 0n;
            const currAcc = acc(circuitBytes.slice(numBlocks, Number(gateNum)));
            const proof1 = prove(circuitBytes, [Number(gateNum)]);
            const proof2 = prove(ct, sInL);
            const proof3 = prove(
                values.slice(numBlocks, Number(gateNum)),
                sNotInLMinusM
            );
            const proofExt = proveExt(values.slice(numBlocks, Number(gateNum)));

            await disputeContract
                .connect(vendor)
                .submitCommitment(
                    hCircuitCt,
                    gateNum,
                    gate,
                    submissionValues,
                    version,
                    currAcc,
                    proof1,
                    proof2,
                    proof3,
                    proofExt
                );
        }
    });
});

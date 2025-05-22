import hre from "hardhat";
import "@nomicfoundation/hardhat-chai-matchers";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { commit } from "../../../src/app/lib/commitment";
import { deployDisputeWithMockOptimistic } from "../deployers";
import { compileSHAOnlyCircuit } from "../../../src/app/lib/circuits/compilator";
import { acc, prove, proveExt } from "../../../src/app/lib/accumulator";
import { circuitToBytesArray } from "../../../src/app/lib/helpers";
import { evaluateCircuit } from "../../../src/app/lib/circuits/evaluator";

const { ethers } = hre;

const NB_RUNS = 10;

/*
ONLY 10 RUNS!!!
··············································································································
|  Solidity and Network Configuration                                                                        │
·························|··················|···············|················|································
|  Solidity: 0.8.28      ·  Optim: false    ·  Runs: 200    ·  viaIR: true   ·     Block: 30,000,000 gas     │
·························|··················|···············|················|································
|  Network: ETHEREUM     ·  L1: 0.99323 gwei                ·                ·        2524.98 usd/eth        │
·························|··················|···············|················|················|···············
|  Contracts / Methods   ·  Min             ·  Max          ·  Avg           ·  # calls       ·  usd (avg)   │
·························|··················|···············|················|················|···············
|  DisputeSOX            ·                                                                                   │
·························|··················|···············|················|················|···············
|      giveOpinion       ·          51,863  ·       56,825  ·        52,381  ·           160  ·        0.13  │
·························|··················|···············|················|················|···············
|      respondChallenge  ·               -  ·            -  ·        62,822  ·           160  ·        0.16  │
·························|··················|···············|················|················|···············
|      submitCommitment  ·               -  ·            -  ·     1,054,496  ·            10  ·        2.64  │
·························|··················|···············|················|················|···············
|  Deployments                              ·                                ·  % of limit    ·              │
·························|··················|···············|················|················|···············
|  AccumulatorVerifier   ·               -  ·            -  ·     1,127,352  ·         3.8 %  ·        2.83  │
·························|··················|···············|················|················|···············
|  CircuitEvaluator      ·               -  ·            -  ·     3,583,354  ·        11.9 %  ·        8.99  │
·························|··················|···············|················|················|···············
|  CommitmentVerifier    ·               -  ·            -  ·       406,656  ·         1.4 %  ·        1.02  │
·························|··················|···············|················|················|···············
|  DisputeSOX            ·       3,883,193  ·    3,883,289  ·     3,883,275  ·        12.9 %  ·        9.74  │
·························|··················|···············|················|················|···············
|  MockOptimisticSOX     ·               -  ·            -  ·       505,595  ·         1.7 %  ·        1.27  │
·························|··················|···············|················|················|···············
|  Key                                                                                                       │
··············································································································
|  ◯  Execution gas for this method does not include intrinsic gas overhead                                  │
··············································································································
|  △  Cost was non-zero but below the precision setting for the currency display (see options)               │
··············································································································
|  Toolchain:  hardhat                                                                                       │
··············································································································
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

describe("DisputeSOX", function () {
    it("Only the dispute, ciphertext of 2^16 blocks with only sha256", async function () {
        const numBlocks = 1 << 16;
        const circuit = compileSHAOnlyCircuit(numBlocks);
        const circuitBytes = circuitToBytesArray(circuit.circuit);
        const hCircuit = acc(circuitBytes);

        const ct = [];
        for (let i = 0; i < numBlocks; ++i) ct.push(new Uint8Array(64));
        circuit.constants[0] = new Uint8Array(32);
        const [circuitRes, values] = await evaluateCircuit(ct, circuit);
        const hCt = acc(ct);

        const commitment = commit(hCircuit, hCt);

        for (let i = 0; i < NB_RUNS; ++i) {
            console.log(`run ${i}`);
            const {
                contract,
                agreedPrice,
                timeoutIncrement,
                accumulatorVerifier,
                circuitEvaluator,
                commitmentVerifier,
                optimistic,
            } = await deployDisputeWithMockOptimistic(
                BigInt(numBlocks),
                BigInt(circuit.circuit.length),
                commitment,
                buyer,
                vendor,
                buyerDisputeSponsor,
                vendorDisputeSponsor
            );

            /*
                ChallengeBuyer,
                WaitVendorOpinion,
                WaitVendorData,
                WaitVendorDataLeft,
                WaitVendorDataRight,
                Complete,
                Cancel,
                End
            */

            // do challenge-response until we get to state WaitVendorData
            // buyer responds to challenge
            let challenge = await contract.chall();
            let hpre = acc(values.slice(numBlocks, Number(challenge)));
            await contract.connect(buyer).respondChallenge(hpre);

            // vendor disagrees once
            await contract.connect(vendor).giveOpinion(false);

            // continue doing the same but now vendor agrees
            let state = await contract.currState();
            while (state == 0n) {
                // buyer responds to challenge
                challenge = await contract.chall();
                hpre = acc(values.slice(numBlocks, Number(challenge)));
                await contract.connect(buyer).respondChallenge(hpre);

                // vendor decides randomly if they agree or not
                await contract.connect(vendor).giveOpinion(true);
                state = await contract.currState();
            }

            // challenge-response is over, should be in state WaitVendorData
            if (state != 2n) throw new Error("unexpected state, should be 2");

            // vendor submits its commitment and the proofs
            let sInL = [];
            let sNotInLMinusM = [];
            const hCircuitCt: [Uint8Array, Uint8Array] = [hCircuit, hCt];
            const gateNum = await contract.a();
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

            await contract
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

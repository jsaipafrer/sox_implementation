import hre from "hardhat";
import "@nomicfoundation/hardhat-chai-matchers";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { deployDisputeWithMockOptimistic } from "../deployers";
import { readFile } from "node:fs/promises";
import {
    bytes_to_hex,
    compute_precontract_values,
    compute_proofs,
    evaluate_circuit,
    hpre,
    initSync,
} from "../../../app/lib/circuits/wasm/circuits";

const { ethers } = hre;

const NB_RUNS = 100;

/*
for num_blocks == 2**16
··············································································································
|  Solidity and Network Configuration                                                                        │
·························|·················|················|················|································
|  Solidity: 0.8.28      ·  Optim: true    ·  Runs: 1000    ·  viaIR: true   ·     Block: 30,000,000 gas     │
·························|·················|················|················|································
|  Network: ETHEREUM     ·  L1: 10 gwei                     ·                ·        2613.07 usd/eth        │
·························|·················|················|················|················|···············
|  Contracts / Methods   ·  Min            ·  Max           ·  Avg           ·  # calls       ·  usd (avg)   │
·························|·················|················|················|················|···············
|  DisputeSOX            ·                                                                                   │
·························|·················|················|················|················|···············
|      giveOpinion       ·         48,606  ·        53,132  ·        48,923  ·          1700  ·        1.28  │
·························|·················|················|················|················|···············
|      respondChallenge  ·         60,680  ·        60,692  ·        60,691  ·          1700  ·        1.59  │
·························|·················|················|················|················|···············
|      submitCommitment  ·              -  ·             -  ·       159,775  ·           100  ·        4.18  │
·························|·················|················|················|················|···············
|  Deployments                             ·                                 ·  % of limit    ·              │
·························|·················|················|················|················|···············
|  AccumulatorVerifier   ·              -  ·             -  ·       540,226  ·         1.8 %  ·       14.12  │
·························|·················|················|················|················|···············
|  CircuitEvaluator      ·              -  ·             -  ·     1,489,876  ·           5 %  ·       38.93  │
·························|·················|················|················|················|···············
|  CommitmentOpener      ·              -  ·             -  ·       176,168  ·         0.6 %  ·        4.60  │
·························|·················|················|················|················|···············
|  DisputeSOX            ·      2,227,124  ·     2,227,244  ·     2,227,234  ·         7.4 %  ·       58.20  │
·························|·················|················|················|················|···············
|  MockOptimisticSOX     ·              -  ·             -  ·       333,710  ·         1.1 %  ·        8.72  │
·························|·················|················|················|················|···············
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
        const module = await readFile(
            "../../../app/lib/circuits/wasm/circuits_bg.wasm"
        );
        initSync({ module: module });

        const fileBlocks = 1 << 16;
        const file = new Uint8Array(fileBlocks * 64);
        const key = new Uint8Array(16);

        const {
            ct,
            circuit_bytes,
            description,
            h_ct,
            h_circuit,
            commitment,
            num_blocks,
            num_gates,
        } = compute_precontract_values(file, key);

        const evaluated_bytes = evaluate_circuit(
            circuit_bytes,
            ct,
            [bytes_to_hex(key)],
            bytes_to_hex(description)
        ).to_bytes();

        for (let i = 0; i < NB_RUNS; ++i) {
            console.log(`run ${i}`);
            const {
                contract,
                agreedPrice,
                timeoutIncrement,
                accumulatorVerifier,
                circuitEvaluator,
                commitmentOpener,
                optimistic,
            } = await deployDisputeWithMockOptimistic(
                BigInt(num_blocks),
                BigInt(num_gates),
                commitment.c,
                buyer,
                vendor,
                buyerDisputeSponsor,
                vendorDisputeSponsor
            );

            // do challenge-response until we get to state WaitVendorData
            // buyer responds to challenge
            let challenge = await contract.chall();
            let hpre_res = hpre(evaluated_bytes, num_blocks, Number(challenge));
            await contract.connect(buyer).respondChallenge(hpre_res);

            // vendor disagrees once
            await contract.connect(vendor).giveOpinion(false);

            // continue doing the same but now vendor agrees
            let state = await contract.currState();
            while (state == 0n) {
                // buyer responds to challenge
                challenge = await contract.chall();
                hpre_res = hpre(evaluated_bytes, num_blocks, Number(challenge));
                await contract.connect(buyer).respondChallenge(hpre_res);

                // vendor decides randomly if they agree or not
                await contract.connect(vendor).giveOpinion(true);
                state = await contract.currState();
            }

            // challenge-response is over, should be in state WaitVendorData
            if (state != 2n) throw new Error("unexpected state, should be 2");

            // vendor submits its commitment and the proofs
            const gateNum = await contract.a();

            const {
                gate,
                values,
                curr_acc,
                proof1,
                proof2,
                proof3,
                proof_ext,
            } = compute_proofs(
                circuit_bytes,
                evaluated_bytes,
                ct,
                Number(gateNum)
            );

            await contract
                .connect(vendor)
                .submitCommitment(
                    commitment.o,
                    gateNum,
                    gate,
                    values,
                    0n,
                    curr_acc,
                    proof1 as Uint8Array[][],
                    proof2 as Uint8Array[][],
                    proof3 as Uint8Array[][],
                    proof_ext as Uint8Array[][]
                );
        }
    });
});

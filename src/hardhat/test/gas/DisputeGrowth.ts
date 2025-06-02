import hre from "hardhat";
import "@nomicfoundation/hardhat-chai-matchers";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { commit } from "../../../app/lib/commitment";
import { deployDisputeWithMockOptimistic } from "../deployers";
import {
    CompiledCircuit,
    compileBasicCircuit,
    compileSHAOnlyCircuit,
} from "../../../app/lib/circuits/compilator";
import { acc, prove, proveExt } from "../../../app/lib/accumulator";
import { circuitToBytesArray } from "../../../app/lib/helpers";
import { evaluateCircuit } from "../../../app/lib/circuits/evaluator";

const { ethers } = hre;

/*
Number of challenge-response calls:
======================== m = 2^1 ========================
For 2 ct blocks and 5 gates (n = O(m)), needed 2 challenge-response calls
For 2 ct blocks and 4 gates (n = O(m^2)), needed 2 challenge-response calls
For 2 ct blocks and 8 gates (n = O(m^3)), needed 3 challenge-response calls

======================== m = 2^2 ========================
For 4 ct blocks and 9 gates (n = O(m)), needed 2 challenge-response calls
For 4 ct blocks and 16 gates (n = O(m^2)), needed 3 challenge-response calls
For 4 ct blocks and 64 gates (n = O(m^3)), needed 5 challenge-response calls

======================== m = 2^3 ========================
For 8 ct blocks and 17 gates (n = O(m)), needed 3 challenge-response calls
For 8 ct blocks and 64 gates (n = O(m^2)), needed 5 challenge-response calls
For 8 ct blocks and 512 gates (n = O(m^3)), needed 8 challenge-response calls

======================== m = 2^4 ========================
For 16 ct blocks and 33 gates (n = O(m)), needed 4 challenge-response calls
For 16 ct blocks and 256 gates (n = O(m^2)), needed 7 challenge-response calls
For 16 ct blocks and 4096 gates (n = O(m^3)), needed 11 challenge-response calls

======================== m = 2^5 ========================
For 32 ct blocks and 65 gates (n = O(m)), needed 5 challenge-response calls
For 32 ct blocks and 1024 gates (n = O(m^2)), needed 9 challenge-response calls
For 32 ct blocks and 32768 gates (n = O(m^3)), needed 14 challenge-response calls

======================== m = 2^6 ========================
For 64 ct blocks and 129 gates (n = O(m)), needed 6 challenge-response calls
For 64 ct blocks and 4096 gates (n = O(m^2)), needed 11 challenge-response calls
For 64 ct blocks and 262144 gates (n = O(m^3)), needed 17 challenge-response calls

======================== m = 2^7 ========================
For 128 ct blocks and 257 gates (n = O(m)), needed 7 challenge-response calls
For 128 ct blocks and 16384 gates (n = O(m^2)), needed 13 challenge-response calls
For 128 ct blocks and 2097152 gates (n = O(m^3)), needed 20 challenge-response calls

======================== m = 2^8 ========================
For 256 ct blocks and 513 gates (n = O(m)), needed 8 challenge-response calls
For 256 ct blocks and 65536 gates (n = O(m^2)), needed 15 challenge-response calls
n = O(m^3) resulted in heap overflow

======================== m = 2^9 ========================
For 512 ct blocks and 1025 gates (n = O(m)), needed 9 challenge-response calls
For 512 ct blocks and 262144 gates (n = O(m^2)), needed 17 challenge-response calls
n = O(m^3) resulted in heap overflow


    CONCLUSION: NUMBER OF CHALLENGE-RESPONSES NEEDED GROWS WITH O(log n)
*/

/*
    Gas cost of challenge-response: 50k-55k gas for `giveOpinion`
                                    + 62-63k gas for `respondChallenge`
 */

let buyer: HardhatEthersSigner;
let vendor: HardhatEthersSigner;
let sponsor: HardhatEthersSigner;
let buyerDisputeSponsor: HardhatEthersSigner;
let vendorDisputeSponsor: HardhatEthersSigner;

function compileLinearCircuit(ctBlocksNumber: number): CompiledCircuit {
    // produces a circuit of size n = O(m) (smallest possible size)
    // in this case, n = 4*m + 1
    return compileSHAOnlyCircuit(ctBlocksNumber);
}

function compileQuadraticCircuit(ctBlocksNumber: number): CompiledCircuit {
    // produces a circuit of size O(m^2)
    // in this case, n = m^2 + m
    // each dummy gate has m sons which are just copies of the ct

    const circuit = new Array(ctBlocksNumber * ctBlocksNumber);

    // dummy gates
    let i = 0;
    for (; i < ctBlocksNumber; ++i) circuit[i] = [-1, []];

    // for each dummy gate, copy the full ct
    for (let j = 0; j < ctBlocksNumber; ++j) {
        for (; i < ctBlocksNumber + j * ctBlocksNumber; ++i) {
            circuit[i] = [6, [i - j * ctBlocksNumber]];
        }
    }

    return {
        circuit,
        constants: [],
        version: 0,
    };
}

function compileCubicCircuit(ctBlocksNumber: number): CompiledCircuit {
    // produces a circuit of size O(m^3)
    // in this case, n = m^3 + m
    // each dummy gate has m sons which are just copies of the ct

    const circuit = new Array(ctBlocksNumber * ctBlocksNumber * ctBlocksNumber);

    // dummy gates
    let i = 0;
    for (; i < ctBlocksNumber; ++i) circuit[i] = [-1, []];

    // for the remaining gates, just concat with nothing
    for (; i < circuit.length; ++i) circuit[i] = [6, []];

    return {
        circuit,
        constants: [],
        version: 0,
    };
}

before(async function () {
    [buyer, vendor, sponsor, buyerDisputeSponsor, vendorDisputeSponsor] =
        await ethers.getSigners();
});

describe("Growth of dispute complexity in terms of number of ct blocks and circuit size", function () {
    it("Only the dispute, ciphertext of 2^i blocks with only sha256", async function () {
        const i = 8;
        for (let i = 0; i < 15; ++i) {
            console.log(
                `======================== m = 2^${i} ========================`
            );
            const numBlocks = 1 << i;
            const ct = [];
            for (let i = 0; i < numBlocks; ++i) ct.push(new Uint8Array(64));
            const hCt = acc(ct);

            let circuit = compileLinearCircuit(numBlocks);
            let circuitBytes = circuitToBytesArray(circuit.circuit);
            circuit.constants[2] = new Uint8Array(16); // key
            circuit.constants[3] = new Uint8Array(32); // description (hash)

            let hCircuit = acc(circuitBytes);

            let [, values] = await evaluateCircuit(ct, circuit);

            let commitment = commit(hCircuit, hCt);

            const { contract } = await deployDisputeWithMockOptimistic(
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

            let numChallengeResponse = 0;
            // do challenge-response until we get to state WaitVendorData
            // buyer responds to challenge
            let challenge = await contract.chall();
            let hpre = acc(values.slice(numBlocks, Number(challenge)));
            await contract.connect(buyer).respondChallenge(hpre);

            // vendor disagrees once
            await contract.connect(vendor).giveOpinion(false);
            ++numChallengeResponse;

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
                ++numChallengeResponse;
            }

            // challenge-response is over, should be in state WaitVendorData
            if (state != 2n) throw new Error("unexpected state, should be 2");

            console.log(
                `For ${numBlocks} ct blocks and ${circuit.circuit.length} gates (O(m)), needed ${numChallengeResponse} challenge-response calls`
            );
        }
    });
});

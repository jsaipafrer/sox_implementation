import hre from "hardhat";
import "@nomicfoundation/hardhat-chai-matchers";
import { readFile } from "node:fs/promises";
import __wbg_init, {
    initSync,
    sha256_with_circuit_padding,
    encrypt_and_append_iv,
    compile_basic_circuit,
    acc_ct,
    acc_circuit,
} from "../../../app/lib/circuits/wasm/circuits";
import { writeFileSync } from "node:fs";

const { ethers } = hre;
const TMP_DIR = "./tmp";

// async function time_precontract(tmp_dir: string) {
//     const module = await readFile(
//         "../src/app/lib/circuits/wasm/circuits_bg.wasm"
//     );
//     initSync({ module: module });

//     let num_blocks = 1 << 16;

//     let block_size = 64;
//     let key = new Uint8Array(16);
//     let file: Uint8Array | undefined = new Uint8Array(num_blocks * block_size);

//     console.log(
//         "Vendor precontract computations (description, ct, circuit, ct_blocks)"
//     );
//     const start = performance.now();

//     const desc = sha256_with_circuit_padding(file);
//     const ct = encrypt_and_append_iv(key, file, block_size);
//     const circuit = compile_basic_circuit(ct.length - 1, desc);
//     const h_ct = acc_ct(ct, block_size);
//     const h_circuit = acc_circuit(circuit);

//     const end = performance.now();
//     console.log(`\tTook ${end - start} ms`);

//     writeFileSync(`${tmp_dir}/file.enc`, ct);
//     writeFileSync(`${tmp_dir}/circuit.bin`, circuit.to_bytes());

//     return { time: end - start, desc, h_ct, h_circuit };
// }

// const NB_RUNS = 1;

// /*
// ··························································································································
// |  Solidity and Network Configuration                                                                                    │
// ·····································|··················|···············|················|································
// |  Solidity: 0.8.28                  ·  Optim: false    ·  Runs: 200    ·  viaIR: true   ·     Block: 30,000,000 gas     │
// ·····································|··················|···············|················|································
// |  Network: ETHEREUM                 ·  L1: 3 gwei                      ·                ·        2674.33 usd/eth        │
// ·····································|··················|···············|················|················|···············
// |  Contracts / Methods               ·  Min             ·  Max          ·  Avg           ·  # calls       ·  usd (avg)   │
// ·····································|··················|···············|················|················|···············
// |  DisputeSOX                        ·                                                                                   │
// ·····································|··················|···············|················|················|···············
// |      giveOpinion                   ·          51,863  ·       56,825  ·        52,381  ·           160  ·        0.42  │
// ·····································|··················|···············|················|················|···············
// |      respondChallenge              ·               -  ·            -  ·        62,822  ·           160  ·        0.50  │
// ·····································|··················|···············|················|················|···············
// |      submitCommitment              ·               -  ·            -  ·     1,054,496  ·            10  ·        8.46  │
// ·····································|··················|···············|················|················|···············
// |  OptimisticSOX                     ·                                                                                   │
// ·····································|··················|···············|················|················|···············
// |      registerBuyerDisputeSponsor   ·               -  ·            -  ·        84,928  ·            10  ·        0.68  │
// ·····································|··················|···············|················|················|···············
// |      registerVendorDisputeSponsor  ·               -  ·            -  ·        85,456  ·            10  ·        0.69  │
// ·····································|··················|···············|················|················|···············
// |      sendBuyerDisputeSponsorFee    ·               -  ·            -  ·        60,304  ·            10  ·        0.48  │
// ·····································|··················|···············|················|················|···············
// |      sendKey                       ·               -  ·            -  ·        60,799  ·            10  ·        0.49  │
// ·····································|··················|···············|················|················|···············
// |      sendPayment                   ·               -  ·            -  ·       104,465  ·            10  ·        0.84  │
// ·····································|··················|···············|················|················|···············
// |      sendVendorDisputeSponsorFee   ·               -  ·            -  ·        60,260  ·            10  ·        0.48  │
// ·····································|··················|···············|················|················|···············
// |      startDispute                  ·               -  ·            -  ·     3,605,503  ·            10  ·       28.93  │
// ·····································|··················|···············|················|················|···············
// |  Deployments                                          ·                                ·  % of limit    ·              │
// ·····································|··················|···············|················|················|···············
// |  AccumulatorVerifier               ·               -  ·            -  ·     1,127,352  ·         3.8 %  ·        9.04  │
// ·····································|··················|···············|················|················|···············
// |  CircuitEvaluator                  ·               -  ·            -  ·     3,583,354  ·        11.9 %  ·       28.75  │
// ·····································|··················|···············|················|················|···············
// |  CommitmentVerifier                ·               -  ·            -  ·       406,656  ·         1.4 %  ·        3.26  │
// ·····································|··················|···············|················|················|···············
// |  DisputeDeployer                   ·       4,309,719  ·    4,309,815  ·     4,309,803  ·        14.4 %  ·       34.58  │
// ·····································|··················|···············|················|················|···············
// |  OptimisticSOX                     ·       2,317,791  ·    2,317,803  ·     2,317,802  ·         7.7 %  ·       18.60  │
// ·····································|··················|···············|················|················|···············
// |  Key                                                                                                                   │
// ··························································································································
// |  ◯  Execution gas for this method does not include intrinsic gas overhead                                              │
// ··························································································································
// |  △  Cost was non-zero but below the precision setting for the currency display (see options)                           │
// ··························································································································
// |  Toolchain:  hardhat                                                                                                   │
// ··························································································································
// */

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
        let enc_res: EncryptionResult;
        {
            console.log(
                "Compute precontract constants (description, h_ct, h_circuit, commitment)"
            );
            let start = performance.now();
            // description = sha256_with_circuit_padding(file);
            // ct_blocks = split_blocks(
            //     encrypt_and_append_iv(key, file, block_size),
            //     block_size
            // );
            // console.log("huh");
            // // file = undefined;

            // h_ct = acc(ct_blocks);
            // let circuit_bytes: Uint8Array[] | undefined =
            //     compile_basic_circuit(num_blocks).to_js_bytes_array();
            // num_gates = circuit_bytes.length + ct_blocks.length;
            // h_circuit = acc(circuit_bytes);
            // circuit_bytes = undefined;

            // commitment = commit(h_circuit, h_ct);
            enc_res = encrypt_and_compute_description(file, key, block_size);
            description = enc_res.description;
            // ct_blocks = enc_res.ct_blocks;

            console.log("\tencryption done");

            let comp_res = compute_precontract_info(enc_res);
            console.log("\tprecontract done");
            h_ct = comp_res.h_ct;
            h_circuit = comp_res.h_circuit;
            commitment = comp_res.commitment;
            num_gates = comp_res.num_gates;
            enc_res = comp_res.encryption_res;

            let end = performance.now();
            console.log(`\tTook ${end - start} ms`);
            vendorTotal += end - start;
        }
        console.log(enc_res);

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
            } = await deployRealContracts(
                sponsor,
                buyer,
                vendor,
                num_gates,
                num_blocks,
                commitment
            );

            // console.log("got here");
            // buyer sends payment
            await optimisticContract
                .connect(buyer)
                .sendPayment({ value: agreedPrice + completionTip });

            // console.log("got here2");

            // vendor sends key
            await optimisticContract.connect(vendor).sendKey(key);

            // console.log("got here3");

            // buyer registers its dispute sponsor
            await optimisticContract
                .connect(buyer)
                .registerBuyerDisputeSponsor(buyerDisputeSponsor, {
                    value: disputeTip,
                });

            // console.log("got here4");

            // sb deposits dispute fees
            await optimisticContract
                .connect(buyerDisputeSponsor)
                .sendBuyerDisputeSponsorFee({ value: 10n });

            // console.log("got here5");

            // vendor registers its dispute sponsor
            await optimisticContract
                .connect(vendor)
                .registerVendorDisputeSponsor(vendorDisputeSponsor, {
                    value: disputeTip,
                });

            // console.log("got here6");

            // sv deposits dispute fees
            await optimisticContract
                .connect(vendorDisputeSponsor)
                .sendVendorDisputeSponsorFee({ value: 10n });

            // console.log("got here7");

            // sb starts the dispute
            await optimisticContract
                .connect(buyerDisputeSponsor)
                .startDispute();

            // console.log("got here8");

            const disputeContractAddr =
                await optimisticContract.disputeContract();
            const disputeContract = await ethers.getContractAt(
                "DisputeSOX",
                disputeContractAddr
            );

            // console.log("got here9");

            // do challenge-response until we get to state WaitVendorData
            // buyer responds to challenge
            let challenge = await disputeContract.chall();

            let valuesBuyer: Uint8Array[];
            {
                console.log("Buyer evaluates the circuit");
                let start = performance.now();
                let constants = [key, description];
                let eval_res = evaluate_circuit(
                    enc_res,
                    compile_basic_circuit(num_blocks).bind_missing_constants_js(
                        constants
                    )
                );
                valuesBuyer = eval_res.values;
                enc_res = eval_res.encryption_res;
                let end = performance.now();
                console.log(`\tCircuit evaluation took ${end - start} ms`);
                buyerTotal += end - start;

                console.log(
                    `Buyer computes hpre(${Number(challenge)}) with acc`
                );
                start = performance.now();
                let hpre = acc(
                    valuesBuyer.slice(num_blocks, Number(challenge))
                );
                end = performance.now();
                console.log(`\thpre computation took ${end - start} ms`);
                buyerTotal += end - start;
                await disputeContract.connect(buyer).respondChallenge(hpre);
            }

            // console.log("got here10");
            // vendor disagrees once
            let valuesVendor: Uint8Array[];
            {
                console.log("Vendor evaluates circuit to check argument");
                let start = performance.now();
                let constants = [key, description];
                let eval_res = evaluate_circuit(
                    enc_res,
                    compile_basic_circuit(num_blocks).bind_missing_constants_js(
                        constants
                    )
                );
                valuesVendor = eval_res.values;
                enc_res = eval_res.encryption_res;
                let hpreVendor = acc(
                    valuesVendor.slice(num_blocks, Number(challenge))
                );
                let end = performance.now();
                console.log(
                    `\tcircuit eval + argument check took ${end - start} ms`
                );
            }
            await disputeContract.connect(vendor).giveOpinion(false);

            // continue doing the same but now vendor agrees
            let state = await disputeContract.currState();
            while (state == 0n) {
                // buyer responds to challenge
                challenge = await disputeContract.chall();

                {
                    console.log(
                        `Buyer computes hpre(${Number(challenge)}) with acc`
                    );
                    let start = performance.now();
                    let hpre = acc(
                        valuesBuyer.slice(num_blocks, Number(challenge))
                    );
                    let end = performance.now();
                    console.log(`\thpre computation took ${end - start} ms`);
                    buyerTotal += end - start;
                    await disputeContract.connect(buyer).respondChallenge(hpre);
                }

                {
                    console.log("Vendor checks argument");
                    let start = performance.now();
                    let hpre = acc(
                        valuesVendor.slice(num_blocks, Number(challenge))
                    );
                    let end = performance.now();
                    console.log(`\targument check took ${end - start} ms`);
                    await disputeContract.connect(vendor).giveOpinion(true);
                    state = await disputeContract.currState();
                }
            }
            // console.log("got here11");

            // challenge-response is over, should be in state WaitVendorData
            if (state != 2n) throw new Error("unexpected state, should be 2");

            // vendor submits its commitment and the proofs
            let circuit;
            let gateNum;
            let gate;
            let submissionValues = [];
            let sInL = [];
            let sNotInLMinusM = [];
            {
                console.log(
                    "Vendor computes circuit to and splits sons according to set L"
                );
                circuit = compile_basic_circuit(num_blocks);
                let start = performance.now();
                gateNum = await disputeContract.a();
                gate = circuit.get_gate(Number(gateNum) - num_blocks);

                for (let s of gate.sons) {
                    if (s >= num_gates) continue;

                    if (s <= num_blocks) {
                        sInL.push(s);
                    } else {
                        sNotInLMinusM.push(s - num_blocks);
                    }
                    submissionValues.push(valuesVendor[s]);
                }
                let end = performance.now();
                console.log(`\tcompilation + split took ${end - start} ms`);
            }

            // FIXME check indices !!
            const version = 0n;

            let currAcc;
            let proof1;
            let proof2;
            let proof3;
            let proofExt;
            {
                console.log(
                    "Vendor converts circuit to bytes and computes the proofs"
                );
                let start = performance.now();
                let circuit_bytes = circuit.to_js_bytes_array();
                circuit = undefined;
                let end = performance.now();
                console.log(`\tcircuit conversion took ${end - start} ms`);
                vendorTotal += end - start;

                start = performance.now();
                currAcc = acc(circuit_bytes.slice(num_blocks, Number(gateNum)));
                end = performance.now();
                console.log(`\tvendor acc took ${end - start} ms`);
                vendorTotal += end - start;

                start = performance.now();
                proof1 = prove(
                    circuit_bytes,
                    new Uint32Array([Number(gateNum)])
                );
                end = performance.now();
                console.log(`\tprove1 took ${end - start} ms`);
                vendorTotal += end - start;

                start = performance.now();
                // proof2 = prove(ct_blocks, new Uint32Array(sInL));
                proof2 = [[]]; // FIXME
                end = performance.now();
                console.log(`\tprove2 took ${end - start} ms`);
                vendorTotal += end - start;
                // console.log("got here14");

                start = performance.now();
                proof3 = prove(
                    valuesVendor.slice(num_blocks, Number(gateNum)),
                    new Uint32Array(sNotInLMinusM)
                );
                end = performance.now();
                console.log(`\tprove3 took ${end - start} ms`);
                vendorTotal += end - start;

                start = performance.now();
                proofExt = prove_ext(
                    valuesVendor.slice(num_blocks, Number(gateNum))
                );
                end = performance.now();
                console.log(`\tproveExt took ${end - start} ms`);
                vendorTotal += end - start;
            }

            const nonConstantSons = gate.sons.filter((s) => s < num_gates);

            console.log("Vendor submitting the commitment");
            let start = performance.now();
            await disputeContract
                .connect(vendor)
                .submitCommitment(
                    [h_circuit, h_ct],
                    gateNum,
                    [gate.opcode, ...nonConstantSons],
                    submissionValues,
                    version,
                    currAcc,
                    proof1,
                    proof2,
                    proof3,
                    proofExt
                );
            let end = performance.now();
            console.log(`\tsubmitCommitment took ${end - start} ms`);
            vendorTotal += end - start;

            console.log("------------------------------------------");
            console.log(`total vendor: ${vendorTotal} ms`);
            console.log(`total buyer: ${buyerTotal} ms`);
        }
    });
});

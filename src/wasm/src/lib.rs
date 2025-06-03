mod aes_ctr;
mod sha256;
mod simple_operations;
mod encryption;
mod commitment;
mod accumulator;

use std::cmp::min;
use alloy_sol_types::private::bytes;
use wasm_bindgen::prelude::*;
use js_sys::Uint8Array;
use serde::{Deserialize, Serialize};
use rmp_serde::{encode::write, decode::from_read};
use alloy_sol_types::SolValue;
use rand::RngCore;
use crate::accumulator::{acc_circuit, acc_ct, acc, prove_ext, prove};
use crate::commitment::{commit_internal, hex_to_bytes, bytes_to_hex, open_commitment_internal, commit_hashes, Commitment};
use crate::encryption::{decrypt, encrypt_and_prepend_iv};
use crate::sha256::sha256;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

fn split_ct_blocks(ct: &[u8], block_size: usize) -> Vec<Vec<u8>> {
    let mut res = vec![ct[..16].to_vec()]; // IV

    for i in (16..ct.len()).step_by(block_size) {
        let end = min(i + block_size, ct.len());
        res.push(ct[i..end].to_vec());
    }

    res
}

// 2^31 in 32b systems, 2^63 on 64b
const USIZE_MSB: usize = !(usize::MAX >> 1);

type Instruction = fn(data: &Vec<&Vec<u8>>) -> Vec<u8>;

fn version_instructions(version: usize) -> Vec<Instruction> {
    match version {
        0 => {
            vec![
                sha256::sha256_compress,
                aes_ctr::encrypt_block,
                aes_ctr::decrypt_block,
                simple_operations::binary_add,
                simple_operations::binary_mult,
                simple_operations::equal,
                simple_operations::concat_bytes,
                sha256::sha256_compress_final,
            ]
        },
        _ => vec![]
    }
}

#[wasm_bindgen]
#[derive(Serialize, Deserialize, Clone)]
pub struct Gate {
    pub opcode: usize,

    #[wasm_bindgen(getter_with_clone)]
    pub sons: Vec<usize>
}

impl Gate {
    pub fn flatten(&self) -> Vec<usize> {
        let mut res = Vec::with_capacity(1 + self.sons.len());
        res.push(self.opcode);
        res.extend(self.sons.clone());

        res
    }
}

#[wasm_bindgen]
#[derive(Serialize, Deserialize, Clone)]
pub struct Circuit {
    gates: Vec<Gate>
}

#[wasm_bindgen]
#[derive(Serialize, Deserialize, Clone)]
pub struct CompiledCircuit {
    circuit: Circuit,
    constants: Vec<Option<Vec<u8>>>,
    version: usize,
    block_size: usize,
}

#[wasm_bindgen]
impl CompiledCircuit {
    pub fn bind_missing_constants_js(&self, constants: Vec<Uint8Array>) -> CompiledCircuitWithConstants {
        let mut all_constants = Vec::with_capacity(self.constants.len());
        let mut i = 0;

        for c in &self.constants {
            if let Some(val) = c {
                all_constants.push(val.to_owned());
            } else {
                all_constants.push(constants[i].to_vec());
                i += 1;
            }
        }

        self.bind_constants(all_constants)
    }

    pub fn to_bytes(&self) -> Vec<u8> {
        let mut buf = Vec::new();
        write(&mut buf, self).unwrap();
        buf
    }

    pub fn from_bytes(bytes: &[u8]) -> CompiledCircuit {
        from_read(bytes).unwrap()
    }

    pub fn get_gate(&self, i: usize) -> Gate {
        self.circuit.gates[i].clone()
    }
}

impl CompiledCircuit {
    pub fn bind_constants(&self, constants: Vec<Vec<u8>>) -> CompiledCircuitWithConstants {
        CompiledCircuitWithConstants {
            circuit: self.circuit.clone(),
            constants,
            version: self.version,
            block_size: self.block_size
        }
    }

    pub fn bind_missing_constants(&self, constants: Vec<Vec<u8>>) -> CompiledCircuitWithConstants {
        let mut all_constants = Vec::with_capacity(self.constants.len());
        let mut i = 0;

        for c in &self.constants {
            if let Some(val) = c {
                all_constants.push(val.to_owned());
            } else {
                all_constants.push(constants[i].to_owned());
                i += 1;
            }
        }

        self.bind_constants(all_constants)
    }

    pub fn to_bytes_array(&self) -> Vec<Vec<u8>> {
        let mut res = vec![self.version.to_be_bytes().to_vec()];
        for g in &self.circuit.gates {
            let mut buf = Vec::new();
            write(&mut buf, g).unwrap();
            res.push(buf);
        }

        for c in &self.constants {
            let mut buf = Vec::new();
            write(&mut buf, c).unwrap();
            res.push(buf);
        }

        res
    }
}

fn array_idx_to_constant_idx(array_idx: usize) -> usize {
    USIZE_MSB | array_idx
}

fn constant_idx_to_array_idx(constant_idx: usize) -> usize {
    USIZE_MSB ^ constant_idx
}

fn is_constant_idx(idx: usize) -> bool {
    USIZE_MSB & idx != 0
}

fn compile_basic_circuit_one_block(ct_size: usize, description: &[u8], block_size: usize) -> CompiledCircuit {
    let mut gates: Vec<Gate> = Vec::with_capacity(5);

    // dummy gates
    gates.push(Gate { opcode: usize::MAX, sons: vec![] });
    gates.push(Gate { opcode: usize::MAX, sons: vec![] });

    // AES decryption gate
    gates.push(Gate {
        opcode: 2,
        sons: vec![
            array_idx_to_constant_idx(3),   // key
            1, // blocks to encrypt
            0, // counter
        ]
    });

    // SHA + pad gate
    gates.push(Gate {
        opcode: 7,
        sons: vec![
            2,  // block to hash
            array_idx_to_constant_idx(2),  // ciphertext size
        ]
    });

    // comparison gate
    gates.push(Gate {
        opcode: 5,
        sons: vec![
            3,
            array_idx_to_constant_idx(1)
        ]
    });

    CompiledCircuit {
        circuit: Circuit { gates },
        constants: vec![
            Some(4usize.to_be_bytes().to_vec()),  // counter increment
            Some(description.to_vec()),                   // description
            Some((ct_size - 16).to_be_bytes().to_vec()),      // size of the plaintext
            None,                                         // key placeholder
        ],
        version: 0,
        block_size
    }
}

// ct_size INCLUDES THE IV!!!
#[wasm_bindgen]
pub fn compile_basic_circuit(ct_size: usize, description: &[u8]) -> CompiledCircuit {
    let block_size = 64;
    let pt_size = ct_size - 16; // remove the size of the iv
    let ct_blocks_number =
        1  // iv
            + pt_size / block_size // number of blocks of the plaintext
            + if pt_size % block_size == 0 { 0 } else { 1 }; // ceiling
    println!("{}", ct_size);
    if ct_blocks_number < 2 {
        panic!("The ciphertext's length should be at least 17 bytes (incl. IV)");
    }

    if ct_blocks_number == 2 {
        // special case of 1 block of data
        return compile_basic_circuit_one_block(ct_size, description, block_size);
    }

    // m dummy gates
    // + m-2 addition gates for incrementing the counter before AES (from 2nd one)
    // + m-1 AES-CTR gates
    // + m-1 SHA compression gates
    // + 1 comparison gate
    // = 4m - 3 gates in total
    let mut gates: Vec<Gate> = Vec::with_capacity(4*ct_blocks_number - 3);

    // dummy gates
    for _ in 0..ct_blocks_number {
        gates.push(Gate { opcode: usize::MAX, sons: vec![] });
    }

    // counter increment gates
    // first one points to the IV
    gates.push(Gate {
        opcode: 3,
        sons: vec![
            0, // previous counter value
            array_idx_to_constant_idx(0) // value to add
        ]
    });
    for i in ct_blocks_number..(2 * ct_blocks_number - 3) {
        gates.push(Gate {
            opcode: 3,
            sons: vec![
                i, // previous counter value
                array_idx_to_constant_idx(0) // value to add
            ]
        });
    }

    // AES decryption gates
    // First one uses the IV as counter
    gates.push(Gate {
        opcode: 2,
        sons: vec![
            array_idx_to_constant_idx(3),   // key
            1, // blocks to encrypt
            0, // counter
        ]
    });
    for i in 2..ct_blocks_number {
        gates.push(Gate {
            opcode: 2,
            sons: vec![
                array_idx_to_constant_idx(3),   // key
                i, // blocks to encrypt
                i + ct_blocks_number - 2, // counter
            ]
        });
    }

    // SHA256 compression gates, first one doesn't have a previous hash
    gates.push(Gate {
        opcode: 0,
        sons: vec![2*ct_blocks_number - 2] // only current block
    });
    for i in (3*ct_blocks_number-2)..(4*ct_blocks_number-5) {
        gates.push(Gate {
            opcode: 0,
            sons: vec![
                i - 1, // previous hash
                i - ct_blocks_number + 1 // current block
            ]
        });
    }
    // last SHA256 compression gate does the padding as well
    gates.push(Gate {
        opcode: 7,
        sons: vec![
            4*ct_blocks_number - 6, // previous hash
            3*ct_blocks_number - 4,  // block to hash
            array_idx_to_constant_idx(2),  // plaintext size
        ]
    });


    // final comparison gate
    gates.push(Gate {
        opcode: 5,
        sons: vec![
            4*ct_blocks_number - 5,
            array_idx_to_constant_idx(1)
        ]
    });

    CompiledCircuit {
        circuit: Circuit { gates },
        constants: vec![
            Some(4u16.to_be_bytes().to_vec()),            // counter increment
            Some(description.to_vec()),                   // description
            Some(pt_size.to_be_bytes().to_vec()),      // size of the ciphertext
            None,                                         // key placeholder
        ],
        version: 0,
        block_size
    }
}

fn usize_to_bytes_array(mut n: usize, length: usize) -> Vec<u8> {
    let mut res = Vec::with_capacity(length);

    for _ in 0..length {
        if n == 0 {
            res.push(0);
            continue;
        }
        res.push((n & 0xff) as u8);
        n >>= 8;
    }

    res.reverse();
    res
}

// ============================= EVALUATION =============================

#[wasm_bindgen]
pub struct CompiledCircuitWithConstants {
    circuit: Circuit,
    constants: Vec<Vec<u8>>,
    version: usize,
    block_size: usize,
}

// TODO ERROR HANDLING
fn get_evaluated_sons<'a>(
    gate: &Gate,
    evaluated_circuit: &'a Vec<Vec<u8>>,
    constants: &'a Vec<Vec<u8>>) -> Vec<&'a Vec<u8>> {
    let mut sons = Vec::with_capacity(gate.sons.len());

    for &s in &gate.sons {
        if !is_constant_idx(s) {
            sons.push(&evaluated_circuit[s]);
        } else if !constants.is_empty() {
            sons.push(&constants[constant_idx_to_array_idx(s)]);
        }
    }

    sons
}

pub fn evaluate_circuit_internal(input: &[Vec<u8>], compiled_circuit: CompiledCircuitWithConstants)
                                 -> Vec<Vec<u8>>{
    let instructions = version_instructions(compiled_circuit.version);

    let mut evaluated_circuit: Vec<Vec<u8>> = Vec::with_capacity(compiled_circuit.circuit.gates.len());

    for i in 0..input.len() {
        if compiled_circuit.circuit.gates[i].opcode != usize::MAX {
            log(&format!("The ciphertext is too large, the number of blocks for the cipher text in this circuit should be {}", i));
            panic!();
        }
        evaluated_circuit.push(input[i].clone());
    }

    for gate in &compiled_circuit.circuit.gates[input.len()..] {
        if gate.opcode == usize::MAX {
            log("The ciphertext is too small");
            panic!();
        }
        let sons = get_evaluated_sons(gate, &evaluated_circuit, &compiled_circuit.constants);

        let op = instructions[gate.opcode];
        evaluated_circuit.push(op(&sons))
    }

    evaluated_circuit
}

// ========================================================================================================================================

// ####################################
// ###     PRECONTRACT VENDOR       ###
// ####################################

#[wasm_bindgen]
pub struct Precontract {
    #[wasm_bindgen(getter_with_clone)]
    pub ct: Vec<u8>,

    #[wasm_bindgen(getter_with_clone)]
    pub circuit_bytes: Vec<u8>,

    #[wasm_bindgen(getter_with_clone)]
    pub description: Vec<u8>,

    #[wasm_bindgen(getter_with_clone)]
    pub h_ct: Vec<u8>,

    #[wasm_bindgen(getter_with_clone)]
    pub h_circuit: Vec<u8>,

    #[wasm_bindgen(getter_with_clone)]
    pub commitment: Commitment,

    pub num_blocks: usize,
    pub num_gates: usize,
}

#[wasm_bindgen]
pub fn compute_precontract_values(file: &mut [u8], key: &[u8]) -> Precontract {
    let description = sha256(file);
    let ct = encrypt_and_prepend_iv(file, key);
    let circuit = compile_basic_circuit(ct.len(), &description);
    let num_blocks = ct.len() / circuit.block_size + if ct.len() % circuit.block_size == 0 { 0 } else { 1 };
    let num_gates = circuit.circuit.gates.len();
    let circuit_bytes = circuit.to_bytes();
    let h_ct = acc_ct(&ct, circuit.block_size);
    let h_circuit = acc_circuit(circuit);
    let commitment = commit_hashes(&h_circuit, &h_ct);

    Precontract {
        ct,
        circuit_bytes,
        description,
        h_ct,
        h_circuit,
        commitment,
        num_blocks,
        num_gates,
    }
}

// ####################################
// ###    BUYER PRECONTRACT CHECK   ###
// ####################################

#[wasm_bindgen]
pub struct CheckPrecontractResult {
    pub success: bool,

    #[wasm_bindgen(getter_with_clone)]
    pub h_circuit: Vec<u8>,

    #[wasm_bindgen(getter_with_clone)]
    pub h_ct: Vec<u8>,
}

#[wasm_bindgen]
pub fn check_precontract(description: String, commitment: String, opening_value: String, ct: &[u8]) -> CheckPrecontractResult {
    let description_bytes = hex_to_bytes(description);
    let circuit = compile_basic_circuit(ct.len(), &description_bytes);
    let h_ct = acc_ct(ct, circuit.block_size);
    let h_circuit = acc_circuit(circuit);
    match open_commitment_internal(&hex_to_bytes(commitment), &hex_to_bytes(opening_value)) {
        Ok(opened) => {
            let success = opened.len() == 64
                && opened[..32].eq(&h_circuit)
                && opened[32..].eq(&h_ct);
            CheckPrecontractResult { success, h_circuit, h_ct }
        },
        Err(msg) => {
            log(msg);
            CheckPrecontractResult { success: false, h_circuit, h_ct }
        }
    }
}

// ####################################
// ###    BUYER CHECK CT DECRYPTION ###
// ####################################

#[wasm_bindgen]
pub struct CheckCtResult {
    pub success: bool,

    #[wasm_bindgen(getter_with_clone)]
    pub decrypted_file: Vec<u8>,
}

#[wasm_bindgen]
pub fn check_received_ct_key(ct: &mut [u8], key: &[u8], description: String) -> CheckCtResult {
    let decrypted_file = decrypt(ct, key);
    let description_computed = sha256(&decrypted_file);
    let success = hex_to_bytes(description).eq(&description_computed);

    CheckCtResult {
        success,
        decrypted_file,
    }
}

// ####################################
// ###    B/V MAKE ARGUMENT         ###
// ####################################

#[wasm_bindgen]
#[derive(Serialize, Deserialize)]
pub struct DisputeArgument {
    #[wasm_bindgen(getter_with_clone)]
    pub circuit: CompiledCircuit,

    #[wasm_bindgen(getter_with_clone)]
    pub ct: Vec<u8>,

    #[wasm_bindgen(getter_with_clone)]
    pub opening_value: Vec<u8>
}

#[wasm_bindgen]
impl DisputeArgument {
    pub fn to_bytes(&self) -> Vec<u8> {
        let mut buf = Vec::new();
        write(&mut buf, self).unwrap();
        buf
    }

    pub fn from_bytes(bytes: &[u8]) -> DisputeArgument {
        from_read(bytes).unwrap()
    }
}

#[wasm_bindgen]
pub fn make_argument(ct: Vec<u8>, description: String, opening_value: String) -> Vec<u8> {
    DisputeArgument {
        circuit: compile_basic_circuit(ct.len(), &hex_to_bytes(description)),
        ct,
        opening_value: hex_to_bytes(opening_value)
    }.to_bytes()
}

// ####################################
// ###    SB/SV CHECK ARGUMENT      ###
// ####################################

#[wasm_bindgen]
pub fn check_argument(argument_bin: &[u8], commitment: String) -> bool {
    let argument = DisputeArgument::from_bytes(argument_bin);
    let block_size = argument.circuit.block_size;
    let h_circuit = acc_circuit(argument.circuit);
    let h_ct = acc_ct(argument.ct.as_slice(), block_size);

    match open_commitment_internal(&hex_to_bytes(commitment), &argument.opening_value) {
        Ok(opened) => {
            opened.len() == 64
                && opened[..32].eq(&h_circuit)
                && opened[32..].eq(&h_ct)
        },
        Err(msg) => {
            log(msg);
            false
        }
    }
}

// ####################################
// ###    BUYER/VENDOR EVAL         ###
// ####################################
#[wasm_bindgen]
#[derive(Serialize, Deserialize)]
pub struct EvaluatedCircuit {
    values: Vec<Vec<u8>>,
    constants: Vec<Vec<u8>>
}

#[wasm_bindgen]
impl EvaluatedCircuit {
    pub fn to_bytes(&self) -> Vec<u8> {
        let mut buf = Vec::new();
        write(&mut buf, self).unwrap();
        buf
    }

    pub fn from_bytes(bytes: &[u8]) -> EvaluatedCircuit {
        from_read(bytes).unwrap()
    }

    pub fn get(&self, index: usize) -> Vec<u8> {
        self.values[index].clone()
    }

    pub fn get_hex(&self, index: usize) -> String {
        bytes_to_hex(self.get(index))
    }

    pub fn get_from_end(&self, index: usize) -> String {
        bytes_to_hex(self.get(self.values.len() - index))
    }

    pub fn length(&self) -> usize {
        self.values.len()
    }
}

#[wasm_bindgen]
pub fn evaluate_circuit(circuit_bytes: &[u8], ct: &[u8], constants: Vec<String>, description: String) -> EvaluatedCircuit {
    if circuit_bytes.len() == 0 {
        let circuit = compile_basic_circuit(ct.len(), &hex_to_bytes(description))
            .bind_missing_constants(constants
                .into_iter()
                .map(hex_to_bytes)
                .collect());
        let ct_blocks = split_ct_blocks(&ct, circuit.block_size);
        EvaluatedCircuit {
            constants: circuit.constants.clone(),
            values: evaluate_circuit_internal(&ct_blocks, circuit),
        }
    } else {
        let circuit = CompiledCircuit::from_bytes(circuit_bytes)
            .bind_missing_constants(constants
                .into_iter()
                .map(hex_to_bytes)
                .collect());
        let ct_blocks = split_ct_blocks(&ct, circuit.block_size);
        EvaluatedCircuit {
            constants: circuit.constants.clone(),
            values: evaluate_circuit_internal(&ct_blocks, circuit),
        }
    }
}


// ####################################
// ###    BUYER/VENDOR HPRE         ###
// ####################################
#[wasm_bindgen]
pub fn hpre(evaluated_circuit_bytes: &[u8], num_blocks: usize, challenge: usize) -> Vec<u8> {
    let evaluated_circuit = EvaluatedCircuit::from_bytes(evaluated_circuit_bytes);
    acc(&evaluated_circuit.values[num_blocks + 1..challenge])
}

// ####################################
// ###    VENDOR FINAL STEP         ###
// ####################################

#[wasm_bindgen]
pub struct FinalStepComponents {
    #[wasm_bindgen(getter_with_clone)]
    pub gate: Vec<u8>,

    #[wasm_bindgen(getter_with_clone)]
    pub values: Vec<u8>,

    #[wasm_bindgen(getter_with_clone)]
    pub curr_acc: Vec<u8>,

    #[wasm_bindgen(getter_with_clone)]
    pub proof1: Vec<u8>,

    #[wasm_bindgen(getter_with_clone)]
    pub proof2: Vec<u8>,

    #[wasm_bindgen(getter_with_clone)]
    pub proof3: Vec<u8>,

    #[wasm_bindgen(getter_with_clone)]
    pub proof_ext: Vec<u8>,
}

fn split_sons_indices(sons: &[usize], num_blocks: usize) -> (Vec<usize>, Vec<usize>) {
    let mut in_l = Vec::new();
    let mut not_in_l_minus_m = Vec::new();

    for s in sons {
        if *s <= num_blocks {
            in_l.push(*s)
        } else {
            not_in_l_minus_m.push(*s - num_blocks)
        }
    }

    (in_l, not_in_l_minus_m)
}

// 8a
#[wasm_bindgen]
pub fn compute_proofs(circuit_bytes: &[u8], evaluated_circuit_bytes: &[u8], ct: &[u8], challenge: usize) -> FinalStepComponents {
    let circuit = CompiledCircuit::from_bytes(circuit_bytes);
    let ct_blocks = split_ct_blocks(ct, circuit.block_size);
    let num_blocks = ct_blocks.len();
    let evaluated_circuit = EvaluatedCircuit::from_bytes(evaluated_circuit_bytes);
    let gate = circuit.circuit.gates[challenge].clone();
    let (s_in_l, not_in_l_minus_m) = split_sons_indices(&gate.sons, num_blocks);

    let proof1 = prove(&circuit.to_bytes_array(), &[challenge]);
    let proof2 = prove(&ct_blocks, &s_in_l);
    let proof3 = prove(&evaluated_circuit.values[num_blocks..challenge - 1], &not_in_l_minus_m);
    let proof_ext = prove_ext(&evaluated_circuit.values[num_blocks..challenge]);

    let values = get_evaluated_sons(&gate, &evaluated_circuit.values, &evaluated_circuit.constants);
    let gate_flat: Vec<u32> = gate.flatten().into_iter().map(|x| x as u32).collect();
    let curr_acc = acc(&evaluated_circuit.values[num_blocks + 1..challenge]);

    FinalStepComponents {
        gate: gate_flat.abi_encode(),
        values: values.abi_encode(),
        curr_acc: curr_acc.abi_encode(),
        proof1: proof1.abi_encode(),
        proof2: proof2.abi_encode(),
        proof3: proof3.abi_encode(),
        proof_ext: proof_ext.abi_encode(),
    }
}

// 8b
#[wasm_bindgen]
pub fn compute_proofs_left(circuit_bytes: &[u8], evaluated_circuit_bytes: &[u8], ct: &[u8], challenge: usize) -> FinalStepComponents {
    let circuit = CompiledCircuit::from_bytes(circuit_bytes);
    let ct_blocks = split_ct_blocks(ct, circuit.block_size);
    let num_blocks = ct_blocks.len();
    let evaluated_circuit = EvaluatedCircuit::from_bytes(evaluated_circuit_bytes);
    let gate = circuit.circuit.gates[challenge].clone();

    let proof1 = prove(&circuit.to_bytes_array(), &[challenge]);
    let proof2 = prove(&ct_blocks, &gate.sons);
    let proof_ext = prove_ext(&[evaluated_circuit.values[num_blocks].clone()]);

    let values = get_evaluated_sons(&gate, &evaluated_circuit.values, &evaluated_circuit.constants);
    let gate_flat: Vec<u32> = gate.flatten().into_iter().map(|x| x as u32).collect();
    let curr_acc = acc(&evaluated_circuit.values[num_blocks + 1..challenge]);

    FinalStepComponents {
        gate: gate_flat.abi_encode(),
        values: values.abi_encode(),
        curr_acc: curr_acc.abi_encode(),
        proof1: proof1.abi_encode(),
        proof2: proof2.abi_encode(),
        proof3: vec![],
        proof_ext: proof_ext.abi_encode(),
    }
}

// 8c
#[wasm_bindgen]
pub fn compute_proof_right(evaluated_circuit_bytes: &[u8], num_blocks: usize, num_gates: usize) -> Vec<u8> {
    let evaluated_circuit = EvaluatedCircuit::from_bytes(evaluated_circuit_bytes);

    prove(&evaluated_circuit.values[num_blocks..num_gates], &[num_gates - num_blocks]).abi_encode()
}


// =================================================================================================

#[test]
fn test_basic_circuit() {
    let mut rng = rand::rng();
    for i in 1..(1<<12) {
        let mut data = vec![0u8; i];
        rng.fill_bytes(&mut data);
        let description = sha256(&data);

        let mut key = vec![0u8; 16];
        rng.fill_bytes(&mut key);

        // encrypt
        let ct = encrypt_and_prepend_iv(&mut data, &key);

        println!("{}", i);
        let circuit = compile_basic_circuit(ct.len(), &description);

        let evaluated = evaluate_circuit(
            &circuit.to_bytes(),
            &ct,
            vec![bytes_to_hex(key)],
            bytes_to_hex(description),
        );

        assert_eq!("0x01", bytes_to_hex(evaluated.values.last().unwrap().to_vec()))
    }
}
mod aes_ctr;
mod sha256;
mod simple_operations;
mod encryption;
mod commitment;
mod accumulator;
mod utils;
mod circuits;

use std::cmp::min;
use wasm_bindgen::prelude::*;
use js_sys::{Array, Number, Uint8Array};
use serde::{Deserialize, Serialize};
use rmp_serde::{encode::write, decode::from_read};
use rand::RngCore;
use crate::utils::{error, log, split_ct_blocks};
use crate::accumulator::{acc_circuit, acc_ct, acc, prove_ext, prove, proof_to_js_array, verify_ext};
use crate::circuits::{compile_basic_circuit, evaluate_circuit_internal, get_evaluated_sons, is_constant_idx, CompiledCircuit};
use crate::commitment::{hex_to_bytes, bytes_to_hex, open_commitment_internal, commit_hashes, Commitment};
use crate::encryption::{decrypt, encrypt_and_prepend_iv};
use crate::sha256::sha256;

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

    pub num_blocks: u32,
    pub num_gates: u32,
}

#[wasm_bindgen]
pub fn compute_precontract_values(file: &mut [u8], key: &[u8]) -> Precontract {
    let description = sha256(file);
    let ct = encrypt_and_prepend_iv(file, key);
    let circuit = compile_basic_circuit(ct.len() as u32, &description);
    let num_blocks = circuit.num_blocks;
    let num_gates = circuit.circuit.len() as u32;
    let circuit_bytes = circuit.to_bytes();
    let h_ct = acc_ct(&ct, circuit.block_size as usize);
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
    let circuit = compile_basic_circuit(ct.len() as u32, &description_bytes);
    let h_ct = acc_ct(ct, circuit.block_size as usize);
    let h_circuit = acc_circuit(circuit);
    match open_commitment_internal(&hex_to_bytes(commitment), &hex_to_bytes(opening_value)) {
        Ok(opened) => {
            let success = opened.len() == 64
                && opened[..32].eq(&h_circuit)
                && opened[32..].eq(&h_ct);
            CheckPrecontractResult { success, h_circuit, h_ct }
        },
        Err(msg) => {
            error(msg);
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
        circuit: compile_basic_circuit(ct.len() as u32, &hex_to_bytes(description)),
        ct,
        opening_value: hex_to_bytes(opening_value)
    }.to_bytes()
}

// ####################################
// ###    SB/SV CHECK ARGUMENT      ###
// ####################################

#[wasm_bindgen]
pub struct ArgumentCheckResult {
    pub is_valid: bool,
    pub supports_buyer: bool,

    #[wasm_bindgen(getter_with_clone)]
    pub error: Option<String>
}

#[wasm_bindgen]
pub fn check_argument(argument_bin: &[u8], commitment: String, description: String, key: String) -> ArgumentCheckResult {
    let argument = DisputeArgument::from_bytes(argument_bin);
    let block_size = argument.circuit.block_size;
    let h_circuit = acc_circuit(argument.circuit);
    let h_ct = acc_ct(argument.ct.as_slice(), block_size as usize);

    match open_commitment_internal(&hex_to_bytes(commitment), &argument.opening_value) {
        Ok(opened) => {
            let is_valid = opened.len() == 64
                && opened[..32].eq(&h_circuit)
                && opened[32..].eq(&h_ct);
            let pt = decrypt(&argument.ct, &hex_to_bytes(key));
            let description_computed = sha256(&pt);
            let supports_buyer = !hex_to_bytes(description).eq(&description_computed);
            ArgumentCheckResult { is_valid, supports_buyer, error: None }
        },
        Err(msg) => {
            error(msg);
            ArgumentCheckResult { is_valid: false, supports_buyer: false, error: Some(msg.to_string()) }
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
        let circuit = compile_basic_circuit(ct.len() as u32, &hex_to_bytes(description))
            .bind_missing_constants(constants
                .into_iter()
                .map(hex_to_bytes)
                .collect());
        let ct_blocks = split_ct_blocks(&ct, circuit.block_size as usize);
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
        let ct_blocks = split_ct_blocks(&ct, circuit.block_size as usize);
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
    acc(&evaluated_circuit.values[num_blocks..=challenge])
}

// ####################################
// ###    VENDOR FINAL STEP         ###
// ####################################

#[wasm_bindgen]
pub struct FinalStepComponents {
    #[wasm_bindgen(getter_with_clone)]
    pub gate: Vec<Number>,

    // #[wasm_bindgen(getter_with_clone)]
    // pub sorted_sons: Vec<Number>,

    #[wasm_bindgen(getter_with_clone)]
    pub values: Vec<Uint8Array>,

    // #[wasm_bindgen(getter_with_clone)]
    // pub sorted_values: Vec<Uint8Array>,

    #[wasm_bindgen(getter_with_clone)]
    pub curr_acc: Vec<u8>,

    #[wasm_bindgen(getter_with_clone)]
    pub proof1: Array,

    #[wasm_bindgen(getter_with_clone)]
    pub proof2: Array,

    #[wasm_bindgen(getter_with_clone)]
    pub proof3: Array,

    #[wasm_bindgen(getter_with_clone)]
    pub proof_ext: Array,
}

fn split_sons_indices(sons: &[u32], num_blocks: u32) -> (Vec<u32>, Vec<u32>) {
    let mut in_l = Vec::new();
    let mut not_in_l_minus_m = Vec::new();

    for &s in sons {
        if is_constant_idx(s) { continue; }
        if s < num_blocks { // strictly inferior because we start counting from 0
            in_l.push(s)
        } else {
            not_in_l_minus_m.push(s - num_blocks)
        }
    }

    (in_l, not_in_l_minus_m)
}

// 8a
#[wasm_bindgen]
pub fn compute_proofs(circuit_bytes: &[u8], evaluated_circuit_bytes: &[u8], ct: &[u8], challenge: u32) -> FinalStepComponents {
    let circuit = CompiledCircuit::from_bytes(circuit_bytes);
    let ct_blocks = split_ct_blocks(ct, circuit.block_size as usize);
    let num_blocks = ct_blocks.len() as u32;
    let evaluated_circuit = EvaluatedCircuit::from_bytes(evaluated_circuit_bytes);
    let gate = circuit.circuit[challenge as usize].clone();
    let (s_in_l, not_in_l_minus_m) = split_sons_indices(&gate.sons, num_blocks);

    let values = get_evaluated_sons(&gate, &evaluated_circuit.values, &evaluated_circuit.constants);
    let curr_acc = acc(&evaluated_circuit.values[(num_blocks as usize)..=(challenge as usize)]);
    let proof1 = prove(&circuit.to_abi_encoded(), &[challenge]);
    let proof2 = prove(&ct_blocks, &s_in_l);
    let proof3 = prove(&evaluated_circuit.values[(num_blocks as usize)..(challenge as usize)], &not_in_l_minus_m);
    let proof_ext = prove_ext(&evaluated_circuit.values[(num_blocks as usize)..=(challenge as usize)]);
    FinalStepComponents {
        gate: gate.flatten().iter().map(|&x| Number::from(x)).collect(),
        values: values.iter().map(|&x| Uint8Array::from(x.as_slice())).collect(),
        curr_acc,
        proof1: proof_to_js_array(proof1),
        proof2: proof_to_js_array(proof2),
        proof3: proof_to_js_array(proof3),
        proof_ext: proof_to_js_array(proof_ext),
    }
}

// 8b
#[wasm_bindgen]
pub fn compute_proofs_left(circuit_bytes: &[u8], evaluated_circuit_bytes: &[u8], ct: &[u8], challenge: u32) -> FinalStepComponents {
    let circuit = CompiledCircuit::from_bytes(circuit_bytes);
    let ct_blocks = split_ct_blocks(ct, circuit.block_size as usize);
    let num_blocks = ct_blocks.len() as u32;
    let evaluated_circuit = EvaluatedCircuit::from_bytes(evaluated_circuit_bytes);
    let gate = circuit.circuit[challenge as usize].clone();
    log(&format!("evaluated gate: {}", bytes_to_hex(evaluated_circuit.values[challenge as usize].clone())));
    let non_constant_sons: Vec<u32> = gate
        .sons
        .iter()
        .copied()
        .filter(|&x| !is_constant_idx(x))
        .collect();

    let values = get_evaluated_sons(&gate, &evaluated_circuit.values, &evaluated_circuit.constants);
    let curr_acc = acc(&evaluated_circuit.values[(num_blocks as usize)..=(challenge as usize)]);
    let proof1 = prove(&circuit.to_abi_encoded(), &[challenge]);
    let proof2 = prove(&ct_blocks, &non_constant_sons);
    log("pe===");
    let proof_ext = prove_ext(&[evaluated_circuit.values[num_blocks as usize].clone()]);

    FinalStepComponents {
        gate: gate.flatten().iter().map(|&x| Number::from(x)).collect(),
        values: values.iter().map(|&x| Uint8Array::from(x.as_slice())).collect(),
        curr_acc,
        proof1: proof_to_js_array(proof1),
        proof2: proof_to_js_array(proof2),
        proof3: Array::new(),
        proof_ext: proof_to_js_array(proof_ext),
    }
}

// 8c
#[wasm_bindgen]
pub fn compute_proof_right(evaluated_circuit_bytes: &[u8], num_blocks: u32, num_gates: u32) -> Array {
    let evaluated_circuit = EvaluatedCircuit::from_bytes(evaluated_circuit_bytes);

    log(&format!("{}", num_gates - num_blocks));
    proof_to_js_array(prove(
        &evaluated_circuit.values[(num_blocks as usize)..],
        &[num_gates - num_blocks - 1]
    ))
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
        let circuit = compile_basic_circuit(ct.len() as u32, &description);

        let evaluated = evaluate_circuit(
            &circuit.to_bytes(),
            &ct,
            vec![bytes_to_hex(key)],
            bytes_to_hex(description),
        );

        assert_eq!("0x01", bytes_to_hex(evaluated.values.last().unwrap().to_vec()))
    }
}
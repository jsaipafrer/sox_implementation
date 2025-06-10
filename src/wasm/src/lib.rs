mod accumulator;
mod aes_ctr;
mod circuits;
mod commitment;
mod encryption;
mod sha256;
mod simple_operations;
mod utils;

use crate::accumulator::{acc, acc_circuit, acc_ct, proof_to_js_array, prove, prove_ext};
use crate::circuits::{
    compile_basic_circuit, evaluate_circuit_internal, get_evaluated_sons, is_constant_idx,
    CompiledCircuit,
};
use crate::commitment::{commit_hashes, open_commitment_internal, Commitment};
use crate::encryption::{decrypt, encrypt_and_prepend_iv};
use crate::sha256::sha256;
use crate::utils::{error, hex_to_bytes, split_ct_blocks};
use js_sys::{Array, Number, Uint8Array};
use rmp_serde::{decode::from_read, encode::write};
use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

// ####################################
// ###     PRECONTRACT VENDOR       ###
// ####################################

/// Represents a precontract created by the vendor, containing encrypted data and committing
/// information.
#[wasm_bindgen]
pub struct Precontract {
    /// The encrypted data (ciphertext)
    #[wasm_bindgen(getter_with_clone)]
    pub ct: Vec<u8>,

    /// Serialized circuit
    #[wasm_bindgen(getter_with_clone)]
    pub circuit_bytes: Vec<u8>,

    /// Description of the original file
    #[wasm_bindgen(getter_with_clone)]
    pub description: Vec<u8>,

    /// Result of the accumulator applied on the ciphertext
    #[wasm_bindgen(getter_with_clone)]
    pub h_ct: Vec<u8>,

    /// Result of the accumulator applied on the circuit
    #[wasm_bindgen(getter_with_clone)]
    pub h_circuit: Vec<u8>,

    /// Commitment of the ciphertext and circuit
    #[wasm_bindgen(getter_with_clone)]
    pub commitment: Commitment,

    /// Number of blocks in the ciphertext
    pub num_blocks: u32,

    /// Number of gates in the circuit
    pub num_gates: u32,
}

/// Computes precontract values for a file. This includes encryption, circuit compilation,
/// and commitment generation.
///
/// # Arguments
/// * `file` - The file data to be encrypted
/// * `key` - The encryption key
///
/// # Returns
/// A `Precontract` containing all necessary components for the optimistic phase of the protocol
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

/// Result of checking a precontract, containing verification status and accumulator values.
#[wasm_bindgen]
pub struct CheckPrecontractResult {
    /// Whether the precontract verification succeeded
    pub success: bool,

    /// Accumulator value of the circuit
    #[wasm_bindgen(getter_with_clone)]
    pub h_circuit: Vec<u8>,

    /// Accumulator value of the ciphertext
    #[wasm_bindgen(getter_with_clone)]
    pub h_ct: Vec<u8>,
}

/// Verifies a precontract by checking the commitment and description with respect to the received
/// ciphertext.
///
/// # Arguments
/// * `description` - Hex-encoded description hash
/// * `commitment` - Hex-encoded commitment
/// * `opening_value` - Hex-encoded opening value
/// * `ct` - Ciphertext bytes
///
/// # Returns
/// A `CheckPrecontractResult` containing the verification status and hash values
#[wasm_bindgen]
pub fn check_precontract(
    description: String,
    commitment: String,
    opening_value: String,
    ct: &[u8],
) -> CheckPrecontractResult {
    let description_bytes = hex_to_bytes(description);
    let circuit = compile_basic_circuit(ct.len() as u32, &description_bytes);
    let h_ct = acc_ct(ct, circuit.block_size as usize);
    let h_circuit = acc_circuit(circuit);
    match open_commitment_internal(&hex_to_bytes(commitment), &hex_to_bytes(opening_value)) {
        Ok(opened) => {
            let success =
                opened.len() == 64 && opened[..32].eq(&h_circuit) && opened[32..].eq(&h_ct);
            CheckPrecontractResult {
                success,
                h_circuit,
                h_ct,
            }
        }
        Err(msg) => {
            error(msg);
            CheckPrecontractResult {
                success: false,
                h_circuit,
                h_ct,
            }
        }
    }
}

// ####################################
// ###    BUYER CHECK CT DECRYPTION ###
// ####################################

/// Result of checking ciphertext decryption.
#[wasm_bindgen]
pub struct CheckCtResult {
    /// Whether the decryption verification succeeded
    pub success: bool,

    /// The decrypted file contents
    #[wasm_bindgen(getter_with_clone)]
    pub decrypted_file: Vec<u8>,
}

/// Verifies ciphertext decryption by checking against the description.
///
/// # Arguments
/// * `ct` - Ciphertext bytes to decrypt
/// * `key` - Decryption key
/// * `description` - Expected description hash in hex
///
/// # Returns
/// A `CheckCtResult` containing the verification status and decrypted data
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

/// Represents an argument in a dispute between buyer and vendor.
#[wasm_bindgen]
#[derive(Serialize, Deserialize)]
pub struct DisputeArgument {
    /// The compiled circuit
    #[wasm_bindgen(getter_with_clone)]
    pub circuit: CompiledCircuit,

    /// The ciphertext
    #[wasm_bindgen(getter_with_clone)]
    pub ct: Vec<u8>,

    /// Opening value for the commitment
    #[wasm_bindgen(getter_with_clone)]
    pub opening_value: Vec<u8>,
}

/// Methods for dispute argument serialization and deserialization
#[wasm_bindgen]
impl DisputeArgument {
    /// Serializes the dispute argument into a byte vector.
    ///
    /// Returns a vector containing the serialized dispute argument data.
    pub fn to_bytes(&self) -> Vec<u8> {
        let mut buf = Vec::new();
        write(&mut buf, self).unwrap();
        buf
    }

    /// Deserializes a dispute argument from bytes.
    ///
    /// # Arguments
    /// * `bytes` - The serialized dispute argument bytes
    ///
    /// # Returns
    /// A new `DisputeArgument` instance
    pub fn from_bytes(bytes: &[u8]) -> DisputeArgument {
        from_read(bytes).unwrap()
    }
}

/// Creates a dispute argument from the given components.
///
/// # Arguments
/// * `ct` - Ciphertext bytes
/// * `description` - Description hash in hex format
/// * `opening_value` - Opening value in hex format
///
/// # Returns
/// Serialized dispute argument bytes
#[wasm_bindgen]
pub fn make_argument(ct: Vec<u8>, description: String, opening_value: String) -> Vec<u8> {
    DisputeArgument {
        circuit: compile_basic_circuit(ct.len() as u32, &hex_to_bytes(description)),
        ct,
        opening_value: hex_to_bytes(opening_value),
    }
    .to_bytes()
}

// ####################################
// ###    SB/SV CHECK ARGUMENT      ###
// ####################################

/// Result of checking a dispute argument.
#[wasm_bindgen]
pub struct ArgumentCheckResult {
    /// Whether the argument is valid
    pub is_valid: bool,

    /// Whether the argument supports the buyer's position
    pub supports_buyer: bool,

    /// Optional error message
    #[wasm_bindgen(getter_with_clone)]
    pub error: Option<String>,
}

/// Verifies a dispute argument.
///
/// # Arguments
/// * `argument_bin` - Serialized dispute argument bytes
/// * `commitment` - Commitment in hex format
/// * `description` - Description hash in hex format
/// * `key` - Encryption key in hex format
///
/// # Returns
/// An `ArgumentCheckResult` containing the verification results
#[wasm_bindgen]
pub fn check_argument(
    argument_bin: &[u8],
    commitment: String,
    description: String,
    key: String,
) -> ArgumentCheckResult {
    let argument = DisputeArgument::from_bytes(argument_bin);
    let block_size = argument.circuit.block_size;
    let h_circuit = acc_circuit(argument.circuit);
    let h_ct = acc_ct(argument.ct.as_slice(), block_size as usize);

    match open_commitment_internal(&hex_to_bytes(commitment), &argument.opening_value) {
        Ok(opened) => {
            let is_valid =
                opened.len() == 64 && opened[..32].eq(&h_circuit) && opened[32..].eq(&h_ct);
            let pt = decrypt(&argument.ct, &hex_to_bytes(key));
            let description_computed = sha256(&pt);
            let supports_buyer = !hex_to_bytes(description).eq(&description_computed);
            ArgumentCheckResult {
                is_valid,
                supports_buyer,
                error: None,
            }
        }
        Err(msg) => {
            error(msg);
            ArgumentCheckResult {
                is_valid: false,
                supports_buyer: false,
                error: Some(msg.to_string()),
            }
        }
    }
}

// ####################################
// ###    BUYER/VENDOR EVAL         ###
// ####################################

/// Represents an evaluated circuit with its values and constants.
#[wasm_bindgen]
#[derive(Serialize, Deserialize)]
pub struct EvaluatedCircuit {
    values: Vec<Vec<u8>>,
    constants: Vec<Vec<u8>>,
}

/// Methods for evaluated circuit data access
#[wasm_bindgen]
impl EvaluatedCircuit {
    /// Serializes the evaluated circuit into bytes.
    ///
    /// Returns a vector containing the serialized circuit data.
    pub fn to_bytes(&self) -> Vec<u8> {
        let mut buf = Vec::new();
        write(&mut buf, self).unwrap();
        buf
    }

    /// Deserializes an evaluated circuit from bytes.
    ///
    /// # Arguments
    /// * `bytes` - The serialized circuit bytes
    ///
    /// # Returns
    /// A new `EvaluatedCircuit` instance
    pub fn from_bytes(bytes: &[u8]) -> EvaluatedCircuit {
        from_read(bytes).unwrap()
    }
}

/// Evaluates a circuit with the given ciphertext, constants, and description.
///
/// # Arguments
/// * `circuit_bytes` - Serialized circuit bytes. If empty, a new basic circuit will be compiled
/// * `ct` - Ciphertext bytes to evaluate
/// * `constants` - Vector of hex-encoded constant values
/// * `description` - Description hash in hex format
///
/// # Returns
/// An `EvaluatedCircuit` containing the evaluation results and circuit constants
///
/// # Details
/// This function either uses an existing circuit (from circuit_bytes) or creates a new basic circuit
/// based on the ciphertext length and description. It then evaluates the circuit with the given
/// ciphertext and constants.
#[wasm_bindgen]
pub fn evaluate_circuit(
    circuit_bytes: &[u8],
    ct: &[u8],
    constants: Vec<String>,
    description: String,
) -> EvaluatedCircuit {
    if circuit_bytes.len() == 0 {
        let circuit = compile_basic_circuit(ct.len() as u32, &hex_to_bytes(description))
            .bind_missing_constants(constants.into_iter().map(hex_to_bytes).collect());
        let ct_blocks = split_ct_blocks(&ct, circuit.block_size as usize);
        EvaluatedCircuit {
            constants: circuit.constants.clone(),
            values: evaluate_circuit_internal(&ct_blocks, circuit),
        }
    } else {
        let circuit = CompiledCircuit::from_bytes(circuit_bytes)
            .bind_missing_constants(constants.into_iter().map(hex_to_bytes).collect());
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

/// Computes the answer to send to a smart contract based on the issued challenge.
///
/// # Arguments
/// * `evaluated_circuit_bytes` - Serialized evaluated circuit bytes
/// * `num_blocks` - Number of blocks for the ciphertext
/// * `challenge` - Challenge issued by the smart contract
///
/// # Returns
/// The response to the challenge
#[wasm_bindgen]
pub fn hpre(evaluated_circuit_bytes: &[u8], num_blocks: usize, challenge: usize) -> Vec<u8> {
    let evaluated_circuit = EvaluatedCircuit::from_bytes(evaluated_circuit_bytes);
    acc(&evaluated_circuit.values[num_blocks..=challenge])
}

// ####################################
// ###    VENDOR FINAL STEP         ###
// ####################################

/// Components returned from the vendor's final step proof generation. Intended for usage in a
/// JavaScript context
#[wasm_bindgen]
pub struct FinalStepComponents {
    /// Gate information
    #[wasm_bindgen(getter_with_clone)]
    pub gate: Vec<Number>,

    /// Values involved in the proof
    #[wasm_bindgen(getter_with_clone)]
    pub values: Vec<Uint8Array>,

    /// Current accumulator value (w_i)
    #[wasm_bindgen(getter_with_clone)]
    pub curr_acc: Vec<u8>,

    /// First proof
    #[wasm_bindgen(getter_with_clone)]
    pub proof1: Array,

    /// Second proof
    #[wasm_bindgen(getter_with_clone)]
    pub proof2: Array,

    /// Third proof (empty array if no third proof is needed)
    #[wasm_bindgen(getter_with_clone)]
    pub proof3: Array,

    /// Extension proof
    #[wasm_bindgen(getter_with_clone)]
    pub proof_ext: Array,
}

// Splits the sons according to the paper's set L. Constant indices are not kept.
fn split_sons_indices(sons: &[u32], num_blocks: u32) -> (Vec<u32>, Vec<u32>) {
    let mut in_l = Vec::new();
    let mut not_in_l_minus_m = Vec::new();

    for &s in sons {
        if is_constant_idx(s) {
            continue;
        }
        if s < num_blocks {
            // strictly inferior because we start counting from 0
            in_l.push(s)
        } else {
            not_in_l_minus_m.push(s - num_blocks)
        }
    }

    (in_l, not_in_l_minus_m)
}

/// Computes proofs for step 8a.
///
/// # Arguments
/// * `circuit_bytes` - Serialized circuit bytes
/// * `evaluated_circuit_bytes` - Serialized evaluated circuit bytes
/// * `ct` - Ciphertext bytes
/// * `challenge` - Challenge point in the circuit
///
/// # Returns
/// A `FinalStepComponents` containing:
/// - Gate information for the challenge point
/// - Evaluated values at the challenge point
/// - Current accumulator value
/// - Multiple proofs (proof1, proof2, proof3, proof_ext)
#[wasm_bindgen]
pub fn compute_proofs(
    circuit_bytes: &[u8],
    evaluated_circuit_bytes: &[u8],
    ct: &[u8],
    challenge: u32,
) -> FinalStepComponents {
    let circuit = CompiledCircuit::from_bytes(circuit_bytes);
    let ct_blocks = split_ct_blocks(ct, circuit.block_size as usize);
    let num_blocks = ct_blocks.len() as u32;
    let evaluated_circuit = EvaluatedCircuit::from_bytes(evaluated_circuit_bytes);
    let gate = circuit.circuit[challenge as usize].clone();
    let (s_in_l, not_in_l_minus_m) = split_sons_indices(&gate.sons, num_blocks);

    let values = get_evaluated_sons(
        &gate,
        &evaluated_circuit.values,
        &evaluated_circuit.constants,
    );
    let curr_acc = acc(&evaluated_circuit.values[(num_blocks as usize)..=(challenge as usize)]);
    let proof1 = prove(&circuit.to_abi_encoded(), &[challenge]);
    let proof2 = prove(&ct_blocks, &s_in_l);
    let proof3 = prove(
        &evaluated_circuit.values[(num_blocks as usize)..(challenge as usize)],
        &not_in_l_minus_m,
    );
    let proof_ext =
        prove_ext(&evaluated_circuit.values[(num_blocks as usize)..=(challenge as usize)]);
    FinalStepComponents {
        gate: gate.flatten().iter().map(|&x| Number::from(x)).collect(),
        values: values
            .iter()
            .map(|&x| Uint8Array::from(x.as_slice()))
            .collect(),
        curr_acc,
        proof1: proof_to_js_array(proof1),
        proof2: proof_to_js_array(proof2),
        proof3: proof_to_js_array(proof3),
        proof_ext: proof_to_js_array(proof_ext),
    }
}

/// Computes proofs for step 8b.
///
/// # Arguments
/// * `circuit_bytes` - Serialized circuit bytes
/// * `evaluated_circuit_bytes` - Serialized evaluated circuit bytes
/// * `ct` - Ciphertext bytes
/// * `challenge` - Challenge point in the circuit
///
/// # Returns
/// A `FinalStepComponents` containing:
/// - Gate information for the challenge point
/// - Evaluated values at the challenge point
/// - Current accumulator value
/// - Multiple proofs (proof1, proof2, proof_ext)
/// Note that the returning object will have a proof3 component which is an empty array.
#[wasm_bindgen]
pub fn compute_proofs_left(
    circuit_bytes: &[u8],
    evaluated_circuit_bytes: &[u8],
    ct: &[u8],
    challenge: u32,
) -> FinalStepComponents {
    let circuit = CompiledCircuit::from_bytes(circuit_bytes);
    let ct_blocks = split_ct_blocks(ct, circuit.block_size as usize);
    let num_blocks = ct_blocks.len() as u32;
    let evaluated_circuit = EvaluatedCircuit::from_bytes(evaluated_circuit_bytes);
    let gate = circuit.circuit[challenge as usize].clone();
    let non_constant_sons: Vec<u32> = gate
        .sons
        .iter()
        .copied()
        .filter(|&x| !is_constant_idx(x))
        .collect();

    let values = get_evaluated_sons(
        &gate,
        &evaluated_circuit.values,
        &evaluated_circuit.constants,
    );
    let curr_acc = acc(&evaluated_circuit.values[(num_blocks as usize)..=(challenge as usize)]);
    let proof1 = prove(&circuit.to_abi_encoded(), &[challenge]);
    let proof2 = prove(&ct_blocks, &non_constant_sons);
    let proof_ext = prove_ext(&[evaluated_circuit.values[num_blocks as usize].clone()]);

    FinalStepComponents {
        gate: gate.flatten().iter().map(|&x| Number::from(x)).collect(),
        values: values
            .iter()
            .map(|&x| Uint8Array::from(x.as_slice()))
            .collect(),
        curr_acc,
        proof1: proof_to_js_array(proof1),
        proof2: proof_to_js_array(proof2),
        proof3: Array::new(),
        proof_ext: proof_to_js_array(proof_ext),
    }
}

/// Computes the proof for step 8c.
///
/// # Arguments
/// * `evaluated_circuit_bytes` - Serialized evaluated circuit bytes
/// * `num_blocks` - Number of blocks for the ciphertext
/// * `num_gates` - Total number of gates in the circuit
///
/// # Returns
/// A JavaScript `Array` containing the proof
#[wasm_bindgen]
pub fn compute_proof_right(
    evaluated_circuit_bytes: &[u8],
    num_blocks: u32,
    num_gates: u32,
) -> Array {
    let evaluated_circuit = EvaluatedCircuit::from_bytes(evaluated_circuit_bytes);

    proof_to_js_array(prove(
        &evaluated_circuit.values[(num_blocks as usize)..],
        &[num_gates - num_blocks - 1],
    ))
}

// =================================================================================================

#[cfg(test)]
mod tests {
    use super::*;
    use crate::utils::bytes_to_hex;
    use rand::RngCore;

    #[test]
    fn test_basic_circuit() {
        let mut rng = rand::rng();
        for i in 1..(1 << 12) {
            let mut data = vec![0u8; i];
            rng.fill_bytes(&mut data);
            let description = sha256(&data);

            let mut key = vec![0u8; 16];
            rng.fill_bytes(&mut key);

            // encrypt
            let ct = encrypt_and_prepend_iv(&mut data, &key);

            let circuit = compile_basic_circuit(ct.len() as u32, &description);

            let evaluated = evaluate_circuit(
                &circuit.to_bytes(),
                &ct,
                vec![bytes_to_hex(key)],
                bytes_to_hex(description),
            );

            assert_eq!(
                "0x01",
                bytes_to_hex(evaluated.values.last().unwrap().to_vec())
            )
        }
    }
}

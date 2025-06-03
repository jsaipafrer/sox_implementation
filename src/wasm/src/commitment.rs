use js_sys::Uint8Array;
use rand::RngCore;
use sha3::{Digest, Keccak256};
use wasm_bindgen::prelude::wasm_bindgen;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

#[wasm_bindgen]
#[derive(Clone)]
pub struct Commitment {
    #[wasm_bindgen(getter_with_clone)]
    pub c: Vec<u8>,

    #[wasm_bindgen(getter_with_clone)]
    pub o: Vec<u8>,
}

pub fn commit_internal(data: &[u8]) -> Commitment {
    let mut rng = rand::rng();
    let mut r = [0u8; 16];
    rng.fill_bytes(&mut r);
    let opening_value = [data, &r].concat();

    let mut hasher = Keccak256::new();
    hasher.update(&opening_value);

    Commitment {
        c: hasher.finalize().to_vec(),
        o: opening_value,
    }
}

pub fn commit_hashes(h_circuit: &[u8], h_ct: &[u8]) -> Commitment {
    commit_internal(&[h_circuit, h_ct].concat())
}

// #[wasm_bindgen]
// pub fn commit(data: Vec<u8>) -> Commitment {
//     commit_internal(&data)
// }

pub fn open_commitment_internal(commitment: &Vec<u8>, opening_value: &Vec<u8>) -> Result<Vec<u8>, &'static str>{
    let mut hasher = Keccak256::new();
    hasher.update(&opening_value);
    if !commitment.eq(&hasher.finalize().to_vec()) {
        return Err("The commitments do not match");
    }

    Ok(opening_value[..(opening_value.len() - 16)].to_vec())
}

// #[wasm_bindgen]
// pub fn open_commitment(commitment: Vec<u8>, opening_value_data: Vec<u8>, opening_value_key: Vec<u8>) -> Vec<Uint8Array> {
//     let _ = open_commitment_internal(&commitment, (&opening_value_data, &opening_value_key));
//
//     vec![Uint8Array::from(opening_value_data.as_slice()), Uint8Array::from(opening_value_key.as_slice())]
// }
//
// #[wasm_bindgen]
// pub fn open_hex_commitment(commitment: String, opening_value_data: Vec<u8>, opening_value_key: Vec<u8>) -> Vec<Uint8Array> {
//     let commitment_vec = hex_to_bytes(commitment);
//     let _ = open_commitment_internal(&commitment_vec, (&opening_value_data, &opening_value_key));
//
//     vec![Uint8Array::from(opening_value_data.as_slice()), Uint8Array::from(opening_value_key.as_slice())]
// }

#[wasm_bindgen]
pub fn hex_to_bytes(hex_str: String) -> Vec<u8> {
    prefix_hex::decode(&hex_str).unwrap()
}

#[wasm_bindgen]
pub fn bytes_to_hex(vec: Vec<u8>) -> String {
    prefix_hex::encode(&vec)
}
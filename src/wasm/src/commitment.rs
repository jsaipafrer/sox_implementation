use js_sys::Uint8Array;
use sha3::{Digest, Keccak256};
use wasm_bindgen::prelude::wasm_bindgen;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

pub fn commit_internal(data: &Vec<u8>, key: &Vec<u8>) -> Vec<u8> {
    // TODO ADD RANDOMNESS (SEE APPENDIX B)
    let mut hasher = Keccak256::new();
    hasher.update(data.to_vec());
    hasher.update(key.to_vec());

    hasher.finalize().to_vec()
}

#[wasm_bindgen]
pub fn commit(data: Vec<u8>, key: Vec<u8>) -> Vec<u8> {
    commit_internal(&data, &key)
}

pub fn open_commitment_internal<'a>(commitment: &Vec<u8>, opening_value: (&'a Vec<u8>, &'a Vec<u8>)) -> Result<(&'a Vec<u8>, &'a Vec<u8>), &'static str>{
    if !commitment.eq(&commit_internal(opening_value.0, opening_value.1)) {
        return Err("The commitments do not match");
    }

    Ok(opening_value)
}

#[wasm_bindgen]
pub fn open_commitment(commitment: Vec<u8>, opening_value_data: Vec<u8>, opening_value_key: Vec<u8>) -> Vec<Uint8Array> {
    let _ = open_commitment_internal(&commitment, (&opening_value_data, &opening_value_key));
    
    vec![Uint8Array::from(opening_value_data.as_slice()), Uint8Array::from(opening_value_key.as_slice())]
}

#[wasm_bindgen]
pub fn open_hex_commitment(commitment: String, opening_value_data: Vec<u8>, opening_value_key: Vec<u8>) -> Vec<Uint8Array> {
    let commitment_vec = hex_to_bytes(commitment);
    let _ = open_commitment_internal(&commitment_vec, (&opening_value_data, &opening_value_key));

    vec![Uint8Array::from(opening_value_data.as_slice()), Uint8Array::from(opening_value_key.as_slice())]
}

#[wasm_bindgen]
pub fn hex_to_bytes(hex_str: String) -> Vec<u8> {
    prefix_hex::decode(&hex_str).unwrap()
}

#[wasm_bindgen]
pub fn bytes_to_hex(vec: Vec<u8>) -> String {
    prefix_hex::encode(&vec)
}
use std::cmp::min;
use wasm_bindgen::prelude::wasm_bindgen;

#[wasm_bindgen]
extern "C" {
    /// External JavaScript console.log function binding
    #[wasm_bindgen(js_namespace = console)]
    pub fn log(s: &str);

    /// External JavaScript console.error function binding
    #[wasm_bindgen(js_namespace = console)]
    pub fn error(s: &str);
}

/// Terminates execution with error message. It will also be displayed in the browser console.
///
/// # Arguments
/// * `s` - Error message to display
pub fn die(s: &str) -> ! {
    error(s);
    panic!("{}", s);
}

/// Splits ciphertext into blocks. Assumes the first block is a 16 bytes IV.
///
/// # Arguments
/// * `ct` - Ciphertext bytes to split
/// * `block_size` - Size of each block
///
/// # Returns
/// Vector of blocks where first block is IV and remaining blocks are block_size bytes each
pub fn split_ct_blocks(ct: &[u8], block_size: usize) -> Vec<Vec<u8>> {
    let mut res = vec![ct[..16].to_vec()]; // IV

    for i in (16..ct.len()).step_by(block_size) {
        let end = min(i + block_size, ct.len());
        res.push(ct[i..end].to_vec());
    }

    res
}

/// Converts a hexadecimal string to bytes
///
/// # Arguments
/// * `hex_str` - Hexadecimal string to convert
///
/// # Returns
/// Vector of bytes parsed from the hex string
#[wasm_bindgen]
pub fn hex_to_bytes(hex_str: String) -> Vec<u8> {
    prefix_hex::decode(&hex_str).unwrap()
}

/// Converts bytes to a hexadecimal string
///
/// # Arguments
/// * `vec` - Bytes to convert
///
/// # Returns
/// Hexadecimal string representation of the bytes
#[wasm_bindgen]
pub fn bytes_to_hex(vec: Vec<u8>) -> String {
    prefix_hex::encode(&vec)
}

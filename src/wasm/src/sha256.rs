use js_sys::Uint8Array;
use sha2::{Digest, Sha256};
use sha2_compress::{Sha2, SHA256};
use wasm_bindgen::prelude::wasm_bindgen;
use crate::accumulator::uint8_array_to_vec_u8;
use crate::utils::{die};

pub fn u8_array_to_u32_array(vec: &[u8]) -> [u32; 8] {
    if vec.len() != 32 {
        panic!("Input vector must have exactly 32 elements.");
    }

    let mut res: [u32; 8] = [0; 8];

    for i in 0..8 {
        res[i] = ((vec[i * 4] as u32) << 24)
            | ((vec[i * 4 + 1] as u32) << 16)
            | ((vec[i * 4 + 2] as u32) << 8)
            | (vec[i * 4 + 3] as u32);
    }

    res
}

pub fn u32_array_to_u8_vec(array: &[u32; 8]) -> Vec<u8> {
    let mut res = Vec::with_capacity(32);

    for byte in array {
        res.push(((byte >> 24) & 0xFFu32) as u8);
        res.push(((byte >> 16) & 0xFFu32) as u8);
        res.push(((byte >> 8) & 0xFFu32) as u8);
        res.push((byte & 0xFFu32) as u8);
    }

    res
}
pub fn sha256_compress(data: &Vec<&Vec<u8>>) -> Vec<u8> {
    let prev_hash = if data.len() == 1 { SHA256 } else { u8_array_to_u32_array(data[0]) };
    let curr_block = if data.len() == 1 { data[0] } else { data[1] };

    println!("prev_hash: {:?}", prev_hash);
    println!("curr_block: {:?}", curr_block);
    let h1 = u8_array_to_u32_array(&curr_block[..32]);
    let h2 = u8_array_to_u32_array(&curr_block[32..]);
    let res = prev_hash.compress(&h1, &h2);

    u32_array_to_u8_vec(&res)
}

fn sha256_padding(last_block: &Vec<u8>, data_len: u64) -> Vec<u8> {
    let mut padded_len = last_block.len() + 9;
    if padded_len < 64 {
        padded_len = 64
    } else if padded_len > 64 {
        padded_len = 128
    }

    let mut padded = vec![0u8; padded_len - 8];
    for i in 0..last_block.len() {
        padded[i] = last_block[i];
    }
    padded[last_block.len()] = 0x80;
    padded.extend(&(data_len * 8).to_be_bytes());

    padded
}

/*
    prev_hash (32 bytes)
    block (variable length)
    data_len (4 bytes)
 */
pub fn sha256_compress_final(data: &Vec<&Vec<u8>>) -> Vec<u8> {
    if data.len() != 2 && data.len() != 3 {
        let msg = format!("Input data for the final compression must have exactly 2 or 3 elements. Got {}", data.len());
        die(&msg);
    }

    if data.len() == 3 && data[0].len() != 32 {
        die(&format!("Previous hash on the final compression must be 32 bytes long. Got {}", data[0].len()));
    }

    if data[data.len() - 1].len() != 8 {
        die(&format!("Data length on the final compression must be 8 bytes long. Got {}", data[data.len() - 1].len()));
    }

    let prev_hash = if data.len() == 2 { SHA256 } else { u8_array_to_u32_array(data[0]) };
    let curr_block = data[data.len() - 2];
    let data_len = u64::from_be_bytes(data[data.len() - 1].clone().try_into().unwrap());

    let padded = sha256_padding(&curr_block, data_len);
    let h1 = u8_array_to_u32_array(&padded[..32]);
    let h2 = u8_array_to_u32_array(&padded[32..64]);
    let mut res = prev_hash.compress(&h1, &h2);

    if padded.len() > 64 {
        // an extra block left due to the padding
        let h1 = u8_array_to_u32_array(&padded[64..96]);
        let h2 = u8_array_to_u32_array(&padded[96..]);
        res = res.compress(&h1, &h2);
    }

    u32_array_to_u8_vec(&res)
}

pub fn sha256(data: &[u8]) -> Vec<u8> {
    let mut hasher = Sha256::new();
    hasher.update(data);
    hasher.finalize().to_vec()
}

#[wasm_bindgen]
pub fn sha256_compress_final_js(data: Vec<Uint8Array>) -> Vec<u8> {
    let values_vec: Vec<Vec<u8>> = data.iter().map(uint8_array_to_vec_u8).collect();
    let refs: Vec<&Vec<u8>> = values_vec.iter().collect();
    sha256_compress_final(&refs)
}

#[wasm_bindgen]
pub fn sha256_compress_js(data: Vec<Uint8Array>) -> Vec<u8> {
    let values_vec: Vec<Vec<u8>> = data.iter().map(uint8_array_to_vec_u8).collect();
    let refs: Vec<&Vec<u8>> = values_vec.iter().collect();
    sha256_compress(&refs)
}

#[cfg(test)]
mod tests {
    use crate::commitment::{bytes_to_hex, hex_to_bytes};
    use super::*;

    #[test]
    pub fn bruh() {
        let a = hex_to_bytes("0x870d5497ca7934fa6906ddfc6934d11934afa6be09aa2cc3e5f4faf730e63e023f9cef85f79eb61da95055b23538baacd8d1f38a638b712c0dae410ffd74612e".to_string());
        let data = vec![&a];

        let result = sha256_compress(&data);
        println!("{}", bytes_to_hex(result));
    }
}
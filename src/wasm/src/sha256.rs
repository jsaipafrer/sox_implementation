use std::u64;
use sha2::{Digest, Sha256};
use sha2_compress::{Sha2, SHA256};

pub fn js_u8_array_to_array_u32(vec: &[u8]) -> [u32; 8] {
    if vec.len() != 32 {
        panic!("Input vector must have exactly 32 elements.");
    }

    let mut res: [u32; 8] = [0; 8];

    for i in 0..8 {
        res[i as usize] = ((vec[i * 4] as u32) << 24)
            | ((vec[i * 4 + 1] as u32) << 16)
            | ((vec[i * 4 + 2] as u32) << 8)
            | (vec[i * 4 + 3] as u32);
    }

    res
}

pub fn array_u32_to_js_u8_array(array: &[u32; 8]) -> Vec<u8> {
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
    let prev_hash = if data.len() == 1 { SHA256 } else { js_u8_array_to_array_u32(data[0]) };
    let curr_block = if data.len() == 1 { data[0] } else { data[1] };

    let h1 = js_u8_array_to_array_u32(&curr_block[..32]);
    let h2 = js_u8_array_to_array_u32(&curr_block[32..]);
    let res = prev_hash.compress(&h1, &h2);

    array_u32_to_js_u8_array(&res)
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
    prev_hash
    block
    data_len
 */
pub fn sha256_compress_final(data: &Vec<&Vec<u8>>) -> Vec<u8> {
    let prev_hash = if data.len() == 2 { SHA256 } else { js_u8_array_to_array_u32(data[0]) };
    let curr_block = if data.len() == 2 { data[0] } else { data[1] };
    let data_len = if data.len() == 2 {
        u64::from_be_bytes(data[1].clone().try_into().unwrap())
    } else {
        u64::from_be_bytes(data[2].clone().try_into().unwrap())
    };

    let padded = sha256_padding(&curr_block, data_len);
    let h1 = js_u8_array_to_array_u32(&padded[..32]);
    let h2 = js_u8_array_to_array_u32(&padded[32..64]);
    let mut res = prev_hash.compress(&h1, &h2);

    if padded.len() > 64 {
        // an extra block left due to the padding
        let h1 = js_u8_array_to_array_u32(&padded[64..96]);
        let h2 = js_u8_array_to_array_u32(&padded[96..]);
        res = res.compress(&h1, &h2);
    }

    array_u32_to_js_u8_array(&res)
}

pub fn sha256(data: &[u8]) -> Vec<u8> {
    let mut hasher = Sha256::new();
    hasher.update(data);
    hasher.finalize().to_vec()
}
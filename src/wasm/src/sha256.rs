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

fn sha256_padding(data_len: usize) -> Vec<u8> {
    let data_len_bits = data_len * 8;
    let mut padding = vec![0x80u8];

    while (padding.len() * 8 + data_len_bits) % 512 != 448 {
        padding.push(0u8);
    }

    padding.extend(&(data_len_bits as u64).to_be_bytes());

    padding
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
        usize::from_be_bytes(data[1].clone().try_into().unwrap())
    } else {
        usize::from_be_bytes(data[2].clone().try_into().unwrap())
    };

    let new_blocks = [curr_block.clone(), sha256_padding(data_len)].concat();
    let h1 = js_u8_array_to_array_u32(&new_blocks[..32]);
    let h2 = js_u8_array_to_array_u32(&new_blocks[32..64]);
    let res = prev_hash.compress(&h1, &h2);

    if new_blocks.len() > 64 {
        // an extra block left due to the padding
        let h1 = js_u8_array_to_array_u32(&new_blocks[64..96]);
        let h2 = js_u8_array_to_array_u32(&new_blocks[96..]);
        let res = res.compress(&h1, &h2);

        array_u32_to_js_u8_array(&res)
    } else {
        // hashing done
        array_u32_to_js_u8_array(&res)
    }
}

pub fn sha256(data: &[u8]) -> Vec<u8> {
    let mut hasher = Sha256::new();
    hasher.update(data);
    hasher.finalize().to_vec()
}
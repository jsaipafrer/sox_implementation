use std::cmp::min;

pub fn equal(data: &Vec<&Vec<u8>>) -> Vec<u8> {
    if data.len() < 2 {
        panic!("Need at least two elements to check for equality")
    }

    for i in 1..data.len() {
        if data[0].len() != data[i].len() {
            return vec![0u8];
        }
        for j in 0..data[i].len() {
            if data[0][j] != data[i][j] {
                return vec![0u8];
            }
        }
    }

    vec![1u8]
}

fn copy_to_padded(src: &[u8], dst: &mut [u8]) {
    let end = min(src.len(), dst.len());
    for i in 0..end {
        dst[dst.len() - end + i] = src[i];
    }
}

pub fn binary_add(data: &Vec<&Vec<u8>>) -> Vec<u8> {
    if data.len() != 2 {
        panic!("Binary addition only accepts 2 arrays of bytes")
    }

    let mut left = [0u8; 16];
    let mut right = [0u8; 16];
    copy_to_padded(&data[0], &mut left);
    copy_to_padded(&data[1], &mut right);

    (u128::from_be_bytes(left) + u128::from_be_bytes(right)).to_be_bytes().to_vec()
}

pub fn binary_mult(data: &Vec<&Vec<u8>>) -> Vec<u8> {
    if data.len() != 2 {
        panic!("Binary multiplication only accepts 2 arrays of bytes")
    }

    let mut left = [0u8; 16];
    let mut right = [0u8; 16];
    copy_to_padded(&data[0], &mut left);
    copy_to_padded(&data[1], &mut right);

    (u128::from_be_bytes(left) * u128::from_be_bytes(right)).to_be_bytes().to_vec()
}

pub fn concat_bytes(data: &Vec<&Vec<u8>>) -> Vec<u8> {
    let mut res = data[0].iter().map(|x| x.clone()).collect();
    
    for i in 1..data.len() {
        let next = data[i].iter().map(|x| x.clone()).collect();
        res = [res, next].concat();
    }
    
    res
}
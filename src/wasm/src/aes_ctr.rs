use aes::cipher::{KeyIvInit, StreamCipher};
use rand::RngCore;

type Aes128Ctr128BE = ctr::Ctr128BE<aes::Aes128>;

/*
 * data = [
 *      key (16 bytes),
 *      blocks (<=64 bytes),
 *      IV (16 bytes)
 * ]
 */
pub fn encrypt_block(data: &Vec<&Vec<u8>>) -> Vec<u8> {
    if data.len() < 3 {
        panic!("AES encryption/decryption requires a key, blocks and counter starting value")
    }

    let key= &data[0][..16];
    let blocks = &data[1][..];
    let ctr = &data[2][..];

    internal_encrypt(key, blocks, ctr)
}

pub fn decrypt_block(data: &Vec<&Vec<u8>>) -> Vec<u8> {
    encrypt_block(data)
}

fn internal_encrypt(key: &[u8], block: &[u8], ctr: &[u8]) -> Vec<u8> {
    let mut res = vec![0u8; block.len()];
    res.clone_from_slice(block);

    let mut cipher = match Aes128Ctr128BE::new_from_slices(key, ctr) {
        Ok(c) => c,
        Err(e) => { crate::log("Key should be 16 bytes"); panic!() }
    };
    cipher.apply_keystream(&mut res);

    res
}

// =================================================================================================

#[test]
fn test_aes_ctr_blocks() {
    let mut rng = rand::rng();
    for i in 1..(1<<12) {
        let mut data = vec![0u8; i];
        rng.fill_bytes(&mut data);
        let data_orig = data.clone();

        let mut key = vec![0u8; 16];
        rng.fill_bytes(&mut key);

        let mut ctr = vec![0u8;64];
        rng.fill_bytes(&mut ctr);

        // encrypt
        let ct = encrypt_block(&vec![&key, &data, &ctr]);

        // decrypt
        let pt = decrypt_block(&vec![&key, &ct, &ctr]);

        assert_eq!(pt, data_orig)
    }
}
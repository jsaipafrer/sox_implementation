use aes::cipher::{KeyIvInit, StreamCipher};
use rand::RngCore;

type Aes128Ctr128BE = ctr::Ctr128BE<aes::Aes128>;

// Returns ct = IV (16 bytes) || Enc_k(data) (variable size)
// The IV is stored in big-endian representation
pub fn encrypt_and_prepend_iv(mut data: &mut [u8], key: &[u8]) -> Vec<u8> {
    let mut rng = rand::rng();
    let mut iv = vec![0u8; 16];
    rng.fill_bytes(&mut iv);

    let mut cipher = match Aes128Ctr128BE::new_from_slices(key, &iv) {
        Ok(c) => c,
        Err(e) => { crate::log("Key should be 16 bytes"); panic!() }
    };

    cipher.apply_keystream(&mut data);

    // let mut ct = vec![0u8; block_size - 16];
    // iv.extend(iv);
    iv.extend(data.iter());

    iv
}


// Returns the plaintext corresponding to the ciphertext CT with AES-128 in counter mode
// Expects the following format of ciphertext:
//      ct = IV (16 bytes) || Enc_k(data) (variable size)
//      IV must be in big-endian representation
pub fn decrypt(ct: &[u8], key: &[u8]) -> Vec<u8> {
    let iv = &ct[..16];
    let mut cipher = match Aes128Ctr128BE::new_from_slices(key, &iv) {
        Ok(c) => c,
        Err(e) => { crate::log("Key should be 16 bytes"); panic!() }
    };
    
    let mut res = ct[16..].to_vec();

    cipher.apply_keystream(&mut res);

    res
}

#[test]
fn test_encrypt_decrypt_random_data() {
    let mut rng = rand::rng();
    for i in 1..(1<<16) {
        let mut data = vec![0u8; i];
        rng.fill_bytes(&mut data);
        let plaintext = data.clone();

        let mut key = vec![0u8; 16];
        rng.fill_bytes(&mut key);

        // encrypt
        let ct = encrypt_and_prepend_iv(&mut data, &key);

        // decrypt
        let dec_ct = decrypt(&ct, &key);

        assert_eq!(plaintext, dec_ct);
    }
}
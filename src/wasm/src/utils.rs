use std::cmp::min;
use wasm_bindgen::prelude::wasm_bindgen;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    pub fn log(s: &str);

    #[wasm_bindgen(js_namespace = console)]
    pub fn error(s: &str);
}

pub fn die(s: &str) -> ! {
    error(s);
    panic!("{}", s);
}

pub fn split_ct_blocks(ct: &[u8], block_size: usize) -> Vec<Vec<u8>> {
    let mut res = vec![ct[..16].to_vec()]; // IV

    for i in (16..ct.len()).step_by(block_size) {
        let end = min(i + block_size, ct.len());
        res.push(ct[i..end].to_vec());
    }

    res
}
use js_sys::{Array, Uint8Array};
use rand::{Rng, RngCore};
use rand::prelude::SliceRandom;
use sha3::{Digest, Keccak256};
use wasm_bindgen::prelude::wasm_bindgen;
use rayon::prelude::*;
use crate::{split_ct_blocks, CompiledCircuit};

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

pub fn acc(values: &[Vec<u8>]) -> Vec<u8> {
    if values.len() == 0 {
        return vec![];
    }
    if values.len() == 1 {
        return hash(&values[0]);
    }

    let hashes: Vec<Vec<u8>> = values.iter().map(hash).collect();

    compute_merkle_root(hashes)
}

pub fn prove(values: &[Vec<u8>], indices: &[usize]) -> Vec<Vec<Vec<u8>>> {
    // TODO error handling (>0 values, >0 indices, values.len >= indices.len, check if all indices are within values)
    let mut a: Vec<usize> = indices.to_vec();
    a.sort();

    let mut proof: Vec<Vec<Vec<u8>>> = vec![];

    let mut curr_layer: Vec<Vec<u8>> = values.iter().map(hash).collect();

    while curr_layer.len() > 1 {
        let mut b: Vec<(usize, usize)> = vec![];
        let mut diff: Vec<usize> = vec![];

        let mut i = 0;
        while i < a.len() {
            let idx = a[i];
            let neighbor = get_neighbor_idx(&idx);
            if idx < neighbor {
                b.push((idx, neighbor));
            } else {
                b.push((neighbor, idx));
            }

            if i < a.len() - 1 && neighbor == a[i + 1] {
                i += 1;
            }

            if !a.contains(&neighbor) && neighbor < curr_layer.len() {
                diff.push(neighbor);
            }
            i += 1;
        }


        proof.push(diff
            .iter().rev()
            .map(|&i| curr_layer[i].clone())
            .collect());

        curr_layer = compute_next_layer(curr_layer);
        a = b.iter()
            .map(|p| p.0 >> 1)
            .collect();
    }

    proof
}

pub fn verify(root: &Vec<u8>, indices: &Vec<usize>, values: &[Vec<u8>], proof: &Vec<Vec<Vec<u8>>>) -> bool {
    if indices.len() != values.len() { return false; }

    let mut proof_copy = proof.clone();
    let mut current_indices = indices.clone();
    let mut layer: Vec<Vec<u8>> = values.iter().map(hash).collect();

    for proof_layer in &mut proof_copy {
        let mut b: Vec<(usize, usize)> = vec![];

        for i in &current_indices {
            let neighbor = get_neighbor_idx(i);

            if neighbor < *i { b.push((neighbor, i.clone())) }
            else { b.push((i.clone(), neighbor)) }
        }

        let mut next_indices: Vec<usize> = vec![];
        let mut next_layer: Vec<Vec<u8>> = vec![];

        let mut i = 0;
        while i < b.len() { // use a while loop because we cannot manually increment in for loops
            if i < b.len() - 1 && b[i].0 == b[i+1].0 {
                // duplicate found
                // this means that b[i][0] and b[i][1] are elements of
                // nextIndices. Furthermore, b[i] is computed based on
                // nextIndices[i] and since we skip the duplicates,
                // it can only be that b[i][0] == nextIndices[i]
                // => the corresponding values are valuesKeccak[i]
                // and valuesKeccak[i+1]
                next_layer.push(
                    concat_and_hash(&layer[i], &layer[i+1])
                );

                i += 1;
            } else if proof_layer.len() > 0 {
                let last_layer_val = proof_layer.pop().unwrap();

                if current_indices[i] % 2 == 1 {
                    next_layer.push(
                        concat_and_hash(&last_layer_val, &layer[i])
                    );
                } else {
                    next_layer.push(
                        concat_and_hash(&layer[i], &last_layer_val)
                    );
                }
            } else {
                // proofLayer is empty, move the element that must be combined to the next layer
                next_layer.push(layer[i].clone());
            }

            next_indices.push(current_indices[i] >> 1);
            i += 1;
        }

        layer = next_layer.clone();
        current_indices = next_indices.clone();
    }

    layer[0].eq(root)
}

pub fn prove_ext(values: &[Vec<u8>]) -> Vec<Vec<Vec<u8>>> {
    prove(values, &vec![values.len() - 1])
}

pub fn verify_ext(i: usize, prev_root: &Vec<u8>, curr_root: &Vec<u8>, added_val: &Vec<u8>, proof: &Vec<Vec<Vec<u8>>>) -> bool {
    verify(curr_root, &vec![i], &vec![added_val.clone()], proof) && verify_previous(prev_root, proof)
}

pub fn acc_ct(ct: &[u8], block_size: usize) -> Vec<u8> {
    let blocks = split_ct_blocks(ct, block_size);

    acc(&blocks)
}

pub fn acc_circuit(circuit: CompiledCircuit) -> Vec<u8> {
    let circuit_bytes_array = circuit.to_bytes_array();

    acc(&circuit_bytes_array)
}

fn compute_merkle_root(hashes: Vec<Vec<u8>>) -> Vec<u8> {
    let mut curr_layer = hashes;

    while curr_layer.len() > 1 {
        curr_layer = compute_next_layer(curr_layer)
    }

    curr_layer.remove(0)
}

fn compute_next_layer(curr_layer: Vec<Vec<u8>>) -> Vec<Vec<u8>> {
    (0..curr_layer.len()).step_by(2).collect::<Vec<_>>().par_iter().map(|&i| {
        if i < curr_layer.len() - 1 {
            concat_and_hash(&curr_layer[i], &curr_layer[i + 1])
        } else {
            curr_layer[i].clone()
        }
    }).collect()
}

fn to_bytes32(data: &Vec<u8>) -> Vec<u8> {
    if data.len() >= 32 {
        return data[..32].to_vec();
    }

    let mut res = data.to_vec();
    // res.reverse();
    res.extend(std::iter::repeat(0).take(32 - data.len()));
    // res.reverse();

    res
}

fn get_neighbor_idx(index: &usize) -> usize {
    if index % 2 == 0 {
        index + 1
    } else {
        index - 1
    }
}

fn verify_previous(prev_root: &Vec<u8>, proof: &Vec<Vec<Vec<u8>>>) -> bool {
    let mut proof_copy = proof.clone();
    let mut first_found = false;
    let mut computed_root: Vec<u8> = vec![];

    for i in 0..proof_copy.len() {
        while proof_copy[i].len() > 0 {
            if !first_found {
                computed_root = proof_copy[i].pop().unwrap();
                first_found = true;
            } else {
                computed_root = concat_and_hash(&proof_copy[i].pop().unwrap(), &computed_root);
            }
        }
    }

    computed_root.eq(prev_root)
}

fn concat_and_hash(left: &Vec<u8>, right: &Vec<u8>) -> Vec<u8> {
    let concat = [left.to_vec(), right.to_vec()].concat();
    hash(&concat)
}

fn hash(data: &Vec<u8>) -> Vec<u8> {
    let mut hasher = Keccak256::new();
    hasher.update(&data);

    hasher.finalize().to_vec()
}

pub fn proof_to_js_array(proof: Vec<Vec<Vec<u8>>>) -> Array {
    Array::from_iter(proof
        .iter()
        .map(|l| Array::from_iter(l
            .iter()
            .map(|v| Uint8Array::from(v.as_slice())))))
}

#[wasm_bindgen]
pub fn acc_js(values: Vec<Uint8Array>) -> Vec<u8> {
    let values_vec: Vec<Vec<u8>> = values.iter().map(uint8_array_to_vec_u8).collect();
    acc(&values_vec)
}

#[wasm_bindgen]
pub fn prove_js(values: Vec<Uint8Array>, indices: Array) -> Array {
    let values_vec: Vec<Vec<u8>> = values.iter().map(uint8_array_to_vec_u8).collect();
    let indices_usize = indices.iter().map(|i| i.as_f64().unwrap() as usize).collect::<Vec<usize>>();
    let proof = prove(&values_vec, &indices_usize);
    proof_to_js_array(proof)
}

#[wasm_bindgen]
pub fn prove_ext_js(values: Vec<Uint8Array>) -> Array {
    let values_vec: Vec<Vec<u8>> = values.iter().map(uint8_array_to_vec_u8).collect();
    let proof = prove_ext(&values_vec);
    proof_to_js_array(proof)
}

fn vec_u8_to_uint8_array(v: &Vec<u8>) -> Uint8Array {
    Uint8Array::from(v.as_slice())
}

fn uint8_array_to_vec_u8(arr: &Uint8Array) -> Vec<u8> {
    (0..arr.length())
        .map(|i| arr.get_index(i))
        .collect()
}

// =================================================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    pub fn test_acc_simple_root() {
        //          root
        //          /  \
        //         l1  l2
        //          |   |
        //       0xdead 0xbeef
        let values = vec![vec![0xde, 0xad], vec![0xbe, 0xef]];
        let expected_root = concat_and_hash(&hash(&values[0]), &hash(&values[1]));

        let root = acc(&values);
        assert_eq!(expected_root, root);
    }

    #[test]
    pub fn some_test() {
        let values = vec![vec![0xde, 0xad, 0xbe, 0xef], vec![0xc0, 0xff, 0xee]];
    }

    #[test]
    pub fn test_proof_simple_tree() {
        let values = vec![vec![0xde, 0xad], vec![0xbe, 0xef]];
        let indices = vec![0];
        let expected_proof = vec![vec![hash(&values[1])]];

        let proof = prove(&values, &indices);
        assert_eq!(expected_proof, proof);
    }

    #[test]
    pub fn test_accumulator() {
        let mut rng = rand::rng();
        for i in 1..1000usize {
            let values: Vec<Vec<u8>> = random_values(i);

            let h = acc(&values);

            // generate random number of indices
            let num_indices = rng.random_range(1..=i);
            // let num_indices = 3;
            let mut indices: Vec<usize> = (0..i).collect();
            indices.shuffle(&mut rng);
            indices.truncate(num_indices);
            indices.sort(); // ensure indices are increasing

            // Get the values at the indices of the vector `indices`
            let proof_values: Vec<Vec<u8>> = indices
                .iter()
                .map(|&idx| values[idx].clone())
                .collect();

            // Call `prove(&proof_values, &indices)` and store in `proof`
            let proof = prove(&values, &indices);

            // Call `verify(&h, &indices, &proof_values, &proof)` and assert that it should be true
            assert!(verify(&h, &indices, &proof_values, &proof), "Verification failed for i = {}", 1);
        }
    }

    #[test]
    pub fn test_incr_accumulator() {
        for i in 2..1000usize {
            let values: Vec<Vec<u8>> = random_values(i);

            let prev_h = acc(&values[..i - 1]);
            let curr_h = acc(&values);
            let proof = prove_ext(&values);

            assert!(verify_ext(i-1, &prev_h, &curr_h, values.last().unwrap(), &proof), "Verification failed for i = {}", i);
        }
    }

    fn random_values(num_bytes: usize) -> Vec<Vec<u8>> {
        let mut rng = rand::rng();

        (0..num_bytes)
            .map(|_| (0..1)
                .map(|_| rng.random_range(0..=255))
                .collect())
            .collect()
    }
}
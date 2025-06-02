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

    let tree = make_tree(values);
    let tree_no_root = &tree[..tree.len()-1];

    let mut a = indices.to_vec();
    a.sort();
    let mut proof: Vec<Vec<Vec<u8>>> = vec![]; // TODO allocate size
    for l in tree_no_root {
        let mut b_pruned: Vec<(usize, usize)> = vec![];
        let mut diff: Vec<usize> = vec![];

        let mut i = 0;
        while i < a.len() {
            // using while loop because for loops don't allow incrementing i inside the loop
            let idx = a[i];
            let neighbor = get_neighbor_idx(&idx);
            if idx < neighbor {
                b_pruned.push((idx, neighbor))
            } else {
                b_pruned.push((neighbor, idx))
            }

            if i < a.len() - 1 && neighbor == a[i+1] {
                i += 1;
            }

            if !a.contains(&neighbor) && neighbor < l.len() {
                diff.push(neighbor)
            }
            i += 1;
        }

        let mut new_proof_layer: Vec<Vec<u8>> = diff.iter().map(|i| l[*i].clone()).collect();
        new_proof_layer.reverse();
        proof.push(new_proof_layer);

        a = b_pruned.iter()
            .map(|p| if p.0 % 2 == 0 { p.0 } else { p.1 })
            .map(|i| i >> 1).collect();
    }

    proof
}

pub fn verify(root: &Vec<u8>, indices: &Vec<usize>, values: &[Vec<u8>], proof: &Vec<Vec<Vec<u8>>>) -> bool {
    if indices.len() != values.len() { return false; }

    let mut proof_copy = proof.clone();
    let mut indices_copy = indices.clone();
    let mut values_keccak: Vec<Vec<u8>> = values.iter().map(hash).collect();

    for l in &mut proof_copy {
        let mut b: Vec<(usize, usize)> = vec![];

        for i in &indices_copy {
            let neighbor = get_neighbor_idx(i);

            if neighbor < *i { b.push((neighbor, i.clone())) }
            else { b.push((i.clone(), neighbor)) }
        }

        let mut next_indices: Vec<usize> = vec![];
        let mut next_values: Vec<Vec<u8>> = vec![];

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
                next_values.push(
                    concat_and_hash(&values_keccak[i], &values_keccak[i+1])
                );

                i += 1;
            } else if l.len() > 0 {
                let corresponding_idx = indices_copy[i];
                let neighbor = get_neighbor_idx(&corresponding_idx);

                let last_layer_val = l.pop().unwrap();
                if neighbor < corresponding_idx {
                    next_values.push(
                        concat_and_hash(&last_layer_val, &values_keccak[i])
                    );
                } else {
                    next_values.push(
                        concat_and_hash(&values_keccak[i], &last_layer_val)
                    );
                }
            } else {
                // proofLayer is empty, move the element that must be combined to the next layer
                next_values.push(values_keccak[i].clone());
            }

            next_indices.push(indices_copy[i] >> 1);
            i += 1;
        }

        values_keccak = next_values.clone();
        indices_copy = next_indices.clone();
    }

    values_keccak[0].eq(root)
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
        curr_layer = (0..curr_layer.len()).step_by(2).collect::<Vec<_>>().par_iter().map(|&i| {
            if i < curr_layer.len() - 1 {
                concat_and_hash(&curr_layer[i], &curr_layer[i + 1])
            } else {
                curr_layer[i].clone()
            }
        }).collect();
    }

    curr_layer.remove(0)
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

fn make_tree(values: &[Vec<u8>]) -> Vec<Vec<Vec<u8>>> {
    if values.len() == 0 {
        return vec![vec![]];
    }
    if values.len() == 1 {
        return vec![vec![hash(&values[0])]];
    }

    let mut tree: Vec<Vec<Vec<u8>>> = vec![]; // TODO allocate some size already
    tree.push(values.iter().map(hash).collect());
    let mut curr_layer = tree.last().unwrap();

    while curr_layer.len() > 1 {
        let mut next_layer: Vec<Vec<u8>> = vec![];
        for i in (0..curr_layer.len()).step_by(2) {
            if i < curr_layer.len() - 1 {
                next_layer.push(concat_and_hash(&curr_layer[i], &curr_layer[i+1]));
            } else {
                next_layer.push(curr_layer[i].clone());
            }
        }
        tree.push(next_layer);
        curr_layer = tree.last().unwrap();
    }

    tree
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
    let concat = [to_bytes32(left).to_vec(), to_bytes32(right).to_vec()].concat();
    hash(&concat)
}

fn hash(data: &Vec<u8>) -> Vec<u8> {
    let mut hasher = Keccak256::new();
    let hashee = if data.len() < 32 {
        &to_bytes32(data)
    } else {
        data
    };
    hasher.update(&hashee);

    hasher.finalize().to_vec()
}

// =================================================================================================

#[test]
pub fn test_accumulator() {
    let mut rng = rand::rng();
    for i in 1..1000usize {
        let values: Vec<Vec<u8>> = (0..i)
            .map(|_| (0..1)
                .map(|_| rng.random_range(0..=255))
                .collect())
            .collect();


        let h = acc(&values);

        // Generate a Vec<usize> `indices` with a random number of indices
        let num_indices = rng.random_range(1..=i);
        // let num_indices = 3;
        let mut indices: Vec<usize> = (0..i).collect();
        indices.shuffle(&mut rng);
        indices.truncate(num_indices);
        indices.sort(); // Ensure indices are strictly increasing

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
    let mut rng = rand::rng();
    for i in 2..1000usize {
        let values: Vec<Vec<u8>> = (0..i)
            .map(|_| (0..1)
                .map(|_| rng.random_range(0..=255))
                .collect())
            .collect();

        let prev_h = acc(&values[..i-1]);
        let curr_h = acc(&values);
        let proof = prove_ext(&values);

        assert!(verify_ext(i-1, &prev_h, &curr_h, values.last().unwrap(), &proof), "Verification failed for i = {}", i);
    }
}
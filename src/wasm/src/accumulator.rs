use crate::utils::die;
use crate::{split_ct_blocks, CompiledCircuit};
use js_sys::{Array, Uint8Array};
use rayon::prelude::*;
use sha3::{Digest, Keccak256};
use wasm_bindgen::prelude::wasm_bindgen;

/// Converts a JavaScript Uint8Array to a Rust Vec<u8>
///
/// # Arguments
/// * `array` - JavaScript Uint8Array to convert
///
/// # Returns
/// A vector containing the bytes from the input array
pub fn uint8_array_to_vec_u8(array: &Uint8Array) -> Vec<u8> {
    (0..array.length()).map(|i| array.get_index(i)).collect()
}

/// Computes the accumulator value. It is the root of the Merkle tree built with `values`.
///
/// # Arguments
/// * `values` - Vector of byte vectors to accumulate
///
/// # Returns
/// A 32-byte vector containing the accumulated hash
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

/// Computes the accumulator value for a circuit
///
/// # Arguments
/// * `circuit` - The compiled circuit to accumulate
///
/// # Returns
/// A 32-byte vector containing the accumulated hash of the circuit's components
pub fn acc_circuit(circuit: CompiledCircuit) -> Vec<u8> {
    let circuit_bytes_array = circuit.to_abi_encoded();

    acc(&circuit_bytes_array)
}

/// Computes the accumulator value for a ciphertext
///
/// # Arguments
/// * `ct` - The ciphertext bytes
/// * `block_size` - Size of each block in bytes
///
/// # Returns
/// A 32-byte vector containing the accumulated hash of the ciphertext blocks
pub fn acc_ct(ct: &[u8], block_size: usize) -> Vec<u8> {
    let blocks = split_ct_blocks(ct, block_size);

    acc(&blocks)
}

/// Generates a proof for a subset of values in a sequence. Inspired by
/// https://arxiv.org/pdf/2002.07648
///
/// # Arguments
/// * `values` - Complete sequence of values
/// * `indices` - Indices of values to include in the proof
///
/// # Returns
/// A vector of proof components
pub fn prove(values: &[Vec<u8>], indices: &[u32]) -> Vec<Vec<Vec<u8>>> {
    if values.len() < indices.len() {
        die(&format!(
            "Number of indices ({}) is greater than number of values ({})",
            indices.len(),
            values.len()
        ));
    }
    if indices.len() == 0 || values.len() == 0 {
        return vec![];
    }
    let mut a = indices.to_vec();
    a.sort();

    let mut proof: Vec<Vec<Vec<u8>>> = vec![];

    let mut curr_layer: Vec<Vec<u8>> = values.iter().map(hash).collect();

    while curr_layer.len() > 1 {
        let mut b: Vec<(u32, u32)> = vec![];
        let mut diff: Vec<u32> = vec![];

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

            if !a.contains(&neighbor) && neighbor < curr_layer.len() as u32 {
                diff.push(neighbor);
            }
            i += 1;
        }

        proof.push(
            diff.iter()
                .rev()
                .map(|&i| curr_layer[i as usize].clone())
                .collect(),
        );

        curr_layer = compute_next_layer(curr_layer);
        a = b.iter().map(|p| p.0 >> 1).collect();
    }

    proof
}

/// Generates an extension proof for a sequence of values
///
/// # Arguments
/// * `values` - Sequence of values to generate the proof for
///
/// # Returns
/// A vector of proof components demonstrating correct extension
pub fn prove_ext(values: &[Vec<u8>]) -> Vec<Vec<Vec<u8>>> {
    prove(values, &vec![(values.len() - 1) as u32])
}

/// Converts a proof to a JavaScript array
///
/// # Arguments
/// * `proof` - Vector of proof components
///
/// # Returns
/// A JavaScript Array containing the proof components as Uint8Arrays
pub fn proof_to_js_array(proof: Vec<Vec<Vec<u8>>>) -> Array {
    Array::from_iter(
        proof
            .iter()
            .map(|l| Array::from_iter(l.iter().map(|v| Uint8Array::from(v.as_slice())))),
    )
}

/// JavaScript wrapper of the accumulator function
///
/// # Arguments
/// * `values` - Array of Uint8Arrays to accumulate
///
/// # Returns
/// Accumulated value as bytes
#[wasm_bindgen]
pub fn acc_js(values: Vec<Uint8Array>) -> Vec<u8> {
    let values_vec: Vec<Vec<u8>> = values.iter().map(uint8_array_to_vec_u8).collect();
    acc(&values_vec)
}

/// JavaScript wrapper of the prove function
///
/// # Arguments
/// * `values` - Array of Uint8Arrays containing all values in the tree
/// * `indices` - Array of indices for values to include in proof
///
/// # Returns
/// Array of arrays of Uint8Arrays containing the proof layers
#[wasm_bindgen]
pub fn prove_js(values: Vec<Uint8Array>, indices: Array) -> Array {
    let values_vec: Vec<Vec<u8>> = values.iter().map(uint8_array_to_vec_u8).collect();
    let indices_u32 = indices
        .iter()
        .map(|i| i.as_f64().unwrap() as u32)
        .collect::<Vec<u32>>();
    let proof = prove(&values_vec, &indices_u32);
    proof_to_js_array(proof)
}

/// JavaScript wrapper of the prove_ext function
///
/// # Arguments
/// * `values` - Array of Uint8Arrays containing the sequence of values
///
/// # Returns
/// Array of Uint8Arrays containing the extension proof components
#[wasm_bindgen]
pub fn prove_ext_js(values: Vec<Uint8Array>) -> Array {
    let values_vec: Vec<Vec<u8>> = values.iter().map(uint8_array_to_vec_u8).collect();
    let proof = prove_ext(&values_vec);
    proof_to_js_array(proof)
}

// Computes the root of a Merkle tree given the leaf hashes
fn compute_merkle_root(hashes: Vec<Vec<u8>>) -> Vec<u8> {
    let mut curr_layer = hashes;

    while curr_layer.len() > 1 {
        curr_layer = compute_next_layer(curr_layer)
    }

    curr_layer.remove(0)
}

// Computes the layer above in a Merkle tree. If the layer has odd number of nodes, the last one is
// copied as-is.
// FIXME could introduce issues when using it as proofs. E.g [1,2,3,4] and [1,2,h(3)||h(4)] lead to
// the same root !!
fn compute_next_layer(curr_layer: Vec<Vec<u8>>) -> Vec<Vec<u8>> {
    (0..curr_layer.len())
        .step_by(2)
        .collect::<Vec<_>>()
        .par_iter()
        .map(|&i| {
            if i < curr_layer.len() - 1 {
                concat_and_hash(&curr_layer[i], &curr_layer[i + 1])
            } else {
                curr_layer[i].clone()
            }
        })
        .collect()
}

// Returns the index of the neighbor node
fn get_neighbor_idx(index: &u32) -> u32 {
    if index % 2 == 0 {
        index + 1
    } else {
        index - 1
    }
}

// Concatenates two 32-byte vectors and hashes the result. Panics if one of the vectors is not 32
// bytes long
fn concat_and_hash(left: &Vec<u8>, right: &Vec<u8>) -> Vec<u8> {
    assert_eq!(left.len(), 32);
    assert_eq!(right.len(), 32);

    let concat = [left.to_vec(), right.to_vec()].concat();
    hash(&concat)
}

// Computes the Keccak256 hash of a vector of bytes
fn hash(data: &Vec<u8>) -> Vec<u8> {
    let mut hasher = Keccak256::new();
    hasher.update(&data);

    hasher.finalize().to_vec()
}

// =================================================================================================

#[cfg(test)]
mod tests {
    use super::*;
    use rand::prelude::SliceRandom;
    use rand::Rng;

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
        for i in 1..1000u32 {
            let values: Vec<Vec<u8>> = random_values(i);

            let h = acc(&values);

            // generate random number of indices
            let num_indices = rng.random_range(1..=i as usize);
            // let num_indices = 3;
            let mut indices: Vec<u32> = (0..i).collect();
            indices.shuffle(&mut rng);
            indices.truncate(num_indices);
            indices.sort(); // ensure indices are increasing

            // Get the values at the indices of the vector `indices`
            let proof_values: Vec<Vec<u8>> = indices
                .iter()
                .map(|&idx| values[idx as usize].clone())
                .collect();

            // Call `prove(&proof_values, &indices)` and store in `proof`
            let proof = prove(&values, &indices);

            // Call `verify(&h, &indices, &proof_values, &proof)` and assert that it should be true
            assert!(
                verify(&h, &indices, &proof_values, &proof),
                "Verification failed for i = {}",
                1
            );
        }
    }

    #[test]
    pub fn test_incr_accumulator() {
        for i in 2..1000u32 {
            let values: Vec<Vec<u8>> = random_values(i);

            let prev_h = acc(&values[..(i - 1) as usize]);
            let curr_h = acc(&values);
            let proof = prove_ext(&values);

            assert!(
                verify_ext(i - 1, &prev_h, &curr_h, values.last().unwrap(), &proof),
                "Verification failed for i = {}",
                i
            );
        }
    }

    fn random_values(num_bytes: u32) -> Vec<Vec<u8>> {
        let mut rng = rand::rng();

        (0..num_bytes)
            .map(|_| (0..1).map(|_| rng.random_range(0..=255)).collect())
            .collect()
    }

    /// Verifies an extension proof. Not useful at the moment apart from testing.
    ///
    /// # Arguments
    /// * `i` - Position in the sequence
    /// * `prev_h` - Previous accumulator value
    /// * `curr_h` - Current accumulator value
    /// * `value` - Value being added
    /// * `proof` - Extension proof components
    ///
    /// # Returns
    /// true if the proof is valid, false otherwise
    fn verify_ext(
        i: u32,
        prev_root: &Vec<u8>,
        curr_root: &Vec<u8>,
        added_val: &Vec<u8>,
        proof: &Vec<Vec<Vec<u8>>>,
    ) -> bool {
        verify(curr_root, &vec![i], &vec![added_val.clone()], proof)
            && verify_previous(prev_root, proof)
    }

    /// Verifies a Merkle proof for multiple values in a tree. Inspired by
    /// https://arxiv.org/pdf/2002.07648
    ///
    /// # Arguments
    /// * `root` - Expected Merkle root hash
    /// * `indices` - Vector of indices for the values being proven
    /// * `values` - Slice of values being proven
    /// * `proof` - Vector of proof layers, where each layer contains the sibling hashes needed for
    ///             verification
    ///
    /// # Returns
    /// `true` if:
    /// - The number of indices matches the number of values
    /// - The proof successfully reconstructs the Merkle root
    /// - All sibling relationships are valid
    /// `false` otherwise
    ///
    fn verify(
        root: &Vec<u8>,
        indices: &Vec<u32>,
        values: &[Vec<u8>],
        proof: &Vec<Vec<Vec<u8>>>,
    ) -> bool {
        if indices.len() != values.len() {
            return false;
        }

        let mut proof_copy = proof.clone();
        let mut current_indices = indices.clone();
        let mut layer: Vec<Vec<u8>> = values.iter().map(hash).collect();

        let mut paired: Vec<(u32, Vec<u8>)> =
            current_indices.into_iter().zip(layer.into_iter()).collect();
        paired.sort_by_key(|pair| pair.0);
        (current_indices, layer) = paired.into_iter().unzip();

        for proof_layer in &mut proof_copy {
            let mut b: Vec<(u32, u32)> = vec![];

            for i in &current_indices {
                let neighbor = get_neighbor_idx(i);

                if neighbor < *i {
                    b.push((neighbor, i.clone()))
                } else {
                    b.push((i.clone(), neighbor))
                }
            }

            let mut next_indices: Vec<u32> = vec![];
            let mut next_layer: Vec<Vec<u8>> = vec![];

            let mut i = 0;
            while i < b.len() {
                // use a while loop because we cannot manually increment in for loops
                if i < b.len() - 1 && b[i].0 == b[i + 1].0 {
                    // duplicate found
                    // this means that b[i][0] and b[i][1] are elements of
                    // nextIndices. Furthermore, b[i] is computed based on
                    // nextIndices[i] and since we skip the duplicates,
                    // it can only be that b[i][0] == nextIndices[i]
                    // => the corresponding values are valuesKeccak[i]
                    // and valuesKeccak[i+1]
                    next_layer.push(concat_and_hash(&layer[i], &layer[i + 1]));

                    i += 1;
                } else if proof_layer.len() > 0 {
                    let last_layer_val = proof_layer.pop().unwrap();

                    if current_indices[i] % 2 == 1 {
                        next_layer.push(concat_and_hash(&last_layer_val, &layer[i]));
                    } else {
                        next_layer.push(concat_and_hash(&layer[i], &last_layer_val));
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

    // Verifies the previous root of the accumulator. Used only for verify_ext.
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
}

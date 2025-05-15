import { Circuit } from "./evaluator";

export function compileBasicCircuit(numBlocks: number): Circuit {
    const circuit = new Array(3 * numBlocks + 1);

    // dummy gates for the ciphertext blocks
    for (let i = 0; i < numBlocks; ++i) circuit[i] = [-1, []];

    // AES decryption gates
    for (let i = numBlocks; i < 2 * numBlocks; ++i) {
        circuit[i] = [2, [i - numBlocks]];
    }

    // SHA256 compression functions
    circuit[2 * numBlocks] = [0, [numBlocks]]; // only depends on output of first AES gate
    for (let i = 2 * numBlocks + 1; i < 3 * numBlocks; ++i) {
        circuit[i] = [0, [i - 1, i - numBlocks]];
    }

    // final comparison gate
    circuit[3 * numBlocks] = [3, [3 * numBlocks, -1]]; // son of index -1 is the description

    return circuit;
}

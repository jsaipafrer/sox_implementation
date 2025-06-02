import { bigIntToUint8Array } from "../helpers";
import { Circuit } from "./evaluator";

export interface CompiledCircuit {
    circuit: Circuit;
    constants: (Uint8Array | undefined)[];
    version: number;
}

/**
 * Creates the compiled version of the basic circuit (AES + SHA256 + comparison)
 * for `ctBlocksNumber` blocks of input. The compiled circuit contains the
 * circuit itself as a list of gates, the constants and the version used.
 *
 * Note that `ctBlocksNumber` is the number of blocks of the ciphertext WITHOUT
 * the counter (== m in the paper)
 *
 * There are 3 constants. constants[0] is already set, constants[1] is empty and
 * should be used to put the decryption key, constants[2] is empty and should be
 * used to put in the expected item description.
 *
 * @param {number} ctBlocksNumber Number of blocks of the ciphertext (without the
 * counter)
 * @returns {CompiledCircuit} The compiled version of the basic circuit (AES +
 * SHA256 + comparison)
 */
export function compileBasicCircuit(ctBlocksNumber: number): CompiledCircuit {
    if (ctBlocksNumber < 1)
        throw new Error("The ciphertext should be at least one block long");
    //   m+1 dummy gates (m for the ciphertext, 1 for the counter)
    // + m-1 addition gates for incrementing the counter before AES (from 2nd one)
    // + m AES gates
    // + ceil(m/2) concatenation gates (output of 256b to 512b input for SHA)
    // + ceil(m/2) SHA compression gates
    // + 1 comparison gate
    // ~= 4*m + 1
    const halfBlocksNumber = Math.ceil(ctBlocksNumber / 2);
    const circuit = new Array(3 * ctBlocksNumber + 2 * halfBlocksNumber + 1);

    // dummy gates
    let i = 0;
    for (; i < ctBlocksNumber + 1; ++i) circuit[i] = [-1, []];

    // addition gates (gate[i-1] + 2)
    for (; i < 2 * ctBlocksNumber; ++i) circuit[i] = [3, [i - 1, -1]];

    // AES decryption gates
    for (; i < 3 * ctBlocksNumber; ++i) {
        circuit[i] = [
            2,
            // prettier-ignore
            [
                -3,                     // key
                i - 2 * ctBlocksNumber, // input block
                i - ctBlocksNumber,     // counter
            ],
        ];
    }

    // concatenation gates
    for (; i < 3 * ctBlocksNumber + halfBlocksNumber - 1; ++i) {
        const j = 2 * (i - 2 * ctBlocksNumber);
        circuit[i] = [6, [j, j + 1]];
    }

    // for the last concatenation gate, we have to insert padding if necessary
    if (ctBlocksNumber % 2 == 0) {
        // no padding necessary
        circuit[i] = [6, [3 * ctBlocksNumber - 2, 3 * ctBlocksNumber - 1]];
    } else {
        // with padding
        circuit[i] = [6, [3 * ctBlocksNumber - 1, -2]];
    }
    ++i;

    // SHA256 compression gates
    // first one only uses the output of the first concat gate
    circuit[i] = [0, [3 * ctBlocksNumber]];
    ++i;
    for (; i < 3 * ctBlocksNumber + 2 * halfBlocksNumber; ++i) {
        circuit[i] = [
            0,
            // prettier-ignore
            [
                i - 1,                  // previous block
                i - halfBlocksNumber,   // output of concat
            ],
        ];
    }

    // final comparison gate
    circuit[i] = [5, [i - 1, -4]];

    return {
        circuit,
        // prettier-ignore
        constants: [
            bigIntToUint8Array(BigInt(2), 32),  // -1: addition constant
            bigIntToUint8Array(BigInt(0), 32),  // -2: right padding constant
            undefined,                          // -3: key placeholder
            undefined,                          // -4: description placeholder
        ],
        version: 0,
    };
}

export function compileSHAOnlyCircuit(ctBlocksNumber: number): CompiledCircuit {
    if (ctBlocksNumber < 1)
        throw new Error("The ciphertext should be at least one block long");

    //   m dummy gates for ct
    // + m SHA gates
    // + 1 comparison gate
    // = 2*m + 1
    const circuit = new Array(2 * ctBlocksNumber);

    // dummy gates
    let i = 0;
    for (; i < ctBlocksNumber; ++i) circuit[i] = [-1, []];

    // SHA compression gates
    // SHA256 compression gates
    // first one only uses the output of the first gate
    circuit[i] = [0, [0]];
    ++i;
    for (; i < 2 * ctBlocksNumber; ++i) {
        circuit[i] = [
            0,
            // prettier-ignore
            [
                i - 1,                  // previous block
                i - ctBlocksNumber,   // output of concat
            ],
        ];
    }

    // comparison gate
    circuit[i] = [5, [i - 1, -1]];

    return {
        circuit,
        // prettier-ignore
        constants: [
            undefined, // -1: description placeholder
        ],
        version: 0,
    };
}

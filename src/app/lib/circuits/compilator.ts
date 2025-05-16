import { bigIntToUint8Array } from "../helpers";
import { Circuit } from "./evaluator";

type CompiledCircuit = {
    circuit: Circuit;
    constants: (Uint8Array | undefined)[];
    version: number;
};

export function compileBasicCircuit(ctBlocks: number): CompiledCircuit {
    //   m+1 dummy gates (m for the ciphertext, 1 for the counter)
    // + m-1 addition gates for incrementing the counter before AES (from 2nd one)
    // + m AES gates
    // + m SHA compression gates
    // + 1 comparison gate
    // = 4*m + 1
    const circuit = new Array(4 * ctBlocks + 1);

    // dummy gates
    let i = 0;
    for (; i < ctBlocks + 1; ++i) circuit[i] = [-1, []];

    // addition gates (gate[i-1] + 2)
    for (; i < 2 * ctBlocks; ++i) circuit[i] = [3, [i - 1, -1]];

    // AES decryption gates
    for (; i < 3 * ctBlocks; ++i) {
        circuit[i] = [
            2,
            [
                /* key */ -2,
                /* block */ i - 2 * ctBlocks,
                /* counter */ i - ctBlocks,
            ],
        ];
    }

    // SHA256 compression gates
    circuit[i] = [0, [2 * ctBlocks]]; // only depends on output of first AES gate
    ++i;
    for (; i < 4 * ctBlocks; ++i) {
        circuit[i] = [
            0,
            [
                /* previous block */ i - 1,
                /* output of corresponding AES */ i - ctBlocks,
            ],
        ];
    }

    // final comparison gate
    circuit[4 * ctBlocks] = [5, [4 * ctBlocks - 1, -3]];

    return {
        circuit,
        constants: [
            /* constant for additions */ bigIntToUint8Array(BigInt(2), 32),
            /* key placeholder */ undefined,
            /* description placeholder */ undefined,
        ],
        version: 0,
    };
}

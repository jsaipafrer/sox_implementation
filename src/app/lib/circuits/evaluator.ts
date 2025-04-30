import { sha256Compression } from "./components/sha256";
import { encryptBlock, decryptBlock } from "./components/aes-ctr";
import { bytesToHex, verifyAuthorization } from "viem/utils";

export type Gate = [number, number[]]; // [operationId, sons]
type Circuit = Gate[];
type Instruction = (key: Uint8Array, data: Uint8Array[]) => Promise<Uint8Array>;

const VERSIONS_INSTRUCTIONS: Instruction[][] = [
    /* version 0 */ [sha256Compression, encryptBlock, decryptBlock, equals],
];

async function equals(
    key: Uint8Array,
    data: Uint8Array[]
): Promise<Uint8Array> {
    return new Uint8Array([data[0] === data[1] ? 1 : 0]);
}

function getGateSons(gate: Gate, evaluatedCircuit: Uint8Array[]): Uint8Array[] {
    let sons = [];

    for (let s of gate[1]) sons.push(evaluatedCircuit[s]);

    return sons;
}

export async function evaluateCircuit(
    input: Uint8Array,
    inputBlockSize: number,
    circuit: Circuit,
    key: Uint8Array,
    version: number
): Promise<Uint8Array> {
    if (!(0 <= version && version < VERSIONS_INSTRUCTIONS.length))
        throw Error("invalid version");
    if (inputBlockSize < 0 || (inputBlockSize == 0 && input.length > 0))
        throw Error("Invalid block size");

    // if the input is empty (input.length == 0), we say that the circuit has a
    // single gate for the empty input and then the operations
    const numBlocks =
        input.length > 0 ? Math.ceil(input.length / inputBlockSize) : 1;
    const instructions = VERSIONS_INSTRUCTIONS[version];

    if (circuit[numBlocks - 1][0] >= 0 || circuit[numBlocks][0] < 0)
        throw Error(
            "Block size and input size don't match the circuit's dummy gates"
        );

    let evaluatedCircuit = [];
    // Adding the base elements
    for (let i = 0; i < numBlocks - 1; ++i) {
        const nextBlock = input.slice(
            inputBlockSize * i,
            inputBlockSize * (i + 1)
        );
        evaluatedCircuit.push(nextBlock);
    }

    const lastBlockIdx =
        input.length > 0 ? inputBlockSize * (numBlocks - 1) : 0;
    evaluatedCircuit.push(input.slice(lastBlockIdx)); // last block

    for (const gate of circuit.slice(numBlocks)) {
        const sons = getGateSons(gate, evaluatedCircuit);

        const op = instructions[gate[0]];
        evaluatedCircuit.push(await op(key, sons));
    }

    if (evaluatedCircuit.length != circuit.length)
        throw new Error(
            "something wrong happened during the circuit's evaluation"
        );

    return evaluatedCircuit.slice(-1)[0]; // last element
}

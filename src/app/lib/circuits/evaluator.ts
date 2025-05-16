import { sha256Compression } from "./components/sha256";
import { encryptBlock, decryptBlock } from "./components/aes-ctr";
import { binAdd, binMult, binEquals } from "./components/simpleOps";

export type Gate = [number, number[]]; // [operationId, sons]
export type Circuit = Gate[];
type EvaluatedGate = Uint8Array;
type EvaluatedCircuit = EvaluatedGate[];
type Instruction = (data: Uint8Array[]) => Promise<Uint8Array>;

const VERSIONS_INSTRUCTIONS: Instruction[][] = [
    /* version 0 */ [
        sha256Compression,
        encryptBlock,
        decryptBlock,
        binAdd,
        binMult,
        binEquals,
    ],
];

// Retrieves the value of the gate's sons after they are evaluated
function getEvaluatedSons(
    gate: Gate,
    evaluatedCircuit: Uint8Array[],
    constants?: Uint8Array[]
): Uint8Array[] {
    let sons = [];

    for (let s of gate[1]) {
        if (s >= 0) {
            if (s >= evaluatedCircuit.length)
                throw new Error(
                    "One of the sons' index is not smaller than the gate's"
                );
            sons.push(evaluatedCircuit[s]);
        } else if (constants) sons.push(constants[-(s + 1)]);
        else throw new Error(`Missing constant with id no ${s}`);
    }

    return sons;
}

/**
 * Evaluates the provided circuit using the provided input and constants,
 * following the version of the instruction set
 *
 * @param {Uint8Array[]} inputBlocks Input to the circuit split into blocks. It
 * must have as many elements as the number of dummy gates in the circuit
 * @param {Circuit} circuit Circuit to evaluate
 * @param {number} version Version of the instruction set
 * @param {Uint8Array[]?} constants Constants used for the evaluation
 * @returns {Promise<[EvaluatedGate, EvaluatedCircuit?]>} The value of the last
 * gate (root) and the entire circuit after evaluation
 */
export async function evaluateCircuit(
    inputBlocks: Uint8Array[],
    circuit: Circuit,
    version: number,
    constants?: Uint8Array[]
): Promise<[EvaluatedGate, EvaluatedCircuit?]> {
    if (inputBlocks.length == 0) return [new Uint8Array(), undefined];

    if (!(0 <= version && version < VERSIONS_INSTRUCTIONS.length))
        throw new Error("Invalid version");

    if (inputBlocks.length > circuit.length)
        throw new Error("Input has too many blocks");

    let evaluatedCircuit = [];
    // Adding the base elements
    for (let i = 0; i < inputBlocks.length - 1; ++i) {
        if (circuit[i][0] != -1)
            throw Error("Input doesn't fit in dummy gates");
        evaluatedCircuit.push(inputBlocks[i]);
    }

    const instructions = VERSIONS_INSTRUCTIONS[version];
    for (const gate of circuit.slice(inputBlocks.length)) {
        const sons = getEvaluatedSons(gate, evaluatedCircuit, constants);

        const op = instructions[gate[0]];
        if (!op)
            throw new Error(`Invalid opcode ${gate[0]} for version ${version}`);

        const result = await op(sons);
        evaluatedCircuit.push(result);
    }

    if (evaluatedCircuit.length != circuit.length)
        throw new Error(
            "something wrong happened during the circuit's evaluation"
        );

    return [evaluatedCircuit.slice(-1)[0], evaluatedCircuit];
}

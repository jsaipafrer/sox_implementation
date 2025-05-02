import { bytesToHex, concatBytes, keccak256 } from "viem";

function extendToBytes32(v: Uint8Array): Uint8Array {
    // return v;
    if (v.length >= 32) return v;

    const padding = new Uint8Array(32 - v.length);
    return concatBytes([padding, v]);
}

function hash(v: Uint8Array): Uint8Array {
    return keccak256<"bytes">(extendToBytes32(v), "bytes");
    // return v;
}

function concatAndHash(left: Uint8Array, right: Uint8Array): Uint8Array {
    return hash(concatBytes([extendToBytes32(left), extendToBytes32(right)]));
}

function roundDownToPowerOf2(n: number): number {
    if (n <= 0) {
        throw new Error("Input must be a positive integer");
    }

    let powerOf2 = 1;
    while (powerOf2 <= n) {
        powerOf2 <<= 1;
    }

    return powerOf2 >> 1;
}

function makeCompleteTree(values: Uint8Array[]): Uint8Array[][] {
    // computes a Merkle tree assuming that the number of values is a power of 2
    if (values.length == 0) return [[]];
    if (values.length == 1) return [values];

    const layers: Uint8Array[][] = [];
    let currentLayer = values.map(hash);

    while (currentLayer.length > 1) {
        layers.push(currentLayer);
        const nextLayer: Uint8Array[] = [];
        for (let i = 0; i < currentLayer.length; i += 2) {
            if (i + 1 < currentLayer.length) {
                nextLayer.push(
                    concatAndHash(currentLayer[i], currentLayer[i + 1])
                );
            } else {
                nextLayer.push(currentLayer[i]);
            }
        }

        currentLayer = nextLayer;
    }

    layers.push(currentLayer); // layer containing root
    return layers;
}

function makeTree(values: Uint8Array[]): Uint8Array[][] {
    const nVals = values.length;
    const nValsRounded = roundDownToPowerOf2(nVals);

    if (nVals == nValsRounded) {
        // easy case: we have 2^k values, the tree is complete
        return makeCompleteTree(values);
    } else {
        // Idea: compute the complete tree to the left with nValsRounded values
        // and compute another tree to the right and combine both with a new
        // root. This will have the structure we need for the proofs.
        const layersL = makeCompleteTree(values.slice(0, nValsRounded));
        const layersR = makeTree(values.slice(nValsRounded));

        // Combination step: layersR cannot be deeper than layersL, so we "zip"
        // each layer together starting from the top (last one on list)
        for (let i = 0; i < layersR.length; ++i) {
            for (let v of layersR[layersR.length - 1 - i]) {
                layersL[layersL.length - 1 - i].push(v);
            }
        }

        // compute the new root
        const [l, r] = layersL.slice(-1)[0];
        const root = concatAndHash(l, r);

        return [...layersL, [root]];
    }
}

function getNeighbor(index: number): number {
    if (index % 2 == 0) return index + 1;
    else return index - 1;
}

function acc(values: Uint8Array[]): Uint8Array {
    return makeTree(values).slice(-1)[0][0];
}

function prove(values: Uint8Array[], provenIndices: number[]): Uint8Array[] {
    // from https://arxiv.org/pdf/2002.07648, slightly modified

    // FIXME bruh doesn't work with my tree structure, try something else...
    const tree = makeTree(values);

    let a = provenIndices;
    const proof: Uint8Array[] = [];
    for (let l of tree.slice(0, -1)) {
        const bPruned = [];
        const diff = [];
        for (let i = 0; i < a.length; ++i) {
            const idx = a[i];
            const neighbor = getNeighbor(idx);
            if (idx < neighbor) bPruned.push([idx, neighbor]);
            else bPruned.push([neighbor, idx]);

            if (neighbor == a[i + 1]) ++i; // skip duplicate
            if (!a.includes(neighbor)) diff.push(neighbor);
        }

        proof.push(...diff.map((i) => l[i]));
        a = bPruned
            .flat()
            .filter((i) => i % 2 == 0)
            .map((i) => i >>> 1);
    }

    // reversing the proof makes it easier (and cheaper) to verify on the smart contract
    return proof.toReversed();
}

const values = [1, 2, 3, 4, 5].map((v) => new Uint8Array(v));
const idx = [2, 4];
console.log(prove(values, idx));

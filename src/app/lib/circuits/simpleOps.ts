import {
    bigIntToUint8Array,
    bytesArraysAreEqual,
    uint8ArrayToBigInt,
} from "../helpers";

/**
 * Checks whether the 2 first arguments of `data` are equal
 * @param {Uint8Array[]} data The elements to compare
 * @returns {Promise<Uint8Array>} An array of 32 bytes. The LSB is 1 if the
 * elements are equal and 0 otherwise.
 */
export async function binEquals(data: Uint8Array[]): Promise<Uint8Array> {
    if (data.length != 2) throw new Error("Equality is for exactly 2 elements");

    const res = new Array(31);
    res.push(bytesArraysAreEqual(data[0], data[1]) ? 1 : 0);

    return new Uint8Array(res);
}

// Do the addition of 32 bytes Uint8Arrays. In case of overflow, only the 32 LSB
// are returned
function internalBinAdd(a: Uint8Array, b: Uint8Array): Uint8Array {
    if (a.length != 32 || b.length != 32)
        throw Error("Addition is only between 32 bytes arrays");

    return bigIntToUint8Array(
        uint8ArrayToBigInt(a) + uint8ArrayToBigInt(b),
        32
    );
}

/**
 * Performs the addition of the 2 elements in `data`. The arrays are interpreted
 * as big-endian representation of 32 bytes integers. If the result is larger
 * than 32 bytes, the 32 LSB are returned.
 * @param {Uint8Array[]} data The elements to add. Both must be 32 bytes long.
 * @returns {Promise<Uint8Array>} The result of the addition as a 32 bytes number
 */
export async function binAdd(data: Uint8Array[]): Promise<Uint8Array> {
    return internalBinAdd(data[0], data[1]);
}

// Do the product of 32 bytes Uint8Arrays. In case of overflow, only the
// 32 LSB are returned
function internalBinMult(a: Uint8Array, b: Uint8Array): Uint8Array {
    if (a.length != 32 || b.length != 32)
        throw Error("Multiplication is only between 32 bytes arrays");

    return bigIntToUint8Array(
        uint8ArrayToBigInt(a) * uint8ArrayToBigInt(b),
        32
    );
}

/**
 * Performs the product of the 2 elements in `data`. The arrays are interpreted
 * as big-endian representation of 32 bytes integers. If the result is larger
 * than 32 bytes, the 32 LSB are returned.
 * @param {Uint8Array[]} data The elements to multiply. Both must be 32 bytes
 * long.
 * @returns {Promise<Uint8Array>} The result of the product as a 32 bytes number
 */
export async function binMult(data: Uint8Array[]): Promise<Uint8Array> {
    return internalBinMult(data[0], data[1]);
}

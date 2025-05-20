import { bytesToHex, encodePacked, keccak256 } from "viem";
import { bytesArraysAreEqual, fileToBytes } from "./helpers";

export async function commitFile(
    files: FileList,
    key: Uint8Array
): Promise<Uint8Array> {
    const fileBytes = await fileToBytes(files[0]);
    return commit(fileBytes, key);
}

export function commit(data: Uint8Array, key: Uint8Array): Uint8Array {
    return keccak256<"bytes">(
        encodePacked(["bytes", "bytes"], [bytesToHex(data), bytesToHex(key)]),
        "bytes"
    );
}

export function openCommitment(
    commitment: Uint8Array,
    openingValue: [Uint8Array, Uint8Array]
): [Uint8Array, Uint8Array] {
    if (!bytesArraysAreEqual(commit(...openingValue), commitment))
        throw Error("Commitment and opening value do not match");

    return openingValue;
}

import { concatBytes } from "viem";

export function hexToBytes(hex: string): Uint8Array {
    if (hex[1] == "x") hex = hex.slice(2);
    if (hex.length % 2 != 0) {
        throw Error("input must have an even number of characters");
    }

    let res = new Uint8Array(hex.length / 2);

    for (let i = 0; i < hex.length; i += 2) {
        res[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }

    return res;
}

export function bytesToHex(bytes: Uint8Array, withPrefix?: boolean): string {
    let res = withPrefix ? "0x" : "";

    for (let i = 0; i < bytes.length; ++i) {
        let next = bytes[i].toString(16);
        if (bytes[i] < 0x10) {
            next = "0" + next;
        }
        res += next;
    }

    return res;
}

// Returns true if a and b have equal values
export function bytesArraysAreEqual(a: Uint8Array, b: Uint8Array): boolean {
    if (a === undefined && b === undefined) return true; // both are undefined/null
    if (a.length != b.length) return false;

    for (let i = 0; i < a.length; ++i) {
        if (a[i] != b[i]) return false;
    }

    return true;
}

export async function fileToByteArray(file: File): Promise<Uint8Array> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            if (reader.readyState === FileReader.DONE) {
                const fileBuffer = reader.result as ArrayBuffer;
                resolve(new Uint8Array(fileBuffer));
            }
        };
        reader.onerror = () => {
            reject(reader.error);
        };
        reader.readAsArrayBuffer(file);
    });
}

export function bytesToBlocks(
    data: Uint8Array,
    blockSize: number
): Uint8Array[] {
    const numBlocks = Math.ceil(data.length / blockSize);
    const paddingSize = numBlocks * blockSize - data.length;
    const res = new Array(numBlocks); // 0-padded to the right

    for (let i = 0; i < numBlocks; ++i) {
        let next = data.slice(blockSize * i, blockSize * (i + 1));

        if (next.length < blockSize) {
            let padding = new Uint8Array(paddingSize);
            next = concatBytes([padding, next]);
        }

        res[i] = next;
    }

    return res;
}

export function hexToBytes(hex: string): Uint8Array {
    if (hex.length % 2 != 0) {
        throw Error("input must have an even number of characters");
    }

    let res = new Uint8Array(hex.length / 2);

    for (let i = 0; i < hex.length; i += 2) {
        res[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }

    return res;
}

export function bytesToHex(bytes: Uint8Array): string {
    let res = "";

    for (let i = 0; i < bytes.length; ++i) {
        let next = bytes[i].toString(16);
        if (bytes[i] < 0x10) {
            next = "0" + next;
        }
        res += next;
    }

    return res;
}

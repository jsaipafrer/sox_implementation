interface Cipher {
    iv: string;
    ct: string;
}

const POSSIBLE_KEY_SIZES = [16, 24, 32]; // in bytes
const IV_SIZE = 16;
const COUNTER_SIZE = 64; // in bits, see https://developer.mozilla.org/en-US/docs/Web/API/AesCtrParams
const ALGORITHM = "AES-CTR";

function hexToBytes(hex: string): Uint8Array {
    if (hex.length % 2 != 0) {
        throw Error("input must have an even number of characters");
    }

    let res = new Uint8Array(hex.length / 2);

    for (let i = 0; i < hex.length; i += 2) {
        res[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }

    return res;
}

function bytesToHex(bytes: Uint8Array): string {
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

export async function generateKey(): Promise<Uint8Array> {
    let key = await crypto.subtle.generateKey(
        {
            name: ALGORITHM,
            length: 128,
        },
        true, // extractable
        ["encrypt", "decrypt"]
    );

    return new Uint8Array(await crypto.subtle.exportKey("raw", key));
}

export async function convertKey(key: Uint8Array): Promise<CryptoKey> {
    return await crypto.subtle.importKey("raw", key, ALGORITHM, false, [
        "encrypt",
        "decrypt",
    ]);
}

export async function encrypt(
    data: Uint8Array,
    key: Uint8Array,
    iv?: Uint8Array
): Promise<Cipher> {
    if (!POSSIBLE_KEY_SIZES.includes(key.length)) {
        throw Error("Key must be 16, 24 or 32 bytes long");
    }

    if (iv != undefined && iv.length != IV_SIZE) {
        throw Error("IV must be 16 bytes long");
    } else if (iv == undefined) {
        iv = crypto.getRandomValues(new Uint8Array(IV_SIZE));
    }

    const ct = await crypto.subtle.encrypt(
        {
            name: ALGORITHM,
            counter: iv,
            length: COUNTER_SIZE,
        },
        await convertKey(key),
        data
    );

    return {
        iv: bytesToHex(iv),
        ct: bytesToHex(new Uint8Array(ct)),
    };
}

export async function decrypt(
    data: Cipher,
    key: Uint8Array
): Promise<Uint8Array> {
    const iv = hexToBytes(data.iv);
    const ctBuffer = hexToBytes(data.ct);

    const decrypted = await crypto.subtle.decrypt(
        {
            name: ALGORITHM,
            counter: iv,
            length: COUNTER_SIZE,
        },
        await convertKey(key),
        ctBuffer
    );

    return new Uint8Array(decrypted);
}

import { hexToBytes, bytesToHex } from "../helpers";

interface Cipher {
    iv: string;
    ct: string;
}

const POSSIBLE_KEY_SIZES = [16, 24, 32]; // in bytes
const IV_SIZE = 16;
const COUNTER_SIZE = 64; // in bits, see https://developer.mozilla.org/en-US/docs/Web/API/AesCtrParams
const ALGORITHM = "AES-CTR";

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

async function internalEncrypt(
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

async function internalDecrypt(
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

function combineUint8Arrays(arrays: Uint8Array[]): Uint8Array {
    const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
    const res = new Uint8Array(totalLength);

    let offset = 0;
    for (const arr of arrays) {
        res.set(arr, offset);
        offset += arr.length;
    }

    return res;
}

export async function encryptBlock(
    key: Uint8Array,
    data: Uint8Array[]
): Promise<Uint8Array> {
    // TODO how to manage IV
    const block = combineUint8Arrays(data);
    const cipher = await internalEncrypt(block, key, new Uint8Array([0]));
    return hexToBytes(cipher.ct);
}

export async function decryptBlock(
    key: Uint8Array,
    data: Uint8Array[]
): Promise<Uint8Array> {
    const block = combineUint8Arrays(data);
    const cipher = {
        ct: bytesToHex(block),
        iv: "0", // TODO manage iv
    };

    return await internalDecrypt(cipher, key);
}

import { concatBytes } from "viem";
import { bytesToHex, fileToByteArray, hexToBytes } from "./helpers";

const ALGORITHM = "AES-CTR";

interface Cipher {
    iv: string;
    ct: string;
}

const POSSIBLE_KEY_SIZES = [16, 24, 32]; // in bytes
const IV_SIZE = 16;
const COUNTER_SIZE = 64; // in bits, see https://developer.mozilla.org/en-US/docs/Web/API/AesCtrParams

export async function generateKey(lengthBytes: number): Promise<Uint8Array> {
    if (!POSSIBLE_KEY_SIZES.includes(lengthBytes))
        throw Error(`Invalid key size of ${lengthBytes} bytes`);

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

async function convertKey(key: Uint8Array): Promise<CryptoKey> {
    return await crypto.subtle.importKey("raw", key, ALGORITHM, false, [
        "encrypt",
        "decrypt",
    ]);
}

export async function encryptFile(
    file: FileList,
    key: Uint8Array,
    iv?: Uint8Array
): Promise<Uint8Array> {
    const fileBytes = await fileToByteArray(file[0]);
    return await encrypt(fileBytes, key, iv);
}

export async function encrypt(
    data: Uint8Array,
    key: Uint8Array,
    iv?: Uint8Array
): Promise<Uint8Array> {
    if (!POSSIBLE_KEY_SIZES.includes(key.length)) {
        throw Error("Key must be 16, 24 or 32 bytes long");
    }

    if (!iv) {
        iv = crypto.getRandomValues(new Uint8Array(IV_SIZE));
    }

    if (iv.length != IV_SIZE) {
        throw Error("IV must be 16 bytes long");
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

    return concatBytes([iv, new Uint8Array(ct)]);
}

export async function decrypt(
    data: Uint8Array,
    key: Uint8Array
): Promise<Uint8Array> {
    if (data.length <= IV_SIZE)
        throw Error(
            "The data should have the following format [iv||ciphertext] where || is a concatenation"
        );

    const iv = data.slice(0, IV_SIZE);
    const ctBuffer = data.slice(IV_SIZE);

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

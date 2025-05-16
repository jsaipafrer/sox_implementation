import { fileToByteArray as fileToBytes } from "./helpers";

const POSSIBLE_KEY_SIZES = [16, 24, 32]; // in bytes
// 64B counter, see https://developer.mozilla.org/en-US/docs/Web/API/AesCtrParams
export const COUNTER_SIZE = 8; // in bytes
export const BLOCK_SIZE = 32; // in bytes
const ALGORITHM = "AES-CTR";

interface Cipher {
    counter: Uint8Array;
    ct: Uint8Array;
}

/**
 * Generates a cryptographic encryption and decryption key for later usage in
 * AES-CTR mode using the `crypto.subtle` API.
 *
 * @param {number} lengthBytes Length of the key in bytes. Must be 16, 24 or 32
 * @returns {Promise<[CryptoKey, Uint8Array]>} The generated key as a `CryptoKey`
 * and exported in raw format as a `Uint8Array`. The first one can be used as
 * such with `crypto.subtle`.
 */
export async function generateKey(
    lengthBytes: number
): Promise<[CryptoKey, Uint8Array]> {
    if (!POSSIBLE_KEY_SIZES.includes(lengthBytes)) {
        throw Error(
            `Key must be one of those sizes: ${POSSIBLE_KEY_SIZES} (in bytes)`
        );
    }
    let key = await crypto.subtle.generateKey(
        {
            name: ALGORITHM,
            length: lengthBytes * 8, // in bits
        },
        true, // extractable
        ["encrypt", "decrypt"]
    );

    return [key, new Uint8Array(await crypto.subtle.exportKey("raw", key))];
}

/**
 * Encrypts the given file interpreted as a big-endian byte array using AES-CTR.
 * The returned value contains the counter and the ciphertext.
 *
 * @param {File} file File to encrypt
 * @param {CryptoKey} key Encryption key
 * @param {Uint8Array} counter Starting value of the counter
 * @returns {Cipher} The file encrypted with AES-CTR mode
 */
export async function encryptFile(
    file: File,
    key: CryptoKey,
    counter: Uint8Array
): Promise<Cipher> {
    const fileBytes = await fileToBytes(file);
    return await encrypt(fileBytes, key, counter);
}

/**
 * Encrypts the given data using AES-CTR.
 *
 * @param {Uint8Array} data Data to encrypt
 * @param {CryptoKey} key Encryption key
 * @param {Uint8Array} counter Starting value of the counter
 * @returns The data encrypted with AES-CTR mode
 */
export async function encrypt(
    data: Uint8Array,
    key: CryptoKey,
    counter: Uint8Array
): Promise<Cipher> {
    if (counter.length != COUNTER_SIZE) {
        throw Error("Counter must be 16 bytes long");
    }

    const ct = await crypto.subtle.encrypt(
        {
            name: ALGORITHM,
            counter: counter,
            length: COUNTER_SIZE,
        },
        key,
        data
    );

    return {
        counter: counter,
        ct: new Uint8Array(ct),
    };
}

/**
 * Decrypts the given data using AES-CTR.
 *
 * @param {Cipher} data Counter + ciphertext to decrypt
 * @param {CryptoKey} key Encryption key
 * @returns The data decrypted with AES-CTR mode
 */
export async function decrypt(
    data: Cipher,
    key: CryptoKey
): Promise<Uint8Array> {
    const iv = data.counter;
    const ct = data.ct;

    const decrypted = await crypto.subtle.decrypt(
        {
            name: ALGORITHM,
            counter: iv,
            length: COUNTER_SIZE,
        },
        key,
        ct
    );

    return new Uint8Array(decrypted);
}

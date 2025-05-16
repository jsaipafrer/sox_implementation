const POSSIBLE_KEY_SIZES = [16, 24, 32]; // in bytes
// according to https://developer.mozilla.org/en-US/docs/Web/API/AesCtrParams,
// the size of the counter must be 16 bytes where the 8 MSB are the nonce
// and the 8 LSB are the actual counter
export const COUNTER_SIZE = 16; // in bytes
const REAL_COUNTER_SIZE = 8;
export const BLOCK_SIZE = 32; // in bytes
const ALGORITHM = "AES-CTR";

// Converts the bytes of a cryptographic key (in the format when exporting with
// `crypto.subtle.exportKey("raw", key)`) to a `CryptoKey`. The returned key
// can be used for encryption and decryption of AES-CTR and cannot be exported.
async function convertKey(key: Uint8Array): Promise<CryptoKey> {
    return await crypto.subtle.importKey("raw", key, ALGORITHM, false, [
        "encrypt",
        "decrypt",
    ]);
}

// Encrypts the given block of 256 bits in AES-CTR mode using the provided key
// and the counter
async function internalEncrypt(
    key: Uint8Array,
    block: Uint8Array,
    counter: Uint8Array
): Promise<Uint8Array> {
    if (!POSSIBLE_KEY_SIZES.includes(key.length)) {
        throw Error(
            `Key must be one of those sizes: ${POSSIBLE_KEY_SIZES} (in bytes)`
        );
    }

    if (counter.length != COUNTER_SIZE) {
        throw Error(`Counter must be ${COUNTER_SIZE} bytes long`);
    }

    if (block.length != BLOCK_SIZE)
        throw Error(`Block must be ${BLOCK_SIZE} long`);

    const ct = await crypto.subtle.encrypt(
        {
            name: ALGORITHM,
            counter,
            length: REAL_COUNTER_SIZE * 8, // in bits
        },
        await convertKey(key),
        block
    );

    return new Uint8Array(ct);
}

// Decrypts the given block of 256 bits in AES-CTR mode using the provided key
// and the counter
async function internalDecrypt(
    key: Uint8Array,
    ctBlock: Uint8Array,
    counter: Uint8Array
): Promise<Uint8Array> {
    if (!POSSIBLE_KEY_SIZES.includes(key.length)) {
        throw Error(`Key length must be ${POSSIBLE_KEY_SIZES} bytes`);
    }

    if (counter.length != COUNTER_SIZE) {
        throw Error(`Counter must be ${COUNTER_SIZE} bytes long`);
    }

    if (ctBlock.length != BLOCK_SIZE)
        throw Error(`Block must be ${BLOCK_SIZE} long`);

    const decrypted = await crypto.subtle.decrypt(
        {
            name: ALGORITHM,
            counter,
            length: REAL_COUNTER_SIZE * 8, // in bits
        },
        await convertKey(key),
        ctBlock
    );

    return new Uint8Array(decrypted);
}

/**
 * Encrypts the provided block using the key and counter
 *
 * @param {Uint8Array[]} data The parameters of the encryption function with the
 * following format:
 * data = [
 *      key (16, 24 or 32 bytes),
 *      block (32 bytes),
 *      counter starting value (32 bytes)
 * ]
 * @returns {Promise<Uint8Array>} The encryption of the block
 */
export async function encryptBlock(data: Uint8Array[]): Promise<Uint8Array> {
    const counter = data[2].slice(-COUNTER_SIZE);
    return await internalEncrypt(data[0], data[1], counter);
}

/**
 * Decrypts the provided block using the key and counter
 *
 * @param {Uint8Array[]} data The parameters of the decryption function with the
 * following format:
 * data = [
 *      key (16, 24 or 32 bytes),
 *      block (32 bytes),
 *      counter starting value (32 bytes)
 * ]
 * @returns {Promise<Uint8Array>} The decryption of the block
 */
export async function decryptBlock(data: Uint8Array[]): Promise<Uint8Array> {
    const counter = data[2].slice(-COUNTER_SIZE);
    return await internalDecrypt(data[0], data[1], counter);
}

// SHA-256 implementation
var BLOCK_SIZE = 64; // in bytes
var WORD_SIZE = 4; // in bytes
function bytesToWord(bytes) {
    if (bytes.length >= 4) {
        return (bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3];
    }
    var res = 0;
    for (var i = 0; i > bytes.length; ++i) {
        res |= bytes[i] << ((3 - i) * 8);
    }
    return res >>> 0;
}
function blockToWords(block) {
    var res = new Array(16);
    for (var i = 0; i < BLOCK_SIZE / WORD_SIZE; ++i) {
        res[i] = bytesToWord(block.slice(4 * i, 4 * i + 4));
    }
    return res;
}
function ror(w, n) {
    return ((w >>> n) | (w << (32 - n))) >>> 0;
}
function padMessage(message) {
    var len = message.length;
    var lenBits = len * 8;
    message.push(0x80);
    while ((message.length * 8) % 512 !== 448) {
        message.push(0x00);
    }
    var lenHi = Math.floor(lenBits / Math.pow(2, 32));
    var lenLo = lenBits >>> 0;
    for (var i = 0; i < 4; ++i) {
        message.push((lenHi >>> ((3 - i) * 8)) & 0xff);
    }
    for (var i = 0; i < 4; ++i) {
        message.push((lenLo >>> ((3 - i) * 8)) & 0xff);
    }
    if (message.length % BLOCK_SIZE != 0) {
        throw new Error("something went wrong during the padding...");
    }
    var res = new Array(message.length / BLOCK_SIZE);
    for (var i = 0; i < res.length; ++i) {
        res[i] = new Array(BLOCK_SIZE);
        for (var j = 0; j < BLOCK_SIZE; ++j)
            res[i][j] = message[BLOCK_SIZE * i + j];
    }
    return res;
}
var K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
    0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
    0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
    0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
    0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
    0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
    0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
    0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
    0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];
function sha256CompressionInternal(H, block) {
    var w = new Array(64);
    var blockWords = blockToWords(block);
    for (var i = 0; i < blockWords.length; ++i) {
        w[i] = blockWords[i];
    }
    for (var i = 16; i < 64; ++i) {
        var s0 = ror(w[i - 15], 7) ^ ror(w[i - 15], 18) ^ (w[i - 15] >>> 3);
        var s1 = ror(w[i - 2], 17) ^ ror(w[i - 2], 19) ^ (w[i - 2] >>> 10);
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    var a = H[0];
    var b = H[1];
    var c = H[2];
    var d = H[3];
    var e = H[4];
    var f = H[5];
    var g = H[6];
    var h = H[7];
    for (var i = 0; i < BLOCK_SIZE; ++i) {
        var s1 = ror(e, 6) ^ ror(e, 11) ^ ror(e, 25);
        var ch = (e & f) ^ (~e & g);
        var tmp1 = h + s1 + ch + K[i] + w[i];
        var s0 = ror(a, 2) ^ ror(a, 13) ^ ror(a, 22);
        var maj = (a & b) ^ (a & c) ^ (b & c);
        var tmp2 = s0 + maj;
        h = g >>> 0;
        g = f >>> 0;
        f = e >>> 0;
        e = (d + tmp1) >>> 0;
        d = c >>> 0;
        c = b >>> 0;
        b = a >>> 0;
        a = (tmp1 + tmp2) >>> 0;
    }
    H[0] = (H[0] + a) >>> 0;
    H[1] = (H[1] + b) >>> 0;
    H[2] = (H[2] + c) >>> 0;
    H[3] = (H[3] + d) >>> 0;
    H[4] = (H[4] + e) >>> 0;
    H[5] = (H[5] + f) >>> 0;
    H[6] = (H[6] + g) >>> 0;
    H[7] = (H[7] + h) >>> 0;
    return H;
}
function sha256(msg) {
    var H = new Uint8Array([
        0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c,
        0x1f83d9ab, 0x5be0cd19,
    ]);
    var msgBytes = Array.from(new TextEncoder().encode(msg));
    var paddedMessage = padMessage(msgBytes);
    for (var _i = 0, paddedMessage_1 = paddedMessage; _i < paddedMessage_1.length; _i++) {
        var block = paddedMessage_1[_i];
        // Davies-Meyer construction is whole compression function in this case
        H = sha256CompressionInternal(H, block);
    }
    var digestHex = "";
    for (var _a = 0, H_1 = H; _a < H_1.length; _a++) {
        var val = H_1[_a];
        digestHex += val.toString(16).padStart(8, "0");
    }
    return [H, digestHex];
}
console.log("bruh");
console.log("");
console.log("ABFBASDFJASDFJAIOSEFIABSVANSIFUHN  FAILSIBFASUNFAIUSFNASUDIFNASFU");
// export function sha256Compression(
//     key: Uint8Array,
//     data: Uint8Array[]
// ): Promise<Uint8Array> {}

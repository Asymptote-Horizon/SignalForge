/**
 * SignalForge - Engine Module
 * Concept: Bit-level data processing via WebAssembly with JavaScript fallback.
 * Operates on: ASCII<->bits, XOR stream cipher, CRC-8, Hamming(7,4) FEC.
 */

export const Engine = {
  isWasm: false,
  engineType: 'JavaScript fallback',
  wasmInstance: null,
  memory: null,

  // Memory buffer offsets in WASM
  inPtr: 0,
  outPtr: 0,
  auxPtr: 0,

  async init() {
    try {
      let wasmModule;
      const wasmUrl = './wasm/engine.wasm';

      if (typeof WebAssembly.instantiateStreaming === 'function') {
        try {
          const response = await fetch(wasmUrl);
          if (response.ok) {
            const result = await WebAssembly.instantiateStreaming(response);
            wasmModule = result.instance;
          }
        } catch (streamingErr) {
          console.warn('WASM streaming instantiate failed, falling back to arrayBuffer:', streamingErr);
        }
      }

      if (!wasmModule) {
        const resp = await fetch(wasmUrl);
        if (!resp.ok) throw new Error(`HTTP ${resp.status} fetching ${wasmUrl}`);
        const buffer = await resp.arrayBuffer();
        const result = await WebAssembly.instantiate(buffer);
        wasmModule = result.instance;
      }

      this.wasmInstance = wasmModule;
      this.memory = wasmModule.exports.memory;
      this.inPtr = wasmModule.exports.get_in_ptr ? wasmModule.exports.get_in_ptr() : 0;
      this.outPtr = wasmModule.exports.get_out_ptr ? wasmModule.exports.get_out_ptr() : 131072;
      this.auxPtr = wasmModule.exports.get_aux_ptr ? wasmModule.exports.get_aux_ptr() : 262144;
      this.isWasm = true;
      this.engineType = 'WebAssembly ✔ (C)';
      console.log('SignalForge Engine: WebAssembly loaded successfully. Version:', wasmModule.exports.engine_version ? wasmModule.exports.engine_version() : 100);
      return true;
    } catch (err) {
      console.warn('SignalForge Engine: WASM load failed, using pure JS engine.', err);
      this.isWasm = false;
      this.engineType = 'JavaScript fallback';
      return false;
    }
  },

  /* ------------------- XOR Stream Cipher ------------------- */
  xor(plainBytes, keyBytes) {
    if (!plainBytes || plainBytes.length === 0) return new Uint8Array(0);
    const key = (keyBytes && keyBytes.length > 0) ? keyBytes : new Uint8Array([83, 70]); // default 'SF'
    const len = plainBytes.length;

    if (this.isWasm && this.wasmInstance && this.memory) {
      const mem = new Uint8Array(this.memory.buffer);
      mem.set(plainBytes, this.inPtr);
      mem.set(key, this.auxPtr);
      this.wasmInstance.exports.xor_cipher(len, key.length);
      return new Uint8Array(mem.buffer, this.outPtr, len).slice();
    }

    // JS Fallback
    const out = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      out[i] = plainBytes[i] ^ key[i % key.length];
    }
    return out;
  },

  /* ------------------- CRC-8 Checksum (0x07) ------------------- */
  crc8(bytes) {
    if (!bytes || bytes.length === 0) return 0;
    const len = bytes.length;

    if (this.isWasm && this.wasmInstance && this.memory) {
      const mem = new Uint8Array(this.memory.buffer);
      mem.set(bytes, this.inPtr);
      return this.wasmInstance.exports.crc8(len) & 0xff;
    }

    // JS Fallback
    let crc = 0x00;
    for (let i = 0; i < len; i++) {
      crc ^= bytes[i];
      for (let j = 0; j < 8; j++) {
        if (crc & 0x80) {
          crc = ((crc << 1) ^ 0x07) & 0xff;
        } else {
          crc = (crc << 1) & 0xff;
        }
      }
    }
    return crc;
  },

  /* ------------------- Hamming(7,4) Encode ------------------- */
  hammingEncode(bits) {
    if (!bits || bits.length === 0) return new Uint8Array(0);
    const nBits = bits.length;
    const nBlocks = Math.ceil(nBits / 4);
    const totalCoded = nBlocks * 7;

    if (this.isWasm && this.wasmInstance && this.memory && totalCoded <= 131072) {
      const mem = new Uint8Array(this.memory.buffer);
      // Copy bits to IN buffer
      mem.fill(0, this.inPtr, this.inPtr + nBlocks * 4);
      mem.set(bits, this.inPtr);
      this.wasmInstance.exports.hamming74_encode(nBits);
      return new Uint8Array(mem.buffer, this.outPtr, totalCoded).slice();
    }

    // JS Fallback
    const out = new Uint8Array(totalCoded);
    for (let b = 0; b < nBlocks; b++) {
      const idx = b * 4;
      const d1 = idx < nBits ? bits[idx] : 0;
      const d2 = idx + 1 < nBits ? bits[idx + 1] : 0;
      const d3 = idx + 2 < nBits ? bits[idx + 2] : 0;
      const d4 = idx + 3 < nBits ? bits[idx + 3] : 0;

      const p1 = d1 ^ d2 ^ d4;
      const p2 = d1 ^ d3 ^ d4;
      const p3 = d2 ^ d3 ^ d4;

      const outIdx = b * 7;
      out[outIdx + 0] = p1;
      out[outIdx + 1] = p2;
      out[outIdx + 2] = d1;
      out[outIdx + 3] = p3;
      out[outIdx + 4] = d2;
      out[outIdx + 5] = d3;
      out[outIdx + 6] = d4;
    }
    return out;
  },

  /* ------------------- Hamming(7,4) Decode ------------------- */
  hammingDecode(codedBits, origBitLen) {
    if (!codedBits || codedBits.length === 0) {
      return { bits: new Uint8Array(0), correctedBlocks: 0, correctedPositions: [] };
    }

    const nBlocks = Math.floor(codedBits.length / 7);
    const totalDataBits = nBlocks * 4;

    if (this.isWasm && this.wasmInstance && this.memory && codedBits.length <= 131072) {
      const mem = new Uint8Array(this.memory.buffer);
      mem.set(codedBits, this.inPtr);
      const correctedBlocks = this.wasmInstance.exports.hamming74_decode(nBlocks);
      const correctedPositions = [];
      for (let i = 0; i < correctedBlocks; i++) {
        correctedPositions.push(mem[this.auxPtr + i]);
      }
      const rawDecoded = new Uint8Array(mem.buffer, this.outPtr, totalDataBits).slice();
      const finalLen = origBitLen !== undefined ? origBitLen : totalDataBits;
      const bits = rawDecoded.slice(0, Math.min(finalLen, totalDataBits));
      return { bits, correctedBlocks, correctedPositions };
    }

    // JS Fallback
    const outBits = new Uint8Array(totalDataBits);
    let correctedBlocks = 0;
    const correctedPositions = [];

    for (let b = 0; b < nBlocks; b++) {
      const inIdx = b * 7;
      let r1 = codedBits[inIdx + 0];
      let r2 = codedBits[inIdx + 1];
      let r3 = codedBits[inIdx + 2];
      let r4 = codedBits[inIdx + 3];
      let r5 = codedBits[inIdx + 4];
      let r6 = codedBits[inIdx + 5];
      let r7 = codedBits[inIdx + 6];

      const s1 = r1 ^ r3 ^ r5 ^ r7;
      const s2 = r2 ^ r3 ^ r6 ^ r7;
      const s3 = r4 ^ r5 ^ r6 ^ r7;
      const s = s1 + (s2 << 1) + (s3 << 2);

      if (s !== 0) {
        if (s === 1) r1 ^= 1;
        else if (s === 2) r2 ^= 1;
        else if (s === 3) r3 ^= 1;
        else if (s === 4) r4 ^= 1;
        else if (s === 5) r5 ^= 1;
        else if (s === 6) r6 ^= 1;
        else if (s === 7) r7 ^= 1;
        correctedPositions.push(b * 7 + s);
        correctedBlocks++;
      }

      const outIdx = b * 4;
      outBits[outIdx + 0] = r3; // d1
      outBits[outIdx + 1] = r5; // d2
      outBits[outIdx + 2] = r6; // d3
      outBits[outIdx + 3] = r7; // d4
    }

    const finalLen = origBitLen !== undefined ? origBitLen : totalDataBits;
    const bits = outBits.slice(0, Math.min(finalLen, totalDataBits));
    return { bits, correctedBlocks, correctedPositions };
  },

  /* ------------------- Count Errors ------------------- */
  countErrors(aBits, bBits) {
    const len = Math.min(aBits.length, bBits.length);
    let errors = 0;
    for (let i = 0; i < len; i++) {
      if ((aBits[i] & 1) !== (bBits[i] & 1)) errors++;
    }
    return errors;
  },

  /* ------------------- Binary / Decimal ------------------- */
  binToDec(bits) {
    let val = 0;
    for (let i = 0; i < bits.length; i++) {
      val = (val * 2) + (bits[i] & 1);
    }
    return val;
  },

  decToBin(val, nBits) {
    const bits = new Uint8Array(nBits);
    let temp = val;
    for (let i = nBits - 1; i >= 0; i--) {
      bits[i] = temp & 1;
      temp = Math.floor(temp / 2);
    }
    return bits;
  },

  /* ------------------- Benchmark: WASM vs JS ------------------- */
  benchmark(bitCount = 100000) {
    const testBits = new Uint8Array(bitCount);
    for (let i = 0; i < bitCount; i++) testBits[i] = (i * 7 + 3) & 1;

    // Test JS implementation
    const t0 = performance.now();
    // JS Hamming encode
    const nBlocks = Math.ceil(bitCount / 4);
    const jsCoded = new Uint8Array(nBlocks * 7);
    for (let b = 0; b < nBlocks; b++) {
      const idx = b * 4;
      const d1 = idx < bitCount ? testBits[idx] : 0;
      const d2 = idx + 1 < bitCount ? testBits[idx + 1] : 0;
      const d3 = idx + 2 < bitCount ? testBits[idx + 2] : 0;
      const d4 = idx + 3 < bitCount ? testBits[idx + 3] : 0;
      const p1 = d1 ^ d2 ^ d4;
      const p2 = d1 ^ d3 ^ d4;
      const p3 = d2 ^ d3 ^ d4;
      const o = b * 7;
      jsCoded[o] = p1; jsCoded[o+1] = p2; jsCoded[o+2] = d1;
      jsCoded[o+3] = p3; jsCoded[o+4] = d2; jsCoded[o+5] = d3; jsCoded[o+6] = d4;
    }
    const jsTime = performance.now() - t0;

    let wasmTime = null;
    if (this.isWasm && this.wasmInstance && this.memory) {
      // Chunk into 64K chunks if larger than buffer
      const chunkSize = 32000;
      const t1 = performance.now();
      const mem = new Uint8Array(this.memory.buffer);
      for (let offset = 0; offset < bitCount; offset += chunkSize) {
        const count = Math.min(chunkSize, bitCount - offset);
        mem.set(testBits.subarray(offset, offset + count), this.inPtr);
        this.wasmInstance.exports.hamming74_encode(count);
      }
      wasmTime = performance.now() - t1;
    }

    return {
      bits: bitCount,
      jsMs: Number(jsTime.toFixed(2)),
      wasmMs: wasmTime !== null ? Number(wasmTime.toFixed(2)) : 'N/A',
      speedup: wasmTime !== null && wasmTime > 0 ? Number((jsTime / wasmTime).toFixed(2)) : 'N/A'
    };
  }
};

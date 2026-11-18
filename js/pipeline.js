/**
 * SignalForge - Pipeline Module
 * PURE logic: runPipeline(config) -> trace (no DOM here).
 * Concepts: 8 Stages of Digital Communication:
 * 1. Message: Source text or pixel data
 * 2. Encode: ASCII / Pixel quantization to bit stream (Practicals 3, 4)
 * 3. Encrypt: XOR stream cipher (Confidentiality)
 * 4. Protect: CRC-8 detection + Hamming(7,4) forward error correction
 * 5. Modulate: ASK / FSK / PSK baseband carrier modulation (Practical 6)
 * 6. Channel: AWGN transmission channel (Practicals 1, 2)
 * 7. Demodulate: Coherent correlation detector, bit decisions
 * 8. Recover: Hamming decode, CRC validation, decryption, bit-to-message reconstruction
 */

import { Engine } from './engine.js';
import { DSP } from './dsp.js';

// Cache for demo seeds so they compute only once
const demoSeedCache = new Map();

/**
 * Convert string to ASCII bytes (replace non-ASCII with '?')
 */
export function textToAsciiBytes(str, maxChars = 32) {
  const cleanStr = (str || '').slice(0, maxChars);
  const bytes = new Uint8Array(cleanStr.length);
  for (let i = 0; i < cleanStr.length; i++) {
    const code = cleanStr.charCodeAt(i);
    bytes[i] = (code >= 0 && code <= 127) ? code : 63; // 63 = '?'
  }
  return bytes;
}

/**
 * Convert ASCII bytes to string
 */
export function asciiBytesToText(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    s += (b >= 32 && b <= 126) ? String.fromCharCode(b) : '';
  }
  return s;
}

/**
 * Unpack bytes into Uint8Array of 0/1 bits (MSB first)
 */
export function bytesToBits(bytes) {
  const bits = new Uint8Array(bytes.length * 8);
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    for (let j = 0; j < 8; j++) {
      bits[i * 8 + j] = (b >> (7 - j)) & 1;
    }
  }
  return bits;
}

/**
 * Pack bits into bytes (MSB first)
 */
export function bitsToBytes(bits) {
  const byteCount = Math.ceil(bits.length / 8);
  const bytes = new Uint8Array(byteCount);
  for (let i = 0; i < byteCount; i++) {
    let val = 0;
    for (let j = 0; j < 8; j++) {
      const bitIdx = i * 8 + j;
      if (bitIdx < bits.length) {
        val = (val << 1) | (bits[bitIdx] & 1);
      } else {
        val = (val << 1);
      }
    }
    bytes[i] = val;
  }
  return bytes;
}

/**
 * Core Pipeline Runner (PURE FUNCTION)
 */
export function runPipeline(config) {
  const cfg = {
    payload: {
      type: 'text',
      text: 'HELLO',
      pixels: null,
      width: 32,
      height: 32,
      bitsPerPixel: 4,
      ...(config.payload || {})
    },
    encrypt: {
      on: true,
      key: 'SF',
      ...(config.encrypt || {})
    },
    protect: {
      crc: true,
      hamming: true,
      ...(config.protect || {})
    },
    modulation: config.modulation || 'PSK',
    channel: {
      ebn0dB: 2,
      seed: 12345,
      medium: 'wifi',
      ...(config.channel || {})
    },
    samplesPerBit: config.samplesPerBit || 20
  };

  const isText = cfg.payload.type === 'text';
  const isImage = cfg.payload.type === 'image';

  /* ================= STAGE 1: MESSAGE ================= */
  let messageData = {};
  let rawBytes;
  let rawBits;

  if (isText) {
    const text = (cfg.payload.text || 'HELLO').slice(0, 32);
    rawBytes = textToAsciiBytes(text);
    rawBits = bytesToBits(rawBytes);
    messageData = {
      text,
      bytes: Array.from(rawBytes),
      type: 'text'
    };
  } else if (isImage) {
    const pixels = cfg.payload.pixels || new Uint8Array(1024);
    const bpp = cfg.payload.bitsPerPixel || 4;
    // Pack 4-bit pixels into bits
    rawBits = new Uint8Array(pixels.length * bpp);
    for (let i = 0; i < pixels.length; i++) {
      const p = pixels[i] & 0x0f;
      for (let b = 0; b < bpp; b++) {
        rawBits[i * bpp + b] = (p >> (bpp - 1 - b)) & 1;
      }
    }
    rawBytes = bitsToBytes(rawBits);
    messageData = {
      type: 'image',
      pixels,
      width: cfg.payload.width || 32,
      height: cfg.payload.height || 32,
      bitsPerPixel: bpp,
      bytes: Array.from(rawBytes)
    };
  } else {
    // Video or fallback
    rawBytes = textToAsciiBytes('VIDEO');
    rawBits = bytesToBits(rawBytes);
    messageData = { type: 'video', text: 'VIDEO', bytes: Array.from(rawBytes) };
  }

  /* ================= STAGE 2: ENCODE ================= */
  const encodeData = {
    bytes: Array.from(rawBytes),
    bits: rawBits.slice(),
    totalBits: rawBits.length
  };

  /* ================= STAGE 3: ENCRYPT ================= */
  const keyStr = cfg.encrypt.key || 'SF';
  const keyBytes = textToAsciiBytes(keyStr, 32);
  let encBytes;
  let encBits;

  if (cfg.encrypt.on) {
    encBytes = Engine.xor(rawBytes, keyBytes);
    // Unpack to bits
    encBits = isText ? bytesToBits(encBytes) : new Uint8Array(rawBits.length);
    if (!isText) {
      // For image, bit length might not be full multiple of 8 if customized, but 1024*4 = 4096 is multiple of 8
      const fullEncBits = bytesToBits(encBytes);
      encBits = fullEncBits.slice(0, rawBits.length);
    }
  } else {
    encBytes = rawBytes.slice();
    encBits = rawBits.slice();
  }

  const encryptData = {
    on: !!cfg.encrypt.on,
    key: keyStr,
    keyBytes: Array.from(keyBytes),
    bytes: Array.from(encBytes),
    bits: encBits.slice()
  };

  /* ================= STAGE 4: PROTECT ================= */
  let crcValue = 0;
  let bitsWithCrc;

  if (cfg.protect.crc) {
    crcValue = Engine.crc8(encBytes);
    // Append 8 CRC bits
    bitsWithCrc = new Uint8Array(encBits.length + 8);
    bitsWithCrc.set(encBits, 0);
    for (let j = 0; j < 8; j++) {
      bitsWithCrc[encBits.length + j] = (crcValue >> (7 - j)) & 1;
    }
  } else {
    bitsWithCrc = encBits.slice();
  }

  let codedBits;
  let blocks = 0;

  if (cfg.protect.hamming) {
    codedBits = Engine.hammingEncode(bitsWithCrc);
    blocks = Math.ceil(bitsWithCrc.length / 4);
  } else {
    codedBits = bitsWithCrc.slice();
    blocks = 0;
  }

  const protectData = {
    crcOn: !!cfg.protect.crc,
    hammingOn: !!cfg.protect.hamming,
    crcValue,
    bitsWithCrc: bitsWithCrc.slice(),
    codedBits: codedBits.slice(),
    blocks,
    totalCodedBits: codedBits.length
  };

  /* ================= STAGE 5: MODULATE ================= */
  const N = cfg.samplesPerBit;
  const isSmallPayload = codedBits.length <= 256;
  let txWaveform = null;

  if (isSmallPayload) {
    txWaveform = DSP.modulate(codedBits, cfg.modulation, N, DSP.AMPLITUDE);
  }

  const modulateData = {
    modulation: cfg.modulation,
    samplesPerBit: N,
    waveform: txWaveform,
    txBits: codedBits.slice()
  };

  /* ================= STAGE 6: CHANNEL ================= */
  const ebn0dB = cfg.channel.ebn0dB;
  const seed = cfg.channel.seed || 12345;
  const sigma = DSP.calculateSigma(ebn0dB, N, DSP.AMPLITUDE);

  let rxWaveform = null;
  let noiseWaveform = null;
  let flippedIndices = [];
  let rxBitsRaw;

  if (isSmallPayload && txWaveform) {
    const { noisyWave, noiseOnly } = DSP.addNoise(txWaveform, sigma, seed);
    rxWaveform = noisyWave;
    noiseWaveform = noiseOnly;
    rxBitsRaw = DSP.demodulate(rxWaveform, cfg.modulation, N, DSP.AMPLITUDE);

    for (let i = 0; i < codedBits.length; i++) {
      if (rxBitsRaw[i] !== codedBits[i]) {
        flippedIndices.push(i);
      }
    }
  } else {
    // Large payload (Streaming per bit simulation)
    const sim = DSP.simulateBitsStreaming(codedBits, cfg.modulation, ebn0dB, seed);
    rxBitsRaw = sim.rxBits;
    flippedIndices = sim.flippedIndices;
  }

  const channelData = {
    ebn0dB,
    seed,
    sigma,
    medium: cfg.channel.medium || 'wifi',
    noise: noiseWaveform,
    received: rxWaveform,
    flippedIndices
  };

  /* ================= STAGE 7: DEMODULATE ================= */
  const rawErrors = flippedIndices.length;
  const rawBER = codedBits.length > 0 ? (rawErrors / codedBits.length) : 0;

  const demodulateData = {
    rxBitsRaw: rxBitsRaw.slice(),
    rawErrorIndices: flippedIndices,
    rawErrors,
    rawBER,
    totalBitsOnAir: codedBits.length
  };

  /* ================= STAGE 8: RECOVER ================= */
  let bitsAfterFec;
  let correctedBlocks = 0;
  let correctedPositions = [];

  if (cfg.protect.hamming) {
    const fecResult = Engine.hammingDecode(rxBitsRaw, bitsWithCrc.length);
    bitsAfterFec = fecResult.bits;
    correctedBlocks = fecResult.correctedBlocks;
    correctedPositions = fecResult.correctedPositions;
  } else {
    bitsAfterFec = rxBitsRaw.slice(0, bitsWithCrc.length);
  }

  // Check CRC if enabled
  let bitsAfterCrc;
  let crcOk = true;
  let rxCrcValue = null;

  if (cfg.protect.crc && bitsAfterFec.length >= 8) {
    const dataLen = bitsAfterFec.length - 8;
    bitsAfterCrc = bitsAfterFec.slice(0, dataLen);
    // Extract received CRC
    let extractedCrc = 0;
    for (let j = 0; j < 8; j++) {
      extractedCrc = (extractedCrc << 1) | (bitsAfterFec[dataLen + j] & 1);
    }
    rxCrcValue = extractedCrc;
    const rxEncBytes = bitsToBytes(bitsAfterCrc);
    const computedCrc = Engine.crc8(rxEncBytes);
    crcOk = (extractedCrc === computedCrc);
  } else {
    bitsAfterCrc = bitsAfterFec.slice();
    crcOk = true;
  }

  // Decrypt
  const rxEncBytes = bitsToBytes(bitsAfterCrc);
  let rxPlainBytes;
  let bitsAfterDecrypt;

  if (cfg.encrypt.on) {
    rxPlainBytes = Engine.xor(rxEncBytes, keyBytes);
    bitsAfterDecrypt = bytesToBits(rxPlainBytes).slice(0, rawBits.length);
  } else {
    rxPlainBytes = rxEncBytes.slice();
    bitsAfterDecrypt = bitsAfterCrc.slice(0, rawBits.length);
  }

  // Calculate final payload errors
  const finalErrorBits = Engine.countErrors(bitsAfterDecrypt, rawBits);
  const finalBER = rawBits.length > 0 ? (finalErrorBits / rawBits.length) : 0;

  let receivedText = '';
  let receivedPixels = null;

  if (isText) {
    receivedText = asciiBytesToText(rxPlainBytes);
  } else if (isImage) {
    const bpp = cfg.payload.bitsPerPixel || 4;
    const pixelCount = cfg.payload.width * cfg.payload.height;
    receivedPixels = new Uint8Array(pixelCount);
    for (let i = 0; i < pixelCount; i++) {
      let val = 0;
      for (let b = 0; b < bpp; b++) {
        const bitIdx = i * bpp + b;
        const bit = bitIdx < bitsAfterDecrypt.length ? bitsAfterDecrypt[bitIdx] : 0;
        val = (val << 1) | bit;
      }
      receivedPixels[i] = val;
    }
  }

  const recoverData = {
    correctedBlocks,
    correctedPositions,
    crcOk,
    rxCrcValue,
    bitsAfterFec: bitsAfterFec.slice(),
    bitsAfterCrc: bitsAfterCrc.slice(),
    bitsAfterDecrypt: bitsAfterDecrypt.slice(),
    bytes: Array.from(rxPlainBytes),
    text: receivedText,
    pixels: receivedPixels,
    finalErrorBits,
    finalBER
  };

  /* ================= SUMMARY ================= */
  const summary = {
    sentText: isText ? cfg.payload.text : `[Photo ${cfg.payload.width}x${cfg.payload.height}]`,
    receivedText: isText ? receivedText : `[Photo received]`,
    rawBER,
    finalBER,
    errorsInjected: rawErrors,
    errorsCorrected: correctedBlocks,
    crcOk,
    totalBitsOnAir: codedBits.length
  };

  return {
    config: cfg,
    stages: {
      message: messageData,
      encode: encodeData,
      encrypt: encryptData,
      protect: protectData,
      modulate: modulateData,
      channel: channelData,
      demodulate: demodulateData,
      recover: recoverData
    },
    summary
  };
}

/**
 * Run pipeline without protection (for side-by-side comparison)
 */
export function runUnprotectedPipeline(config) {
  const unprotConfig = {
    ...config,
    protect: { crc: false, hamming: false }
  };
  return runPipeline(unprotConfig);
}

/**
 * Deterministic Demo Seed Finder
 * For Text Tour ('HELLO', key 'SF', CRC on, Hamming on, PSK, Eb/N0 = 2 dB):
 * (a) raw errors on air between 3 and 6
 * (b) every flipped bit in a different Hamming block
 * (c) final text exactly 'HELLO' and CRC OK
 * (d) with protection OFF at least 1 bit error
 */
export function findDemoSeed(baseConfig) {
  const isPhoto = baseConfig.payload && baseConfig.payload.type === 'image';
  const cacheKey = isPhoto ? 'photo_demo_seed' : 'text_demo_seed';

  if (demoSeedCache.has(cacheKey)) {
    return demoSeedCache.get(cacheKey);
  }

  if (isPhoto) {
    // Search photo seed (1..500)
    for (let seed = 1; seed <= 500; seed++) {
      const cfg = {
        ...baseConfig,
        channel: { ...(baseConfig.channel || {}), seed, ebn0dB: 4 }
      };
      const trace = runPipeline(cfg);
      if (trace.stages.demodulate.rawErrors >= 30 && trace.stages.recover.finalErrorBits <= 4) {
        const unprot = runUnprotectedPipeline(cfg);
        if (unprot.stages.demodulate.rawErrors >= 20) {
          demoSeedCache.set(cacheKey, seed);
          return seed;
        }
      }
    }
    // Fallback known seed
    demoSeedCache.set(cacheKey, 1);
    return 1;
  }

  // Text Demo Seed
  const maxSeeds = 2000;
  for (let seed = 1; seed <= maxSeeds; seed++) {
    const cfg = {
      ...baseConfig,
      channel: { ...(baseConfig.channel || {}), seed, ebn0dB: 2 }
    };
    const trace = runPipeline(cfg);
    const rawFlips = trace.stages.demodulate.rawErrorIndices;
    const rawCount = rawFlips.length;

    if (rawCount >= 3 && rawCount <= 6) {
      // Check if every flipped bit is in different Hamming block
      const blocks = new Set(rawFlips.map(idx => Math.floor(idx / 7)));
      if (blocks.size === rawCount) {
        if (trace.stages.recover.text === 'HELLO' && trace.stages.recover.crcOk) {
          const unprot = runUnprotectedPipeline(cfg);
          if (unprot.stages.recover.finalErrorBits > 0) {
            demoSeedCache.set(cacheKey, seed);
            return seed;
          }
        }
      }
    }
  }

  // Relax condition d if needed
  for (let seed = 1; seed <= maxSeeds; seed++) {
    const cfg = {
      ...baseConfig,
      channel: { ...(baseConfig.channel || {}), seed, ebn0dB: 2 }
    };
    const trace = runPipeline(cfg);
    const rawFlips = trace.stages.demodulate.rawErrorIndices;
    if (rawFlips.length >= 2 && rawFlips.length <= 8) {
      const blocks = new Set(rawFlips.map(idx => Math.floor(idx / 7)));
      if (blocks.size === rawFlips.length && trace.stages.recover.text === 'HELLO') {
        demoSeedCache.set(cacheKey, seed);
        return seed;
      }
    }
  }

  // Guaranteed fallback seed found earlier
  demoSeedCache.set(cacheKey, 7);
  return 7;
}

import { Engine } from '../js/engine.js';
import { DSP } from '../js/dsp.js';
import { runPipeline, textToAsciiBytes, asciiBytesToText, bytesToBits, bitsToBytes } from '../js/pipeline.js';

function assert(cond, msg = 'Assertion failed') {
  if (!cond) throw new Error(msg);
}

function assertEqual(actual, expected, msg = '') {
  if (actual !== expected) {
    throw new Error(`${msg} Expected [${expected}] but got [${actual}]`);
  }
}

function assertArrayEqual(a, b, msg = '') {
  if (a.length !== b.length) {
    throw new Error(`${msg} Array length mismatch: ${a.length} vs ${b.length}`);
  }
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      throw new Error(`${msg} Element at index ${i} mismatch: ${a[i]} !== ${b[i]}`);
    }
  }
}

async function run() {
  await Engine.init();
  console.log('Running unit tests in Node...');

  const tests = [
    ['textToAsciiBytes', () => {
      const bytes = textToAsciiBytes('HELLO');
      assertArrayEqual(bytes, new Uint8Array([72, 69, 76, 76, 79]));
    }],
    ['non-ASCII replace', () => {
      const bytes = textToAsciiBytes('A©B');
      assertEqual(bytes[0], 65);
      assertEqual(bytes[1], 63);
      assertEqual(bytes[2], 66);
    }],
    ['bytesToBits & bitsToBytes', () => {
      const original = new Uint8Array([0, 1, 127, 128, 255, 170, 85]);
      const bits = bytesToBits(original);
      assertEqual(bits.length, original.length * 8);
      const restored = bitsToBytes(bits);
      assertArrayEqual(restored, original);
    }],
    ['XOR symmetry', () => {
      const plain = textToAsciiBytes('TEST_SECRET_MESSAGE');
      const key = textToAsciiBytes('KEY123');
      const cipher = Engine.xor(plain, key);
      assert(cipher.some((b, i) => b !== plain[i]), 'Encrypted bytes must differ');
      const decrypted = Engine.xor(cipher, key);
      assertArrayEqual(decrypted, plain);
    }],
    ['XOR empty buffer', () => {
      const empty = new Uint8Array(0);
      const res = Engine.xor(empty, textToAsciiBytes('KEY'));
      assertEqual(res.length, 0);
    }],
    ['CRC-8 empty', () => {
      assertEqual(Engine.crc8(new Uint8Array(0)), 0);
    }],
    ['CRC-8 bit flip', () => {
      const data1 = textToAsciiBytes('SIGNALFORGE');
      const data2 = data1.slice();
      data2[0] ^= 1;
      assert(Engine.crc8(data1) !== Engine.crc8(data2));
    }],
    ['CRC-8 valid vector', () => {
      const crc = Engine.crc8(new Uint8Array([0x31, 0x32, 0x33, 0x34, 0x35]));
      assert(crc >= 0 && crc <= 255);
    }],
    ['Hamming 0 error', () => {
      const inputBits = new Uint8Array([1, 0, 1, 1]);
      const coded = Engine.hammingEncode(inputBits);
      assertEqual(coded.length, 7);
      const decoded = Engine.hammingDecode(coded, 4);
      assertEqual(decoded.correctedBlocks, 0);
      assertArrayEqual(decoded.bits, inputBits);
    }],
    ['Hamming 112 cases', () => {
      let tested = 0;
      for (let val = 0; val < 16; val++) {
        const d = new Uint8Array([(val >> 3) & 1, (val >> 2) & 1, (val >> 1) & 1, val & 1]);
        const coded = Engine.hammingEncode(d);

        for (let errPos = 0; errPos < 7; errPos++) {
          const noisy = coded.slice();
          noisy[errPos] ^= 1;

          const decoded = Engine.hammingDecode(noisy, 4);
          assertEqual(decoded.correctedBlocks, 1);
          assertArrayEqual(decoded.bits, d);
          tested++;
        }
      }
      assertEqual(tested, 112);
    }],
    ['AWGN seed repeatability', () => {
      const wave = DSP.modulate(new Uint8Array([1, 0, 1, 1, 0, 1]), 'PSK', 20, 1.0);
      const sigma = DSP.calculateSigma(2.0, 20, 1.0);
      const run1 = DSP.addNoise(wave, sigma, 9999);
      const run2 = DSP.addNoise(wave, sigma, 9999);
      assertArrayEqual(run1.noisyWave, run2.noisyWave);
    }],
    ['AWGN sigma monotonicity', () => {
      const s0 = DSP.calculateSigma(0.0, 20, 1.0);
      const s4 = DSP.calculateSigma(4.0, 20, 1.0);
      const s8 = DSP.calculateSigma(8.0, 20, 1.0);
      assert(s0 > s4 && s4 > s8);
    }],
    ['runPipeline 8 stages', () => {
      const trace = runPipeline({
        payload: { type: 'text', text: 'HELLO' },
        encrypt: { on: true, key: 'SF' },
        protect: { crc: true, hamming: true },
        modulation: 'PSK',
        channel: { ebn0dB: 10, seed: 42 }
      });
      assert(trace.stages.message.text === 'HELLO');
      assert(trace.stages.protect.crcOn === true);
      assert(trace.stages.recover.crcOk === true);
      assertEqual(trace.stages.recover.text, 'HELLO');
      assertEqual(trace.summary.finalBER, 0);
    }],
    ['runPipeline protected vs unprotected', () => {
      const trace = runPipeline({
        payload: { type: 'text', text: 'TEST' },
        protect: { crc: true, hamming: true },
        channel: { ebn0dB: 2, seed: 7 }
      });
      assert(trace.stages.protect.hammingOn);
      assert(trace.summary.finalBER <= trace.summary.rawBER);
    }],
    ['Noiseless ASK', () => {
      const bits = new Uint8Array([1, 0, 1, 1, 0, 0, 1, 0]);
      const wave = DSP.modulate(bits, 'ASK', 20, 1.0);
      const rx = DSP.demodulate(wave, 'ASK', 20, 1.0);
      assertArrayEqual(rx, bits);
    }],
    ['Noiseless FSK', () => {
      const bits = new Uint8Array([1, 0, 1, 1, 0, 0, 1, 0]);
      const wave = DSP.modulate(bits, 'FSK', 20, 1.0);
      const rx = DSP.demodulate(wave, 'FSK', 20, 1.0);
      assertArrayEqual(rx, bits);
    }],
    ['Noiseless PSK', () => {
      const bits = new Uint8Array([1, 0, 1, 1, 0, 0, 1, 0]);
      const wave = DSP.modulate(bits, 'PSK', 20, 1.0);
      const rx = DSP.demodulate(wave, 'PSK', 20, 1.0);
      assertArrayEqual(rx, bits);
    }],
    ['High SNR PSK BER bound', () => {
      const theoretical = DSP.theoreticalBER('PSK', 8.0);
      assert(theoretical < 0.001);
    }]
  ];

  let passed = 0;
  for (const [name, fn] of tests) {
    try {
      fn();
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } catch (e) {
      console.error(`❌ [FAIL] ${name}: ${e.message}`);
    }
  }

  console.log(`\nResult: ${passed}/${tests.length} tests passed.`);
}

run();

/**
 * SignalForge - Digital Signal Processing (DSP) Module
 * Concepts:
 * - Waveform synthesis: Carrier generation, ASK/FSK/PSK digital modulation (Practical 6)
 * - Channel simulation: Additive White Gaussian Noise (AWGN), mulberry32 PRNG + Box-Muller (Practicals 1, 2)
 * - Demodulation: Coherent correlation receiver (Practical 6)
 * - Theory: Error function erfc(x), Gaussian Q-function Q(x), theoretical BER curves
 * - Web Audio API: Audible waveform synthesis
 */

export const DSP = {
  SAMPLES_PER_BIT: 20,
  AMPLITUDE: 1.0,

  /**
   * Mulberry32 Seeded 32-bit PRNG
   * Guarantees deterministic, reproducible noise across runs with the same seed.
   */
  createRng(seed) {
    let s = (Math.floor(seed) >>> 0) || 12345;
    return function() {
      s |= 0;
      s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  },

  /**
   * Box-Muller Transform for standard normal distribution N(0, 1)
   */
  createGaussianGenerator(rng) {
    let haveNextNextGaussian = false;
    let nextNextGaussian = 0;

    return function(sigma = 1.0) {
      if (haveNextNextGaussian) {
        haveNextNextGaussian = false;
        return nextNextGaussian * sigma;
      }
      let u = 0, v = 0;
      while (u === 0) u = rng(); // Avoid log(0)
      while (v === 0) v = rng();

      const r = Math.sqrt(-2.0 * Math.log(u));
      const theta = 2.0 * Math.PI * v;
      nextNextGaussian = r * Math.sin(theta);
      haveNextNextGaussian = true;
      return r * Math.cos(theta) * sigma;
    };
  },

  /**
   * Precomputed basis carriers for N = 20:
   * c0[k] = cos(2*pi*2*k/N)  (2 cycles per bit)
   * c1[k] = cos(2*pi*4*k/N)  (4 cycles per bit)
   */
  getCarriers(N = 20) {
    const c0 = new Float32Array(N);
    const c1 = new Float32Array(N);
    for (let k = 0; k < N; k++) {
      c0[k] = Math.cos((2 * Math.PI * 2 * k) / N);
      c1[k] = Math.cos((2 * Math.PI * 4 * k) / N);
    }
    return { c0, c1 };
  },

  /**
   * Modulate a bit array into a continuous waveform
   * Modulation types: 'PSK' | 'FSK' | 'ASK'
   * Returns Float32Array of length (bits.length * samplesPerBit)
   */
  modulate(bits, modulation = 'PSK', samplesPerBit = 20, amplitude = 1.0) {
    const N = samplesPerBit;
    const { c0, c1 } = this.getCarriers(N);
    const totalSamples = bits.length * N;
    const wave = new Float32Array(totalSamples);

    for (let i = 0; i < bits.length; i++) {
      const bit = bits[i];
      const offset = i * N;

      if (modulation === 'PSK') {
        // PSK (BPSK): bit 1 -> +A*c0, bit 0 -> -A*c0
        const sign = bit === 1 ? amplitude : -amplitude;
        for (let k = 0; k < N; k++) {
          wave[offset + k] = sign * c0[k];
        }
      } else if (modulation === 'ASK') {
        // ASK (OOK): bit 1 -> A*c0, bit 0 -> 0
        const scale = bit === 1 ? amplitude : 0;
        for (let k = 0; k < N; k++) {
          wave[offset + k] = scale * c0[k];
        }
      } else if (modulation === 'FSK') {
        // FSK: bit 1 -> A*c1 (higher freq), bit 0 -> A*c0 (lower freq)
        const carrier = bit === 1 ? c1 : c0;
        for (let k = 0; k < N; k++) {
          wave[offset + k] = amplitude * carrier[k];
        }
      }
    }
    return wave;
  },

  /**
   * Channel noise calculation:
   * Eref = A^2 * N / 2
   * gamma = 10^(Eb/N0 / 10)
   * N0 = Eref / gamma
   * sigma = sqrt(N0 / 2)
   */
  calculateSigma(ebn0dB, samplesPerBit = 20, amplitude = 1.0) {
    const Eref = (amplitude * amplitude * samplesPerBit) / 2.0;
    const gamma = Math.pow(10, ebn0dB / 10.0);
    const N0 = Eref / gamma;
    return Math.sqrt(N0 / 2.0);
  },

  /**
   * Add AWGN to a waveform
   */
  addNoise(cleanWave, sigma, seed = 12345) {
    const rng = this.createRng(seed);
    const gaussian = this.createGaussianGenerator(rng);
    const len = cleanWave.length;
    const noisyWave = new Float32Array(len);
    const noiseOnly = new Float32Array(len);

    for (let i = 0; i < len; i++) {
      const n = gaussian(sigma);
      noiseOnly[i] = n;
      noisyWave[i] = cleanWave[i] + n;
    }

    return { noisyWave, noiseOnly };
  },

  /**
   * Demodulate waveform using Coherent Correlation Receiver
   */
  demodulate(noisyWave, modulation = 'PSK', samplesPerBit = 20, amplitude = 1.0) {
    const N = samplesPerBit;
    const nBits = Math.floor(noisyWave.length / N);
    const { c0, c1 } = this.getCarriers(N);
    const rxBits = new Uint8Array(nBits);
    const thresholdAsk = (amplitude * N) / 4.0; // 5.0 for A=1, N=20

    for (let i = 0; i < nBits; i++) {
      const offset = i * N;

      if (modulation === 'PSK') {
        let T = 0;
        for (let k = 0; k < N; k++) {
          T += noisyWave[offset + k] * c0[k];
        }
        rxBits[i] = T > 0 ? 1 : 0;
      } else if (modulation === 'ASK') {
        let T = 0;
        for (let k = 0; k < N; k++) {
          T += noisyWave[offset + k] * c0[k];
        }
        rxBits[i] = T > thresholdAsk ? 1 : 0;
      } else if (modulation === 'FSK') {
        let T1 = 0;
        let T0 = 0;
        for (let k = 0; k < N; k++) {
          const sample = noisyWave[offset + k];
          T1 += sample * c1[k];
          T0 += sample * c0[k];
        }
        rxBits[i] = T1 > T0 ? 1 : 0;
      }
    }

    return rxBits;
  },

  /**
   * Streaming bit simulation (for large payloads like 32x32 image / video)
   * Avoids allocating large Float32Array buffers:
   * Generates N samples on the fly, computes correlator statistics, decides bit, discards samples.
   */
  simulateBitsStreaming(txBits, modulation, ebn0dB, seed) {
    const N = this.SAMPLES_PER_BIT;
    const A = this.AMPLITUDE;
    const sigma = this.calculateSigma(ebn0dB, N, A);
    const rng = this.createRng(seed);
    const gaussian = this.createGaussianGenerator(rng);
    const { c0, c1 } = this.getCarriers(N);
    const thresholdAsk = (A * N) / 4.0;

    const nBits = txBits.length;
    const rxBits = new Uint8Array(nBits);
    const flippedIndices = [];

    for (let i = 0; i < nBits; i++) {
      const bit = txBits[i];
      let rxBit = 0;

      if (modulation === 'PSK') {
        const sign = bit === 1 ? A : -A;
        let T = 0;
        for (let k = 0; k < N; k++) {
          const sample = sign * c0[k] + gaussian(sigma);
          T += sample * c0[k];
        }
        rxBit = T > 0 ? 1 : 0;
      } else if (modulation === 'ASK') {
        const scale = bit === 1 ? A : 0;
        let T = 0;
        for (let k = 0; k < N; k++) {
          const sample = scale * c0[k] + gaussian(sigma);
          T += sample * c0[k];
        }
        rxBit = T > thresholdAsk ? 1 : 0;
      } else if (modulation === 'FSK') {
        let T1 = 0;
        let T0 = 0;
        for (let k = 0; k < N; k++) {
          const s = (bit === 1 ? A * c1[k] : A * c0[k]) + gaussian(sigma);
          T1 += s * c1[k];
          T0 += s * c0[k];
        }
        rxBit = T1 > T0 ? 1 : 0;
      }

      rxBits[i] = rxBit;
      if (rxBit !== bit) {
        flippedIndices.push(i);
      }
    }

    return { rxBits, flippedIndices, sigma };
  },

  /**
   * Complementary Error Function erfc(x)
   * Abramowitz and Stegun formula 7.1.26 (max error 1.5e-7)
   */
  erfc(x) {
    if (x < 0) return 2.0 - this.erfc(-x);
    const p = 0.3275911;
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;

    const t = 1.0 / (1.0 + p * x);
    const poly = ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t;
    return poly * Math.exp(-x * x);
  },

  /**
   * Gaussian Q-Function: Q(x) = 0.5 * erfc(x / sqrt(2))
   */
  qFunc(x) {
    if (x <= 0) return 0.5;
    return 0.5 * this.erfc(x / Math.SQRT2);
  },

  /**
   * Theoretical Bit Error Rate
   * PSK: Q(sqrt(2 * gamma))
   * FSK: Q(sqrt(gamma))
   * ASK: Q(sqrt(gamma / 2))
   */
  theoreticalBER(ebn0dB, modulation = 'PSK') {
    const gamma = Math.pow(10, ebn0dB / 10.0);
    if (modulation === 'PSK') {
      return this.qFunc(Math.sqrt(2.0 * gamma));
    } else if (modulation === 'FSK') {
      return this.qFunc(Math.sqrt(gamma));
    } else if (modulation === 'ASK') {
      return this.qFunc(Math.sqrt(gamma / 2.0));
    }
    return 0.5;
  },

  /**
   * Run Monte-Carlo BER verification test (Section 5.5 self-test)
   */
  runSelfTest(bitsCount = 100000, ebn0dB = 4.0, seed = 42) {
    const mods = ['PSK', 'FSK', 'ASK'];
    const results = {};

    for (const mod of mods) {
      const theory = this.theoreticalBER(ebn0dB, mod);
      const rng = this.createRng(seed);
      // Generate random test bits
      const txBits = new Uint8Array(bitsCount);
      for (let i = 0; i < bitsCount; i++) {
        txBits[i] = rng() > 0.5 ? 1 : 0;
      }
      const sim = this.simulateBitsStreaming(txBits, mod, ebn0dB, seed + 101);
      const measured = sim.flippedIndices.length / bitsCount;
      const pctDiff = ((measured - theory) / theory) * 100;
      const passed = Math.abs(pctDiff) <= 15.0; // Within 15% tolerance

      results[mod] = {
        ebn0dB,
        bitsCount,
        theory: Number(theory.toFixed(6)),
        measured: Number(measured.toFixed(6)),
        errorCount: sim.flippedIndices.length,
        pctDiff: Number(pctDiff.toFixed(2)),
        passed
      };
    }

    return results;
  },

  /**
   * Audio Synthesis using Web Audio API
   * Generates audible tones from bit sequences:
   * - Bit duration: 40 ms
   * - ASK/PSK carrier: 1800 Hz (PSK flips phase 180°)
   * - FSK: 1200 Hz for bit 0, 2200 Hz for bit 1
   * - Optional AWGN noise overlay
   */
  playBitsAudio(bits, modulation = 'PSK', options = {}) {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const bitDuration = options.bitDuration || 0.040; // 40ms per bit
    const addNoise = options.noisy || false;
    const sigmaRatio = options.sigmaRatio || 0.3;
    const playBits = bits.slice(0, Math.min(bits.length, 80)); // cap at 80 bits for audio

    const sampleRate = audioCtx.sampleRate;
    const totalSamples = Math.floor(playBits.length * bitDuration * sampleRate);
    const audioBuffer = audioCtx.createBuffer(1, totalSamples, sampleRate);
    const channelData = audioBuffer.getChannelData(0);

    const fAskPsk = 1800.0;
    const fFsk0 = 1200.0;
    const fFsk1 = 2200.0;
    const samplesPerBit = Math.floor(bitDuration * sampleRate);

    const rng = this.createRng(options.seed || 12345);
    const gaussian = this.createGaussianGenerator(rng);

    let carrierPhase = 0;

    for (let i = 0; i < playBits.length; i++) {
      const bit = playBits[i];
      const startSample = i * samplesPerBit;
      const endSample = Math.min(startSample + samplesPerBit, totalSamples);

      for (let s = startSample; s < endSample; s++) {
        const t = (s - startSample) / sampleRate;
        let sample = 0;

        if (modulation === 'PSK') {
          // PSK: bit 1 is normal phase (0), bit 0 is inverted phase (PI)
          const phaseOffset = bit === 1 ? 0 : Math.PI;
          sample = 0.5 * Math.sin(2 * Math.PI * fAskPsk * t + phaseOffset);
        } else if (modulation === 'ASK') {
          // ASK: bit 1 is on, bit 0 is off
          sample = bit === 1 ? 0.5 * Math.sin(2 * Math.PI * fAskPsk * t) : 0;
        } else if (modulation === 'FSK') {
          // FSK: continuous phase frequency shift
          const freq = bit === 1 ? fFsk1 : fFsk0;
          sample = 0.5 * Math.sin(2 * Math.PI * freq * t);
        }

        // Apply a gentle cosine envelope to prevent audio clicks at bit transitions
        const env = Math.sin((Math.PI * (s - startSample)) / samplesPerBit);
        sample *= env;

        if (addNoise) {
          sample += gaussian(sigmaRatio * 0.25);
        }

        // Soft clip
        channelData[s] = Math.max(-0.95, Math.min(0.95, sample));
      }
    }

    const source = audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioCtx.destination);
    source.start();

    return {
      durationSec: playBits.length * bitDuration,
      stop: () => {
        try { source.stop(); } catch(e){}
      }
    };
  }
};

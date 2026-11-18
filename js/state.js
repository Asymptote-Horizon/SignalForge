/**
 * SignalForge - State Management Module
 * Concepts: Global reactive application state with sessionStorage persistence.
 */

import { runPipeline } from './pipeline.js';

const SESSION_KEY = 'sf_session';

// Built-in 32x32 sample grayscale image (4 bits per pixel, 1024 values 0..15)
function createBuiltinSampleImage() {
  const width = 32;
  const height = 32;
  const pixels = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let val = 2;
      // Dish base
      if (x >= 13 && x <= 18 && y >= 23 && y <= 27) val = 12;
      if (x >= 15 && x <= 16 && y >= 18 && y <= 24) val = 14;
      // Dish arc
      const dishDy = y - 18;
      const dishDx = x - 15.5;
      if (Math.abs((dishDx * dishDx) / 16.0 + (dishDy * dishDy) / 4.0 - 1.0) < 0.4 && y >= 17 && y <= 21) {
        val = 15;
      }
      // Signal waves
      const r = Math.sqrt((x - 15.5) * (x - 15.5) + (y - 16) * (y - 16));
      if (y < 18) {
        if (Math.abs(r - 5.0) < 0.8) val = 13;
        else if (Math.abs(r - 9.0) < 0.8) val = 11;
        else if (Math.abs(r - 13.0) < 0.8) val = 9;
      }
      // Outer border
      if (x === 0 || x === 31 || y === 0 || y === 31) val = 15;
      pixels[y * width + x] = Math.min(15, Math.max(0, val));
    }
  }
  return { width, height, bitsPerPixel: 4, pixels };
}

export const sampleImage = createBuiltinSampleImage();

function loadSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.name === 'string' && typeof parsed.loggedIn === 'boolean') {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Could not read session from sessionStorage:', e);
  }
  return { name: '', loggedIn: false, tourDone: false };
}

function saveSession(session) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch (e) {
    console.warn('Could not save session:', e);
  }
}

export const State = {
  session: loadSession(),

  // Current tour selection ('text' | 'image')
  tourPayload: 'text',

  // Active lab configuration
  config: {
    payload: {
      type: 'text',
      text: 'HELLO',
      pixels: sampleImage.pixels,
      width: 32,
      height: 32,
      bitsPerPixel: 4
    },
    encrypt: {
      on: true,
      key: 'SF'
    },
    protect: {
      crc: true,
      hamming: true
    },
    modulation: 'PSK', // 'ASK' | 'FSK' | 'PSK'
    channel: {
      ebn0dB: 2.0,
      seed: 7,
      medium: 'wifi'
    },
    samplesPerBit: 20
  },

  // Cached trace
  trace: null,

  // Listeners
  listeners: new Set(),

  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  },

  notify(event, data) {
    for (const fn of this.listeners) {
      try {
        fn(event, data, this);
      } catch (e) {
        console.error('State subscriber error:', e);
      }
    }
  },

  setSession(name, loggedIn = true) {
    this.session = { ...this.session, name, loggedIn };
    saveSession(this.session);
    this.notify('session', this.session);
  },

  setTourDone(done = true) {
    this.session = { ...this.session, tourDone: done };
    saveSession(this.session);
    this.notify('session', this.session);
  },

  logout() {
    this.session = { name: '', loggedIn: false, tourDone: false };
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch(e){}
    this.notify('session', this.session);
  },

  updateConfig(patch, recompute = true) {
    // Deep merge patch
    if (patch.payload) this.config.payload = { ...this.config.payload, ...patch.payload };
    if (patch.encrypt) this.config.encrypt = { ...this.config.encrypt, ...patch.encrypt };
    if (patch.protect) this.config.protect = { ...this.config.protect, ...patch.protect };
    if (patch.channel) this.config.channel = { ...this.config.channel, ...patch.channel };
    if (patch.modulation) this.config.modulation = patch.modulation;
    if (patch.samplesPerBit) this.config.samplesPerBit = patch.samplesPerBit;

    if (recompute) {
      this.recomputeTrace();
    }
    this.notify('config', this.config);
  },

  recomputeTrace() {
    this.trace = runPipeline(this.config);
    this.notify('trace', this.trace);
    return this.trace;
  },

  getTrace() {
    if (!this.trace) {
      this.recomputeTrace();
    }
    return this.trace;
  }
};

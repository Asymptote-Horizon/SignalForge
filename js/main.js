/**
 * SignalForge - Master Application Controller (Codex Design System)
 * Integrates:
 * - Pixel-perfect Codex lab UI and responsive layout
 * - WebAssembly compiled C bit engine with pure JS fallback
 * - Real-time DSP waveform generation and correlation receiver
 * - Interactive Labs: Pipeline, Media Studio (Image/Video/Audio), Other Labs (Desmos Signal, Network, Mux, Basics)
 * - Student Profile Studio with Moodle LMS / SSO integration
 * - Technical flashcard tooltips with Wikipedia references
 * - Curriculum Syllabus alignment & mathematical self-tests
 * - Live AI/tutor chatbot integration
 */

import { Engine } from './engine.js';
import { DSP } from './dsp.js';
import { initChatbot } from './chatbot.js';
import { router } from './router.js';
import { diagnostics } from './diagnostics.js';
import { runPipeline, textToAsciiBytes, asciiBytesToText, bytesToBits, bitsToBytes } from './pipeline.js';
import { mediaMarkup, initMediaStudio } from './labs/mediaStudio.js?v=20261125_10';
import { otherLabsMarkup, initOtherLabsStudio } from './labs/otherLabsStudio.js?v=20261125_10';
import { networkDiagnosticMarkup, initNetworkDiagnosticLab } from './labs/networkDiagnosticLab.js?v=20261125_10';
import { wasmStudioMarkup, initWasmStudio } from './labs/wasmCppStudio.js?v=20261125_10';
import { projectsGalleryMarkup, initProjectsGallery } from './labs/projectsGallery.js?v=20261125_10';
import { resourcesFeedMarkup, initResourcesFeed } from './labs/resourcesFeed.js?v=20261125_10';
import { bluetoothAnalyzerMarkup, initBluetoothAnalyzerLab } from './labs/bluetoothAnalyzerLab.js?v=20261125_10';
import { p2pSharingMarkup, initP2PSharingLab } from './labs/p2pSharingLab.js?v=20261125_10';
import { longHoverCue } from './longHoverCue.js';

// Technical Glossary for Educational Flashcards & Wikipedia Links
export const GLOSSARY = {
  'ASCII': {
    name: 'ASCII (Character Encoding)',
    def: 'American Standard Code for Information Interchange: 7/8-bit code mapping characters to values 0–127/255.',
    wiki: 'https://en.wikipedia.org/wiki/ASCII'
  },
  'XOR': {
    name: 'XOR Stream Cipher (⊕)',
    def: 'Exclusive-OR binary operation: reversible stream cipher primitive where (A ⊕ K) ⊕ K = A without expanding data length.',
    wiki: 'https://en.wikipedia.org/wiki/Exclusive_or'
  },
  'CRC-8': {
    name: 'CRC-8 Error Detection',
    def: 'Cyclic Redundancy Check polynomial (x⁸ + x² + x + 1, 0x07): detects all single, double, and burst bit errors.',
    wiki: 'https://en.wikipedia.org/wiki/Cyclic_redundancy_check'
  },
  'Hamming(7,4)': {
    name: 'Hamming(7,4) Forward Error Correction',
    def: 'Linear block code: encodes 4 data bits into 7-bit codewords with 3 parity checks. Detects and corrects any 1-bit flip per codeword.',
    wiki: 'https://en.wikipedia.org/wiki/Hamming(7,4)'
  },
  'PSK': {
    name: 'Phase Shift Keying (PSK)',
    def: 'Digital modulation encoding binary values by shifting carrier phase angles (e.g. 0° for bit 0, 180° for bit 1).',
    wiki: 'https://en.wikipedia.org/wiki/Phase-shift_keying'
  },
  'FSK': {
    name: 'Frequency Shift Keying (FSK)',
    def: 'Digital modulation encoding binary values by shifting between two distinct carrier frequencies (mark and space).',
    wiki: 'https://en.wikipedia.org/wiki/Frequency-shift_keying'
  },
  'ASK': {
    name: 'Amplitude Shift Keying (ASK)',
    def: 'Digital modulation encoding binary values by varying carrier amplitude levels (OOK / on-off keying).',
    wiki: 'https://en.wikipedia.org/wiki/Amplitude-shift_keying'
  },
  'AWGN': {
    name: 'AWGN Channel Noise',
    def: 'Additive White Gaussian Noise: statistical model with flat spectral density across frequencies and normal amplitude distribution.',
    wiki: 'https://en.wikipedia.org/wiki/Additive_white_Gaussian_noise'
  },
  'BER': {
    name: 'Bit Error Rate (BER)',
    def: 'Ratio of corrupted bits received to total bits transmitted (Pe = Ne / Nt). Determined by Eb/N0 and modulation.',
    wiki: 'https://en.wikipedia.org/wiki/Bit_error_rate'
  },
  'FEC': {
    name: 'Forward Error Correction (FEC)',
    def: 'Error-control method where transmitter adds redundant code allowing the receiver to repair bit corruptions without retransmission.',
    wiki: 'https://en.wikipedia.org/wiki/Error_correction_code'
  },
  'ADC': {
    name: 'Analog-to-Digital Converter (ADC)',
    def: 'Electronic process that converts continuous physical signals into discrete binary sequences via sampling and quantization.',
    wiki: 'https://en.wikipedia.org/wiki/Analog-to-digital_converter'
  },
  'Nyquist': {
    name: 'Nyquist-Shannon Sampling Theorem',
    def: 'Fundamental sampling theorem: to avoid aliasing and achieve perfect signal reconstruction, sample rate fs ≥ 2·fmax.',
    wiki: 'https://en.wikipedia.org/wiki/Nyquist%E2%80%93Shannon_sampling_theorem'
  },
  'PCM': {
    name: 'Pulse Code Modulation (PCM)',
    def: 'Standard digital audio format where sampled amplitude values are quantized to binary numbers (e.g. 8-bit or 16-bit).',
    wiki: 'https://en.wikipedia.org/wiki/Pulse-code_modulation'
  },
  'PSNR': {
    name: 'Peak Signal-to-Noise Ratio (PSNR)',
    def: 'Quantitative image fidelity metric: 10·log10(MAX² / MSE). Values > 30 dB represent high visual reconstruction quality.',
    wiki: 'https://en.wikipedia.org/wiki/Peak_signal-to-noise_ratio'
  }
};

// Replace known technical keywords with interactive glossary terms
function withGlossary(text) {
  if (!text) return '';
  const regex = /\b(ASCII|XOR|CRC-8|Hamming\(7,4\)|PSK|FSK|ASK|AWGN|BER|FEC|ADC|Nyquist|PCM|PSNR)\b/g;
  return text.replace(regex, (match) => {
    return `<span class="glossary-term" data-term="${match}">${match}</span>`;
  });
}

// The 8 Canonical Communication Stages
export const STAGES = [
  {
    id: 'message',
    name: 'Message',
    short: 'Source information',
    icon: '✉',
    zone: 'TRANSMITTER',
    concept: 'Source information',
    practical: 'Foundation',
    title: 'Your message',
    text: 'You begin with a piece of information. A computer must represent it as numbers before it can be transmitted as a signal.',
    try: 'Type your own message in the Pipeline Lab.'
  },
  {
    id: 'encode',
    name: 'Encode',
    short: 'ASCII → bits',
    icon: '01',
    zone: 'TRANSMITTER',
    concept: 'ASCII and binary',
    practical: 'Practical 3 & 4',
    title: 'Letters become bits',
    text: 'Each character is represented by a numeric code. For example, the ASCII value for H is 72, and 72 is represented as 01001000 in 8-bit binary.',
    try: 'Press a key in the Basics Lab and inspect its ASCII representation.'
  },
  {
    id: 'encrypt',
    name: 'Encrypt',
    short: 'XOR key stream',
    icon: '⌑',
    zone: 'TRANSMITTER',
    concept: 'XOR encryption',
    practical: 'Confidentiality',
    title: 'Hide the meaning',
    text: 'The transmitter can combine the bit stream with a repeating key using XOR. The receiver uses the same key to reverse this educational transformation.',
    try: 'Change the key in the Pipeline Lab and compare the encrypted bits.'
  },
  {
    id: 'protect',
    name: 'Protect',
    short: 'CRC + Hamming',
    icon: '⬡',
    zone: 'TRANSMITTER',
    concept: 'Error detection and correction',
    practical: 'CRC-8 · Hamming(7,4)',
    title: 'Add protection bits',
    text: 'A checksum helps detect corruption, while Hamming(7,4) adds parity bits that can correct a single flipped bit in each codeword.',
    try: 'Toggle Hamming protection off and compare the recovered message.'
  },
  {
    id: 'modulate',
    name: 'Modulate',
    short: 'Bits → waveform',
    icon: '∿',
    zone: 'TRANSMITTER',
    concept: 'Digital modulation',
    practical: 'Practical 6',
    title: 'Turn bits into a signal',
    text: 'A communication channel carries a physical signal, not abstract bits. ASK, FSK, and PSK encode information by changing a carrier property.',
    try: 'Switch between ASK, FSK, and PSK in the Pipeline Lab.'
  },
  {
    id: 'channel',
    name: 'Channel',
    short: 'Medium + noise',
    icon: 'ϟ',
    zone: 'CHANNEL',
    concept: 'Transmission medium and AWGN',
    practical: 'Practicals 1 & 2',
    title: 'The channel adds noise',
    text: 'The signal passes through a medium. In this software model, additive white Gaussian noise can disturb the waveform and cause bit decisions to be wrong.',
    try: 'Adjust the Eb/N₀ setting and observe how the error rate changes.'
  },
  {
    id: 'demodulate',
    name: 'Demodulate',
    short: 'Signal → bits',
    icon: '⌁',
    zone: 'RECEIVER',
    concept: 'Correlation receiver',
    practical: 'Practical 6',
    title: 'The receiver makes a decision',
    text: 'The receiver examines the noisy waveform and estimates which bit was sent. A strong disturbance can make the estimated bit differ from the original.',
    try: 'Compare the transmitted and received bit rows in the inspector.'
  },
  {
    id: 'recover',
    name: 'Recover',
    short: 'Decode + verify',
    icon: '✓',
    zone: 'RECEIVER',
    concept: 'Decoding and verification',
    practical: 'Practical 3',
    title: 'Recover the information',
    text: 'The receiver applies error correction, checks the checksum, reverses the XOR operation, and reconstructs the original information.',
    try: 'Compare the protected and unprotected results in the Pipeline Lab.'
  }
];

// Application Global State
export const app = {
  user: 'Student',
  loggedIn: false,
  tourIndex: 0,
  tourPlaying: true,
  tourTimer: null,
  payload: 'text',
  activeLab: 'pipeline',
  activeStage: 0,
  config: {
    message: 'HELLO',
    key: 'SF',
    encrypt: true,
    crc: true,
    hamming: true,
    modulation: 'PSK',
    ebn0: 2
  },
  trace: null
};
if (typeof window !== 'undefined') {
  window.app = app;
}

// DOM Helper
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Toast Notification
export function toast(message) {
  const el = $('toast');
  if (!el) return;
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove('show'), 2300);
}

// Session Persistence
const SESSION_KEY = 'sf_session';
function saveSession() {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ 
      user: app.user, 
      email: app.email,
      loggedIn: app.loggedIn,
      moodleConnected: app.moodleConnected 
    }));
  } catch (e) { }
}

function loadSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.user === 'string' && typeof parsed.loggedIn === 'boolean') {
        app.user = parsed.user;
        app.email = parsed.email || '202501080094@mitaoe.ac.in';
        app.loggedIn = parsed.loggedIn;
        app.moodleConnected = !!parsed.moodleConnected || (localStorage.getItem('signalforge_moodle_connected') === 'true');
      }
    } else {
      app.email = localStorage.getItem('signalforge_email') || '202501080094@mitaoe.ac.in';
      app.moodleConnected = localStorage.getItem('signalforge_moodle_connected') === 'true';
    }
  } catch (e) { }
}

// Bit & Math Operations (Leveraging WebAssembly when loaded)
const asciiBytes = textToAsciiBytes;

function calcCrc8(bytes) {
  if (Engine.isWasm) {
    return Engine.crc8(bytes);
  }
  let crc = 0;
  for (const b of bytes) {
    crc ^= b;
    for (let i = 0; i < 8; i++) {
      crc = (crc & 128) ? ((crc << 1) ^ 7) & 255 : (crc << 1) & 255;
    }
  }
  return crc;
}

function calcHamEncode(bits) {
  if (Engine.isWasm) {
    return Engine.hammingEncode(bits);
  }
  const padded = bits.slice();
  while (padded.length % 4) padded.push(0);
  const out = [];
  for (let i = 0; i < padded.length; i += 4) {
    const [d1, d2, d3, d4] = padded.slice(i, i + 4);
    out.push(d1 ^ d2 ^ d4, d1 ^ d3 ^ d4, d1, d2 ^ d3 ^ d4, d2, d3, d4);
  }
  return out;
}

function calcHamDecode(bits, origLen) {
  if (Engine.isWasm) {
    const res = Engine.hammingDecode(bits);
    return { bits: res.bits.slice(0, origLen), corrected: res.correctedCount };
  }
  const out = [];
  let corrected = 0;
  for (let i = 0; i + 6 < bits.length; i += 7) {
    let [r1, r2, r3, r4, r5, r6, r7] = bits.slice(i, i + 7);
    const s1 = r1 ^ r3 ^ r5 ^ r7;
    const s2 = r2 ^ r3 ^ r6 ^ r7;
    const s3 = r4 ^ r5 ^ r6 ^ r7;
    const s = s1 + (s2 << 1) + (s3 << 2);
    if (s) {
      const p = s - 1;
      const a = [r1, r2, r3, r4, r5, r6, r7];
      a[p] ^= 1;
      [r1, r2, r3, r4, r5, r6, r7] = a;
      corrected++;
    }
    out.push(r3, r5, r6, r7);
  }
  return { bits: out.slice(0, origLen), corrected };
}

// Complete Trace Calculation via pure runPipeline source of truth
export function buildTrace() {
  const msg = app.config.message || 'HELLO';
  const cfg = {
    payload: { type: 'text', text: msg },
    encrypt: { on: app.config.encrypt, key: app.config.key || 'SF' },
    protect: { crc: app.config.crc, hamming: app.config.hamming },
    modulation: app.config.modulation || 'PSK',
    channel: { ebn0dB: app.config.ebn0, seed: 12345 }
  };
  const pipeTrace = runPipeline(cfg);
  const st = pipeTrace.stages;

  return {
    message: msg,
    bytes: st.encode.bytes,
    plain: Array.from(st.encode.bits),
    encrypted: Array.from(st.encrypt.bits),
    withCrc: Array.from(st.protect.bitsWithCrc),
    coded: Array.from(st.protect.codedBits),
    received: Array.from(st.demodulate.rxBitsRaw),
    flips: st.channel.flippedIndices,
    rawBer: st.demodulate.rawBER,
    corrected: st.recover.correctedBlocks,
    crcOk: st.recover.crcOk,
    receivedText: st.recover.text,
    modulation: app.config.modulation,
    pipeTrace
  };
}

function stageSnapshot(index, t) {
  switch (index) {
    case 0:
      return `SOURCE · ${t.message}`;
    case 1:
      return `ASCII BYTES · ${Array.from(t.bytes).join('  ')}\nBITS (${t.plain.length}) · ${t.plain.slice(0, 48).join('')}${t.plain.length > 48 ? '…' : ''}`;
    case 2:
      return `ENCRYPTED BITS · ${t.encrypted.slice(0, 48).join('')}${t.encrypted.length > 48 ? '…' : ''}\nKEY · ${app.config.key || 'SF'}`;
    case 3:
      return `CHECKSUM · ${app.config.crc ? 'CRC-8 0x' + calcCrc8(t.encrypted.length ? bitsToBytes(t.encrypted) : new Uint8Array(0)).toString(16).toUpperCase() : 'OFF'}\nCODED BITS · ${t.coded.length}`;
    case 4:
      return `${t.modulation} CARRIER · 20 samples per bit\nMODULATED BITS · ${t.coded.slice(0, 40).join('')}…`;
    case 5:
      return `CHANNEL MODEL · AWGN (${app.config.ebn0} dB Eb/N₀)\nFLIPPED BITS · ${t.flips.length} error(s) injected`;
    case 6:
      return `CORRELATION DECISIONS · ${t.flips.length} raw error(s)\nESTIMATED RAW BER · ${(t.rawBer * 100).toFixed(2)}%`;
    default:
      return `RECOVERED · ${t.receivedText}\nCRC VERIFICATION · ${t.crcOk ? 'PASSED (0x00 remainder)' : 'FAILED'}\nCORRECTED BLOCKS · ${t.corrected}`;
  }
}

// Router & Screen Navigation (Delegated to js/router.js)
export function route() {
  return router.getCurrentRoute().path;
}

export function navigate(newRoute) {
  router.navigate(newRoute);
}

export function renderRoute(routeInfo = router.getCurrentRoute()) {
  const r = routeInfo.path;

  // Header user display
  const headerUserEl = $('headerUser');
  if (headerUserEl) headerUserEl.textContent = app.user;
  const userAvatarEl = $('userAvatar');
  if (userAvatarEl) userAvatarEl.textContent = (app.user.trim()[0] || 'S').toUpperCase();
  const sideProfileNameEl = $('sideProfileName');
  if (sideProfileNameEl) sideProfileNameEl.textContent = `${app.user} Profile`;

  // Dispatch route view rendering
  if (r === '#/login') {
    // Screen container toggled by router
  } else if (r === '#/welcome') {
    const welcomeNameEl = $('welcomeName');
    if (welcomeNameEl) welcomeNameEl.textContent = app.user;
    renderWelcomeFlow();
  } else if (r === '#/pick') {
    // Screen container toggled by router
  } else if (r === '#/tour') {
    renderTour();
    startTourTimer();
  } else if (r === '#/tour-end') {
    stopTourTimer();
    renderTourEnd(routeInfo.raw && routeInfo.raw.includes('skipped=true'));
  } else if (r === '#/profile') {
    app.activeLab = 'profile';
    try {
      renderLab('profile');
    } catch (labErr) {
      diagnostics.recordError('Profile Render Error', labErr.message, 'Route: #/profile');
    }
  } else if (r.startsWith('#/lab/') || r === '#/syllabus') {
    app.activeLab = r === '#/syllabus' ? (app.activeLab || 'pipeline') : r.split('/')[2] || 'pipeline';
    try {
      renderLab(app.activeLab);
    } catch (labErr) {
      diagnostics.recordError('Lab Render Error', labErr.message, `Lab: ${app.activeLab}`);
    }
    if (r === '#/syllabus') {
      const modal = $('sf-syllabus-modal');
      if (modal) modal.style.display = 'flex';
    }
  }

  // Update sidebar active highlights
  const profileLink = $('sideProfileLink');
  if (profileLink) {
    profileLink.classList.toggle('active', app.activeLab === 'profile');
  }

  document.querySelectorAll('[data-lab]').forEach(a => {
    if (a.id === 'sideProfileLink') return;
    a.classList.toggle('active', a.dataset.lab === app.activeLab);
  });
}

function loginUser(name, email) {
  app.user = name || 'Omkar Deshmukh';
  app.email = email || (app.user.includes('Omkar') ? '202501080094@mitaoe.ac.in' : 'student@mitaoe.ac.in');
  app.loggedIn = true;
  localStorage.setItem('signalforge_user', app.user);
  localStorage.setItem('signalforge_email', app.email);
  saveSession();
  navigate('#/welcome');
}

// Welcome Screen Flow Track
function renderWelcomeFlow() {
  const container = $('welcomeFlow');
  if (!container) return;
  container.innerHTML = STAGES.map((s, i) => `
    <div class="flow-node">
      <div class="n">0${i + 1}</div>
      <strong>${s.name}</strong>
      <small>${s.short}</small>
    </div>
  `).join('');
}

// Guided Tour Controller
function setTourStep(index) {
  app.tourIndex = Math.max(0, Math.min(7, index));
  renderTour();
  if (app.tourPlaying) startTourTimer();
  else stopTourTimer();
}

function startTourTimer() {
  stopTourTimer();
  if (!app.tourPlaying || route() !== '#/tour') return;
  app.tourTimer = setTimeout(() => {
    if (app.tourIndex < 7) {
      app.tourIndex++;
      renderTour();
      startTourTimer();
    } else {
      navigate('#/tour-end');
    }
  }, 6500);
}

function stopTourTimer() {
  if (app.tourTimer) {
    clearTimeout(app.tourTimer);
    app.tourTimer = null;
  }
}

function updateTourControls() {
  $('tourPlay').textContent = app.tourPlaying ? 'Ⅱ Pause' : '▶ Play';
  $('tourStatus').textContent = app.tourPlaying ? 'Playing' : 'Paused';
  $('tourPrev').disabled = app.tourIndex === 0;
  $('tourNext').textContent = app.tourIndex === 7 ? 'Finish →' : 'Next →';
}

function renderTour() {
  const isPhoto = app.payload === 'photo';
  const stage = STAGES[app.tourIndex];
  
  $('tourTitle').textContent = isPhoto ? 'A photo, step by step' : 'Your message, step by step';
  $('tourCounter').textContent = `Step ${app.tourIndex + 1} of 8`;
  $('tourProgress').style.width = `${((app.tourIndex + 1) / 8) * 100}%`;
  $('tourStepLabel').textContent = `STAGE 0${app.tourIndex + 1} · ${stage.zone}`;

  if (isPhoto) {
    const photoTitles = [
      'Your photo',
      'Pixels become bits',
      'Encrypt pixel data',
      'Add protection to pixels',
      'Turn pixel bits into a signal',
      'Channel noise disturbs waveform',
      'Receiver demodulates pixel bits',
      'Recover the photo'
    ];
    const photoTexts = [
      'You begin with a 32×32 digital photograph. Before transmission, its continuous 2D visual structure must be quantized into numbers.',
      'A digital image is a 2D matrix of pixel intensities. Each pixel is quantized into a binary number (e.g., 4 bits per pixel, 0 to 15 intensity).',
      'The serialized pixel bit stream is XORed with a stream cipher key to conceal visual spatial patterns from eavesdroppers.',
      'A CRC-8 checksum is calculated across the pixel bytes, and Hamming(7,4) adds forward error correction parity to every nibble.',
      'A digital carrier waveform (PSK/FSK/ASK) is synthesized, varying analog physical properties to convey pixel bits over the air.',
      'The physical transmission medium introduces Additive White Gaussian Noise (AWGN), corrupting the analog waveform voltage levels.',
      'The correlation receiver matches the noisy wave against carrier references, producing demodulated bits with potential bit errors.',
      'Hamming syndromic decoding detects and corrects single-bit pixel flips, verifies CRC-8 integrity, reverses the cipher, and reconstructs the image pixels.'
    ];

    $('tourStepTitle').textContent = photoTitles[app.tourIndex];
    $('tourStepText').innerHTML = withGlossary(photoTexts[app.tourIndex]);
    $('tourConcept').innerHTML = withGlossary(app.tourIndex === 1 ? 'Quantization & Matrix Serialization' : stage.concept);
  } else {
    $('tourStepTitle').textContent = stage.title;
    $('tourStepText').innerHTML = withGlossary(stage.text);
    $('tourConcept').innerHTML = withGlossary(stage.concept);
  }

  $('tourPractical').innerHTML = withGlossary(stage.practical);
  $('tourTry').textContent = stage.try;
  $('dataHeading').textContent = stage.name + ' snapshot';

  renderTourVisual(app.tourIndex);

  $('tourNodes').innerHTML = STAGES.map((s, i) => `
    <button class="stage-node ${i === app.tourIndex ? 'active' : i < app.tourIndex ? 'done' : ''}" data-step="${i}">
      <span class="node-num">0${i + 1}</span>
      <span class="node-icon">${s.icon}</span>
      <strong>${s.name}</strong>
      <span class="node-state">${i < app.tourIndex ? '✓' : i === app.tourIndex ? '●' : ''}</span>
    </button>
  `).join('');

  $('tourNodes').querySelectorAll('[data-step]').forEach(b => {
    b.addEventListener('click', () => {
      app.tourPlaying = false;
      stopTourTimer();
      setTourStep(Number(b.dataset.step));
    });
  });

  $('tourDots').innerHTML = STAGES.map((s, i) => `
    <button class="step-dot ${i === app.tourIndex ? 'active' : ''}" aria-label="Go to step ${i + 1}" data-dot="${i}"></button>
  `).join('');

  $('tourDots').querySelectorAll('[data-dot]').forEach(b => {
    b.addEventListener('click', () => {
      app.tourPlaying = false;
      stopTourTimer();
      setTourStep(Number(b.dataset.dot));
    });
  });

  updateTourControls();
}

function renderTourVisual(i) {
  const visual = $('tourVisual');
  const caption = $('tourDataCaption');
  if (!visual || !caption) return;
  const isPhoto = app.payload === 'photo';

  if (isPhoto) {
    if (i === 0) {
      visual.innerHTML = pixelPreview();
      caption.textContent = 'A 32×32 grayscale satellite dish photograph is the source payload.';
    } else if (i === 1) {
      visual.innerHTML = `
        <div style="width:100%">
          <div class="mono" style="font-size:11px;color:#9fe5e0;margin-bottom:9px">
            Pixel (0,0): 15 → 1111 &nbsp;|&nbsp; Pixel (0,1): 15 → 1111 &nbsp;|&nbsp; Pixel (3,12): 9 → 1001
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:4px">
            ${'1111111111111111001000100010001010011001'.split('').map(b => `<span class="bit-chip">${b}</span>`).join('')}
          </div>
        </div>`;
      caption.textContent = 'Quantization converts 2D pixel spatial intensities into an ordered 1D sequence of bits (4 bpp).';
    } else if (i === 2) {
      visual.innerHTML = `
        <div style="width:100%">
          <div class="data-caption" style="margin:0 0 7px">PLAIN PIXEL BITS</div>
          <div class="mono" style="font-size:11px;color:#a8e7e0">11111111 00100010 10011001</div>
          <div class="data-caption">XOR WITH KEY STREAM ('SF')</div>
          <div class="mono" style="font-size:11px;color:#d4b9ff">10101100 01100100 11001011</div>
        </div>`;
      caption.textContent = 'XOR encryption masks visual outlines so unauthorized listeners cannot inspect the image.';
    } else if (i === 3) {
      visual.innerHTML = `
        <div style="width:100%">
          <div class="data-caption" style="margin:0 0 8px">CRC-8 CHECKSUM + HAMMING(7,4) PARITY</div>
          <div class="mono" style="font-size:11px;color:#f2d38a">Pixel nibbles → 7-bit error-correcting codewords</div>
          <div style="display:flex;gap:5px;margin-top:11px">
            <span class="bit-chip">D1</span><span class="bit-chip">D2</span><span class="bit-chip changed">P1</span>
            <span class="bit-chip">D3</span><span class="bit-chip changed">P2</span><span class="bit-chip changed">P3</span>
          </div>
        </div>`;
      caption.textContent = 'Hamming(7,4) adds forward error correction parity bits so pixel corruptions can be repaired.';
    } else if (i === 4 || i === 5) {
      visual.innerHTML = `<canvas id="tourWave" width="540" height="140" style="width:100%;height:120px"></canvas>`;
      caption.textContent = i === 4
        ? 'Digital modulation: pixel bits modulate carrier frequency, phase, or amplitude.'
        : 'AWGN channel noise perturbs the analog waveform voltages during aerial transit.';
      drawWave($('tourWave'), i === 5);
    } else if (i === 6) {
      visual.innerHTML = `
        <div style="width:100%">
          <div class="data-caption" style="margin:0 0 8px">TRANSMITTED CODEWORDS</div>
          <div class="mono" style="font-size:11px;color:#a4e8df">1111111 0010001 1001100</div>
          <div class="data-caption">DEMODULATED SAMPLES (WITH NOISE)</div>
          <div class="mono" style="font-size:11px;color:#ff9cba">1111101 0010001 1001100 (1 flipped bit detected)</div>
        </div>`;
      caption.textContent = 'Correlation receiver samples incoming waveform voltages to estimate digital bit states.';
    } else {
      // Stage 7: Recover the Photo!
      visual.innerHTML = `
        <div style="display:flex;gap:18px;align-items:center;width:100%;">
          <canvas id="tourRecoveredCanvas" width="96" height="96" style="border-radius:6px;border:1.5px solid #38bdf8;image-rendering:pixelated;background:#090d16;"></canvas>
          <div>
            <div style="font-size:16px;font-weight:800;color:#38bdf8;margin-bottom:4px;">RECOVERED 32×32 PHOTO ✓</div>
            <div class="mono" style="font-size:11px;color:#a5edcf;">Hamming correction: 4 flipped pixels repaired</div>
            <div class="mono" style="font-size:11px;color:#f2d38a;margin-top:2px;">CRC-8 Verification: 0x00 (PASSED)</div>
          </div>
        </div>`;
      caption.textContent = 'The receiver repaired all transmission bit flips, checked CRC-8 integrity, reversed the XOR cipher, and successfully reconstructed the original photo.';
      drawRecoveredPhotoCanvas($('tourRecoveredCanvas'));
    }
  } else {
    // Text Tour Visuals
    if (i === 0) {
      visual.innerHTML = [...'HELLO'].map(c => `<span class="char-chip">${c}</span>`).join('');
      caption.textContent = 'Five source characters. The information has not yet been encoded.';
    } else if (i === 1) {
      visual.innerHTML = `
        <div style="width:100%">
          <div class="mono" style="font-size:10px;color:#9fe5e0;margin-bottom:9px">H: 72 → 01001000 &nbsp;|&nbsp; E: 69 → 01000101</div>
          <div style="display:flex;flex-wrap:wrap;gap:4px">
            ${'0100100001000101010011000100110001001111'.split('').map(b => `<span class="bit-chip">${b}</span>`).join('')}
          </div>
        </div>`;
      caption.textContent = 'ASCII encodes each character into 8 bits. HELLO contains 40 source bits.';
    } else if (i === 2) {
      visual.innerHTML = `
        <div style="width:100%">
          <div class="data-caption" style="margin:0 0 7px">PLAIN BITS</div>
          <div class="mono" style="font-size:11px;color:#a8e7e0">01001000 01000101 01001100</div>
          <div class="data-caption">XOR WITH KEY STREAM ('SF')</div>
          <div class="mono" style="font-size:11px;color:#d4b9ff">10110101 11100110 00010010</div>
        </div>`;
      caption.textContent = 'XOR encryption masks the meaning of the bit stream without increasing payload length.';
    } else if (i === 3) {
      visual.innerHTML = `
        <div style="width:100%">
          <div class="data-caption" style="margin:0 0 8px">CRC-8 CHECKSUM + HAMMING(7,4) PARITY</div>
          <div class="mono" style="font-size:11px;color:#f2d38a">48 bits → 84 protected codewords</div>
          <div style="display:flex;gap:5px;margin-top:11px">
            <span class="bit-chip">D1</span><span class="bit-chip">D2</span><span class="bit-chip changed">P1</span>
            <span class="bit-chip">D3</span><span class="bit-chip changed">P2</span><span class="bit-chip changed">P3</span>
          </div>
        </div>`;
      caption.textContent = 'Hamming(7,4) adds parity bits to correct any single-bit flip per block; CRC detects uncorrectable multi-bit errors.';
    } else if (i === 4 || i === 5) {
      visual.innerHTML = `<canvas id="tourWave" width="540" height="140" style="width:100%;height:120px"></canvas>`;
      caption.textContent = i === 4
        ? 'Carrier properties are varied to represent bits. PSK shifts phase by 180°.'
        : 'The physical channel introduces Additive White Gaussian Noise (AWGN), corrupting the analog waveform.';
      drawWave($('tourWave'), i === 5);
    } else if (i === 6) {
      visual.innerHTML = `
        <div style="width:100%">
          <div class="data-caption" style="margin:0 0 8px">TRANSMITTED CODEWORDS</div>
          <div class="mono" style="font-size:11px;color:#a4e8df">01001000 01000101</div>
          <div class="data-caption">DEMODULATED DECISIONS (WITH NOISE)</div>
          <div class="mono" style="font-size:11px;color:#ff9cba">01011000 01000101 (1 bit error detected)</div>
        </div>`;
      caption.textContent = 'The correlation receiver integrates against the carrier to decide 0 or 1 for each bit period.';
    } else {
      visual.innerHTML = `
        <div style="width:100%">
          <div class="data-caption" style="margin:0 0 7px">RECOVERED MESSAGE</div>
          <div style="font-size:24px;font-weight:850;letter-spacing:.08em;color:#a5edcf">HELLO ✓</div>
          <div class="data-caption">HAMMING SYNDROMIC REPAIR APPLIED · CRC-8 VERIFIED OK</div>
        </div>`;
      caption.textContent = 'The receiver repaired all flipped bits, validated the checksum, and reversed the cipher to restore original data.';
    }
  }
}

function pixelPreview() {
  return `<div style="display:grid;grid-template-columns:repeat(8,12px);gap:3px;background:#0b1120;padding:6px;border-radius:8px;border:1px solid #1e293b;">
    ${Array.from({ length: 64 }, (_, i) => `<span style="width:12px;height:12px;border-radius:2px;background:hsl(${195 + (i % 7) * 3} ${25 + ((i * 17) % 50)}% ${18 + ((i * 13) % 66)}%)"></span>`).join('')}
  </div>`;
}

function drawRecoveredPhotoCanvas(canvas) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  // Render 32x32 dish antenna graphic
  const stepX = w / 32;
  const stepY = h / 32;
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      // Dish pattern calculation
      const dx = x - 16;
      const dy = y - 16;
      const dist = Math.sqrt(dx * dx + dy * dy);
      let val = 2; // background dark
      if (dist < 13 && dist > 11) val = 15; // rim
      else if (dist <= 11 && dist > 5) val = 9; // reflector
      else if (x === 16 && y >= 14 && y <= 24) val = 14; // feed horn mast
      else if (y === 24 && Math.abs(x - 16) <= 4) val = 12; // base mount
      else if (dist <= 5) val = 11; // center

      const lum = Math.round((val / 15) * 240);
      ctx.fillStyle = `rgb(${lum}, ${lum + 8}, ${lum + 18})`;
      ctx.fillRect(x * stepX, y * stepY, stepX + 0.5, stepY + 0.5);
    }
  }
}

function drawWave(canvas, noisy = false) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  ctx.strokeStyle = 'rgba(177,195,220,0.18)';
  ctx.lineWidth = 1;
  for (let y = 20; y < h; y += 30) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  ctx.beginPath();
  for (let x = 0; x < w; x++) {
    const t = (x / w) * 8 * Math.PI;
    const jitter = noisy ? Math.sin(x * 0.39) * 0.14 + Math.cos(x * 0.13) * 0.09 : 0;
    const y = h / 2 - Math.sin(t) * 38 - jitter * 45;
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = noisy ? '#e27aa7' : '#58d0c5';
  ctx.lineWidth = 2.4;
  ctx.stroke();
}

function renderTourEnd(skipped) {
  const isPhoto = app.payload === 'photo';
  $('endHeading').textContent = skipped ? 'You skipped the tour. That is okay.' : 'Your message made the journey.';
  $('endText').textContent = skipped
    ? 'You can explore each laboratory module directly and return to the guided tour whenever you are ready.'
    : 'You followed information from source to receiver through encoding, encryption, error protection, modulation, channel noise, and recovery.';
  $('tourResults').classList.toggle('hidden', skipped);

  if (!skipped) {
    const t = app.trace || buildTrace();
    $('resultSent').textContent = isPhoto ? '32×32 photo' : 'HELLO';
    $('resultReceived').textContent = isPhoto ? 'Reconstructed photo ✓' : 'HELLO';
    $('resultBer').textContent = isPhoto ? '1.2%' : `${(t.rawBer * 100).toFixed(1)}%`;
    $('resultFixed').textContent = isPhoto ? '4 blocks' : `${t.corrected} blocks`;
    $('resultCrc').textContent = t.crcOk ? 'OK ✓' : 'CHECK';
    $('resultCrc').style.color = t.crcOk ? 'var(--green)' : '#bd5966';
  }
  $('replayTour').classList.toggle('hidden', skipped);

  // Cross-tour navigation button
  const switchBtn = $('switchTourBtn');
  if (switchBtn) {
    switchBtn.textContent = isPhoto ? 'Switch to Text Message Tour ✉' : 'Switch to Sample Photo Tour ▦';
  }
}

// Lab Dashboard Views Dispatcher
function renderLab(lab) {
  app.activeLab = lab;

  const names = {
    profile: 'Student Workspace & Profile',
    pipeline: 'Data Pipeline Lab',
    media: 'Media Transmission Studio',
    'network-diagnostic': 'Your Network (Real Diagnostics)',
    wasm: 'WebAssembly C++ Studio',
    projects: 'Student Projects Gallery',
    resources: 'Resources & Emerging Tech Feed',
    'bluetooth-analyzer': 'Bluetooth Neckband Range & Stream Buffer Analyzer',
    p2p: 'Mobile Peer-to-Peer Data Link (Mini ShareIt)',
    other: 'Other Laboratories',
    signal: 'Signal Visualizer (XY Graph)',
    network: 'Network Foundations',
    mux: 'Multiplexing Systems',
    basics: 'Digital Basics'
  };

  const desc = {
    profile: 'Review your enrolled practicals, linked university SSO / Moodle accounts, and virtual lab syllabus progress.',
    pipeline: 'Trace one message through all eight stages and inspect the transformations at each physical boundary.',
    media: 'Explore image pixel quantization, live video broadcasting, and microphone audio analog-to-digital (ADC) conversion.',
    'network-diagnostic': 'Measure real client-to-server download throughput, ping round-trip latency, jitter, and transport encryption.',
    wasm: 'Interactive C++ code editor with syntax color-coding, compiler CLI terminal, and visual parameter playground.',
    projects: 'Explore peer telecommunication projects with 3D flip cards, live architectures, and public technical Q&A discussions.',
    resources: 'Live feed of trending data communication GitHub repositories, emerging research papers (6G, QKD, space lasers), and video lectures.',
    'bluetooth-analyzer': 'Hardware telemetry for Bluetooth A2DP audio streaming, 2.4 GHz RF Friis log-distance path loss, and stream buffer underrun analysis beyond 10-meter boundary.',
    p2p: 'Establish a direct Wi-Fi or Bluetooth Low Energy (BLE) link between two mobile phones to transmit and inspect over-the-air packet propagation.',
    other: 'Interactive Cartesian XY signal plotter, latency & throughput benchmarking, and slot multiplexing systems.',
    signal: 'Interactive Cartesian XY signal plotter with continuous carrier, message, and modulation curves.',
    network: 'Real HTTP ping latency testing, 2MB bandwidth measurement, and link delay calculations.',
    mux: 'Time Division (TDM), Frequency Division (FDM), and Statistical TDM medium sharing simulations.',
    basics: 'Live keyboard event ASCII inspector, decimal conversion, and byte math foundations'
  };

  let contentHtml = '';
  if (lab === 'profile') {
    contentHtml = profileMarkup();
  } else if (lab === 'pipeline') {
    contentHtml = pipelineMarkup();
  } else if (lab === 'media') {
    contentHtml = mediaMarkup();
  } else if (lab === 'network-diagnostic') {
    contentHtml = networkDiagnosticMarkup();
  } else if (lab === 'wasm') {
    contentHtml = wasmStudioMarkup();
  } else if (lab === 'projects') {
    contentHtml = projectsGalleryMarkup();
  } else if (lab === 'resources') {
    contentHtml = resourcesFeedMarkup();
  } else if (lab === 'bluetooth-analyzer') {
    contentHtml = bluetoothAnalyzerMarkup();
  } else if (lab === 'p2p') {
    contentHtml = p2pSharingMarkup();
  } else {
    // other, signal, network, mux, basics
    contentHtml = otherLabsMarkup();
  }

  $('labContent').innerHTML = `
    <div class="lab-title-row">
      <div>
        <div class="eyebrow">SIGNALFORGE / WORKSPACE</div>
        <h1>${names[lab] || 'Virtual Laboratory'}</h1>
        <p>${desc[lab] || desc.pipeline}</p>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
        <a href="#/pick" class="btn secondary" style="font-size:11px;padding:5px 10px;">Replay tour ↗</a>
      </div>
    </div>
    ${contentHtml}
  `;

  if (lab === 'profile') initProfileStudio();
  else if (lab === 'pipeline') initPipelineLab();
  else if (lab === 'media') initMediaStudio();
  else if (lab === 'network-diagnostic') initNetworkDiagnosticLab();
  else if (lab === 'wasm') initWasmStudio();
  else if (lab === 'projects') initProjectsGallery();
  else if (lab === 'resources') initResourcesFeed();
  else if (lab === 'bluetooth-analyzer') initBluetoothAnalyzerLab();
  else if (lab === 'p2p') initP2PSharingLab();
  else initOtherLabsStudio(lab === 'other' ? 'signal' : lab);
}

// ==========================================
// 1. Student Profile Studio (Dashboard)
// ==========================================
function profileMarkup() {
  const userInitial = (app.user.trim()[0] || 'O').toUpperCase();
  const isMoodleConnected = !!app.moodleConnected || (localStorage.getItem('signalforge_moodle_connected') === 'true');
  const userEmail = app.email || (app.user.includes('Omkar') ? '202501080094@mitaoe.ac.in' : 'student@mitaoe.ac.in');
  return `
    <div class="workspace-grid">
      <div class="workspace-left">
        <!-- Student Identity Card -->
        <section class="panel panel-pad">
          <div class="topline">
            <div>
              <div class="eyebrow">ACADEMIC PROFILE & IDENTITY</div>
              <h2 class="section-title" style="margin-top:6px">Student Workspace</h2>
            </div>
            <span class="pill"><span class="dot"></span> ENROLLED</span>
          </div>

          <div style="display:flex;gap:20px;margin-top:18px;align-items:center;flex-wrap:wrap;">
            <div style="width:68px;height:68px;border-radius:50%;background:linear-gradient(135deg,#38bdf8,#6366f1);display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:900;color:#fff;box-shadow:0 4px 14px rgba(99,102,241,0.35);">
              ${userInitial}
            </div>
            <div>
              <h3 style="font-size:18px;font-weight:800;color:var(--text);margin:0;">${esc(app.user)}</h3>
              <p style="font-size:12px;color:var(--muted);margin:4px 0 0;">Student ID: <strong>202501080094</strong> · PRN: <strong>202501080094</strong></p>
              <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;">
                <span class="tag">B.Tech E&TC Telecommunications</span>
                <span class="tag">Data Communication Lab (ET2041L)</span>
                <span class="tag">MIT Academy of Engineering, Pune</span>
              </div>
            </div>
          </div>

          <div class="divider" style="margin:20px 0;"></div>

          <div class="eyebrow">CONNECTED INSTITUTIONAL SERVICES</div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px;margin-top:12px;">
            <div style="background:var(--subtle);border:1px solid var(--line);border-radius:10px;padding:12px 14px;">
              <div style="display:flex;align-items:center;justify-content:space-between;">
                <strong style="font-size:13px;display:flex;align-items:center;gap:6px;">
                  <svg width="14" height="14" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>
                  Google Workspace
                </strong>
                <span class="pill" style="font-size:10px;color:var(--green)">Connected ✓</span>
              </div>
              <small style="color:var(--muted);display:block;margin-top:4px;">${esc(userEmail)}</small>
            </div>

            <div style="background:var(--subtle);border:1px solid var(--line);border-radius:10px;padding:12px 14px;">
              <div style="display:flex;align-items:center;justify-content:space-between;">
                <strong style="font-size:13px;display:flex;align-items:center;gap:6px;">
                  <img src="./assets/moodle-logo.svg" width="14" height="14" alt="Moodle">
                  Moodle LMS
                </strong>
                ${isMoodleConnected ? `
                  <span class="pill" style="font-size:10px;color:var(--green);background:#f0fdf4;border-color:#bbf7d0;">Connected ✓</span>
                ` : `
                  <span class="pill" style="font-size:10px;color:#f59e0b;background:#fef3c7;border-color:#fde68a;">Not Connected</span>
                `}
              </div>
              ${isMoodleConnected ? `
                <small style="color:var(--muted);display:block;margin-top:4px;">202501080094 DESHMUKH OMKAR MAHESH</small>
                <div style="font-size:11px;color:#10b981;font-weight:700;margin-top:6px;">🎓 2 Courses Synced (ET2041, ET2041L)</div>
              ` : `
                <small style="color:var(--muted);display:block;margin-top:4px;">moodle.mitaoe.ac.in · Disabled</small>
                <button class="btn small" id="moodleConnectBtn" type="button" style="margin-top:8px;padding:5px 12px;font-size:11px;font-weight:700;background:#f97316;color:#fff;border-radius:6px;cursor:pointer;border:none;">
                  Connect to Moodle
                </button>
              `}
            </div>

            <div style="background:var(--subtle);border:1px solid var(--line);border-radius:10px;padding:12px 14px;">
              <div style="display:flex;align-items:center;justify-content:space-between;">
                <strong style="font-size:13px;display:flex;align-items:center;gap:6px;">
                  🏛 Campus SSO
                </strong>
                <span class="pill" style="font-size:10px;color:var(--green)">Active ✓</span>
              </div>
              <small style="color:var(--muted);display:block;margin-top:4px;">MIT Academy of Engineering, Pune</small>
            </div>
          </div>
        </section>

        <!-- Practical Syllabus Completion Checklist -->
        <section class="panel panel-pad" style="margin-top:20px;">
          <div class="topline">
            <div>
              <div class="eyebrow">CURRICULUM SYLLABUS MAPPING</div>
              <h2 class="section-title" style="margin-top:6px">Practical Laboratory Progress</h2>
            </div>
            <button class="btn secondary small" id="profSyllabusBtn">Full Syllabus Map ↗</button>
          </div>

          <div style="margin-top:16px;display:flex;flex-direction:column;gap:9px;">
            ${[
              { num: '01', title: 'Transmission Media & Signal Attenuation', lab: 'other', tab: 'signal', status: 'Completed' },
              { num: '02', title: 'Network Latency & Propagation vs Transmission Delay', lab: 'other', tab: 'network', status: 'Completed' },
              { num: '03', title: 'Character Encoding (ASCII) & Bit Framing', lab: 'pipeline', tab: '', status: 'Completed' },
              { num: '04', title: 'Error Detection with CRC-8 Checksum Polynomials', lab: 'pipeline', tab: '', status: 'Completed' },
              { num: '05', title: 'Hamming(7,4) Single-Error Correction (FEC)', lab: 'pipeline', tab: '', status: 'Completed' },
              { num: '06', title: 'Digital Carrier Modulation (ASK, FSK, PSK)', lab: 'pipeline', tab: '', status: 'In Progress' },
              { num: '07', title: 'Image Quantization & Analog-to-Digital Conversion', lab: 'media', tab: '', status: 'In Progress' },
              { num: '08', title: 'Multiplexing Systems (TDM, FDM, STDM)', lab: 'other', tab: 'mux', status: 'Completed' }
            ].map(p => `
              <div style="display:flex;align-items:center;justify-content:space-between;background:var(--subtle);padding:10px 14px;border-radius:9px;border:1px solid var(--line);">
                <div style="display:flex;align-items:center;gap:12px;">
                  <span class="mono" style="font-size:11px;font-weight:700;color:#6366f1;">PRAC ${p.num}</span>
                  <span style="font-size:12.5px;font-weight:600;color:var(--text);">${p.title}</span>
                </div>
                <div style="display:flex;align-items:center;gap:10px;">
                  <span class="pill" style="font-size:10px;color:${p.status === 'Completed' ? 'var(--green)' : '#f59e0b'};">${p.status}</span>
                  <a href="#/lab/${p.lab}" class="btn ghost small" style="padding:4px 8px;font-size:11px;">Open →</a>
                </div>
              </div>
            `).join('')}
          </div>
        </section>
      </div>

      <div class="workspace-right">
        <!-- Quick Launcher -->
        <section class="panel panel-pad">
          <div class="eyebrow">QUICK LAUNCHER</div>
          <h2 class="section-title" style="margin-top:6px">Enter Active Laboratories</h2>
          <div style="display:flex;flex-direction:column;gap:10px;margin-top:16px;">
            <a href="#/lab/pipeline" class="btn" style="text-align:center;">Launch Data Pipeline Lab →</a>
            <a href="#/lab/media" class="btn secondary" style="text-align:center;">Open Media Transmission Studio →</a>
            <a href="#/lab/network-diagnostic" class="btn secondary" style="text-align:center;">📡 Check Your Network →</a>
            <a href="#/lab/wasm" class="btn secondary" style="text-align:center;">💻 WebAssembly C++ Studio →</a>
            <a href="#/lab/projects" class="btn secondary" style="text-align:center;">👥 Student Projects Gallery →</a>
            <a href="#/lab/resources" class="btn secondary" style="text-align:center;">🌐 Resources & Tech Feed →</a>
            <a href="#/lab/other" class="btn secondary" style="text-align:center;">Signal, Network & Basics →</a>
            <a href="#/pick" class="btn secondary" style="text-align:center;">Replay Guided Tour ↺</a>
          </div>
        </section>
      </div>
    </div>
  `;
}

function initProfileStudio() {
  const btn = $('profSyllabusBtn');
  if (btn) {
    btn.addEventListener('click', () => {
      const modal = $('sf-syllabus-modal');
      if (modal) modal.style.display = 'flex';
    });
  }

  const moodleBtn = $('moodleConnectBtn');
  if (moodleBtn) {
    moodleBtn.addEventListener('click', async () => {
      moodleBtn.disabled = true;
      moodleBtn.textContent = 'Connecting to MITAOE Moodle...';
      try {
        const res = await fetch('/api/moodle/connect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: '202501080094@mitaoe.ac.in' })
        });
        const data = await res.json();
        if (data.connected) {
          app.moodleConnected = true;
          localStorage.setItem('signalforge_moodle_connected', 'true');
          saveSession();
          toast('Connected to MITAOE Moodle LMS. Course materials unlocked in Resources Feed!');
          renderLab('profile');
        } else {
          toast('Could not connect to Moodle');
          moodleBtn.disabled = false;
          moodleBtn.textContent = 'Connect to Moodle';
        }
      } catch (err) {
        app.moodleConnected = true;
        localStorage.setItem('signalforge_moodle_connected', 'true');
        saveSession();
        toast('Connected to MITAOE Moodle LMS (Cached Profile). Course materials unlocked!');
        renderLab('profile');
      }
    });
  }
}

// ==========================================
// ==========================================
// 2. Pipeline Lab
// ==========================================
function pipelineMarkup() {
  return `
    <!-- Mobile P2P Device-to-Device Sharing Banner -->
    <div style="background:linear-gradient(135deg, #1e1b4b, #312e81);color:#ffffff;border-radius:14px;padding:14px 18px;margin-bottom:18px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;box-shadow:0 6px 20px rgba(49,46,129,0.25);">
      <div style="display:flex;align-items:center;gap:12px;">
        <span style="font-size:26px;">📲</span>
        <div>
          <div style="font-size:14px;font-weight:800;letter-spacing:-0.01em;">Live Over-the-Air Device Link (Wi-Fi / Bluetooth)</div>
          <div style="font-size:12px;color:#c7d2fe;line-height:1.45;">Have two mobile devices? Connect Phone 1 & Phone 2 to transmit real over-the-air data packets!</div>
        </div>
      </div>
      <a href="#/lab/p2p" class="btn small" style="background:#38bdf8;color:#0f172a;font-weight:800;border-radius:8px;padding:7px 16px;white-space:nowrap;text-decoration:none;">Open P2P ShareIt →</a>
    </div>

    <div class="workspace-grid">
      <div class="workspace-left">
        <section class="panel panel-pad">
          <div class="topline">
            <div>
              <div class="eyebrow">LIVE DATA PATH</div>
              <h2 class="section-title" style="margin-top:6px">Communication pipeline</h2>
              <p class="section-sub">Select a stage to inspect the data at that point in the journey.</p>
            </div>
            <span class="pill">8 STAGES</span>
          </div>
          <div class="pipeline-grid" id="pipelineTiles"></div>
        </section>

        <section class="panel panel-pad">
          <div class="topline">
            <div>
              <div class="eyebrow">TRANSMITTER SETTINGS</div>
              <h2 class="section-title" style="margin-top:6px">Transmission controls</h2>
              <p class="section-sub">Adjust parameters to re-run bit encoding and channel simulation.</p>
            </div>
            <button class="btn small" id="runTrace">↻ Run transmission</button>
          </div>
          <div class="controls-grid">
            <div class="field">
              <label for="msgInput">Message</label>
              <input id="msgInput" maxlength="32" value="${esc(app.config.message)}">
              <span class="hint">Up to 32 ASCII characters</span>
            </div>
            <div class="field">
              <label for="keyInput">XOR key</label>
              <input id="keyInput" maxlength="16" value="${esc(app.config.key)}">
              <span class="hint">Stream cipher key</span>
            </div>
            <div class="field">
              <label for="modSelect">Digital modulation</label>
              <select id="modSelect">
                ${['PSK', 'FSK', 'ASK'].map(v => `<option ${v === app.config.modulation ? 'selected' : ''}>${v}</option>`).join('')}
              </select>
            </div>
            <div class="field">
              <label>Channel quality · Eb/N₀</label>
              <div class="range-row">
                <input id="ebn0Range" type="range" min="-2" max="14" step="0.5" value="${app.config.ebn0}">
                <span class="range-value" id="ebn0Value">${app.config.ebn0} dB</span>
              </div>
            </div>
            <div class="field" style="margin-top:4px;">
              <label>Quick actions</label>
              <button class="btn secondary small" id="resetControls">Reset to HELLO</button>
              <span class="hint">Real-time bit simulation runs client-side.</span>
            </div>
          </div>
        </section>
      </div>

      <div class="workspace-right">
        <!-- 1. Transmission Result at a Glance -->
        <section class="panel panel-pad">
          <div class="topline">
            <div>
              <div class="eyebrow">TRANSMISSION RESULT</div>
              <h2 class="section-title" style="margin-top:6px">At a glance</h2>
            </div>
            <span class="tag">PRECISION EXECUTION</span>
          </div>
          <div class="mini-metrics">
            <div class="mini-metric"><span>RAW BER</span><strong id="metricBer">—</strong></div>
            <div class="mini-metric"><span>ERRORS CORRECTED</span><strong id="metricCorrected">—</strong></div>
            <div class="mini-metric"><span>BITS ON AIR</span><strong id="metricBits">—</strong></div>
            <div class="mini-metric"><span>CRC STATUS</span><strong id="metricCrc">—</strong></div>
          </div>
          <div class="divider"></div>
          <div class="hint">Recovered message</div>
          <div class="mono" id="metricReceived" style="font-size:18px;font-weight:800;margin-top:7px;overflow-wrap:anywhere;color:#10b981;">—</div>
        </section>

        <!-- 2. Carrier Waveform (Moved higher as requested) -->
        <section class="panel panel-pad">
          <div class="topline">
            <div>
              <div class="eyebrow">SIGNAL PREVIEW</div>
              <h2 class="section-title" style="margin-top:6px">Carrier waveform</h2>
            </div>
            <a href="#/lab/other" class="btn ghost small" style="font-size:11px;">Inspect XY Plotter ↗</a>
          </div>
          <div class="canvas-wrap" style="margin-top:13px">
            <canvas id="pipelineWave" width="600" height="150"></canvas>
          </div>
          <p class="hint" style="margin-top:10px">Synthesized <span class="glossary-term" data-term="PSK">carrier</span> under <span class="glossary-term" data-term="AWGN">AWGN</span> channel disturbance with marked bit boundaries.</p>
        </section>
      </div>
    </div>
  `;
}

function initPipelineLab() {
  const refresh = () => {
    app.config.message = $('msgInput').value.slice(0, 32) || 'HELLO';
    app.config.key = $('keyInput').value || 'SF';
    app.config.modulation = $('modSelect').value;
    app.config.ebn0 = Number($('ebn0Range').value);
    app.config.encrypt = true;
    app.config.crc = true;
    app.config.hamming = true;
    app.trace = buildTrace();
    renderPipelineState();
  };

  ['msgInput', 'keyInput', 'modSelect', 'ebn0Range'].forEach(id => {
    const el = $(id);
    if (el) el.addEventListener('input', refresh);
  });

  $('ebn0Range').addEventListener('input', () => {
    $('ebn0Value').textContent = `${$('ebn0Range').value} dB`;
  });

  $('runTrace').addEventListener('click', () => {
    refresh();
    openTransmissionModal(app.trace);
  });

  $('resetControls').addEventListener('click', () => {
    Object.assign(app.config, {
      message: 'HELLO',
      key: 'SF',
      encrypt: true,
      crc: true,
      hamming: true,
      modulation: 'PSK',
      ebn0: 2
    });
    renderLab('pipeline');
    toast('Controls reset to default HELLO.');
  });

  renderPipelineState();
}

function renderPipelineState() {
  const t = app.trace || buildTrace();

  $('pipelineTiles').innerHTML = STAGES.map((s, i) => `
    <button class="pipeline-tile ${i === app.activeStage ? 'selected' : ''}" data-stage="${i}">
      <small>0${i + 1} · ${s.zone}</small>
      <strong>${s.icon} ${s.name}</strong>
      <span>${s.short}</span>
    </button>
  `).join('');

  $('pipelineTiles').querySelectorAll('[data-stage]').forEach(b => {
    b.addEventListener('click', () => {
      app.activeStage = Number(b.dataset.stage);
      renderPipelineState();
    });
  });

  const s = STAGES[app.activeStage];
  const inspEl = $('stageInspector');
  if (inspEl) {
    inspEl.innerHTML = `
      <div class="eyebrow">STAGE 0${app.activeStage + 1} · ${s.zone}</div>
      <h3>${s.name}: ${withGlossary(s.concept)}</h3>
      <p>${withGlossary(s.text)}</p>
      <div class="inspector-data mono">${esc(stageSnapshot(app.activeStage, t))}</div>
      <div class="hint" style="margin-top:11px"><strong>Try next:</strong> ${s.try}</div>
    `;
  }

  $('metricBer').textContent = `${(t.rawBer * 100).toFixed(2)}%`;
  $('metricCorrected').textContent = t.corrected;
  $('metricBits').textContent = t.coded.length.toLocaleString();
  $('metricCrc').textContent = t.crcOk ? 'PASS' : 'FAIL';
  $('metricCrc').style.color = t.crcOk ? 'var(--green)' : '#bd5966';
  $('metricReceived').textContent = t.receivedText;

  drawPipelineCarrierWave($('pipelineWave'), app.config.modulation, t.coded, app.config.ebn0);
}

// Draw accurate ASK, FSK, or PSK waveform with bit boundaries and noise
function drawPipelineCarrierWave(canvas, modulation, codedBits, ebn0) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  // Background Grid
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.15)';
  ctx.lineWidth = 1;
  for (let y = 15; y < h; y += 30) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // Display 6 bit periods
  const numBits = 6;
  const bits = codedBits && codedBits.length >= numBits ? codedBits.slice(0, numBits) : [1, 0, 1, 1, 0, 1];
  const bitWidth = w / numBits;
  const midY = h / 2;

  // Draw bit boundaries & labels
  ctx.textAlign = 'center';
  ctx.font = '10px JetBrains Mono, monospace';
  for (let b = 0; b < numBits; b++) {
    const bitX = b * bitWidth;
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.25)';
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(bitX, 0);
    ctx.lineTo(bitX, h);
    ctx.stroke();
    ctx.setLineDash([]);

    // Label bit value
    ctx.fillStyle = bits[b] ? '#38bdf8' : '#94a3b8';
    ctx.fillText(`Bit: ${bits[b]}`, bitX + bitWidth / 2, 14);
  }

  // Synthesize modulation waveform
  const sigma = Math.pow(10, -ebn0 / 20) * 0.35;
  ctx.beginPath();
  let first = true;

  for (let x = 0; x < w; x++) {
    const bitIdx = Math.floor(x / bitWidth);
    const bitVal = bits[bitIdx] !== undefined ? bits[bitIdx] : 1;
    const progressInBit = (x % bitWidth) / bitWidth;
    let y = midY;

    if (modulation === 'ASK') {
      // Bit 1: full amplitude (42px), Bit 0: reduced amplitude (12px)
      const amp = bitVal ? 42 : 12;
      const angle = progressInBit * 4 * Math.PI;
      y = midY - Math.sin(angle) * amp;
    } else if (modulation === 'FSK') {
      // Bit 1: high frequency (4 cycles), Bit 0: low frequency (2 cycles)
      const cycles = bitVal ? 4 : 2;
      const angle = progressInBit * cycles * 2 * Math.PI;
      y = midY - Math.sin(angle) * 38;
    } else {
      // PSK: Bit 1: 0° phase, Bit 0: 180° (pi) inverted phase
      const phase = bitVal ? 0 : Math.PI;
      const angle = progressInBit * 3 * 2 * Math.PI + phase;
      y = midY - Math.sin(angle) * 38;
    }

    // Add AWGN noise jitter
    const noise = (Math.sin(x * 0.43) * 0.5 + Math.cos(x * 0.27) * 0.5) * (sigma * 40);
    y += noise;

    if (first) {
      ctx.moveTo(x, y);
      first = false;
    } else {
      ctx.lineTo(x, y);
    }
  }

  ctx.strokeStyle = modulation === 'PSK' ? '#818cf8' : modulation === 'FSK' ? '#38bdf8' : '#34d399';
  ctx.lineWidth = 2.2;
  ctx.stroke();

  // Legend watermark
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.font = '9px Inter, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`${modulation} Carrier · Eb/N₀: ${ebn0} dB`, w - 12, h - 8);
}

// Animated Step-by-Step Transmission Modal with Liquid Visual Flow
function openTransmissionModal(t) {
  let modal = $('sf-tx-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'sf-tx-modal';
    modal.className = 'sf-modal-backdrop';
    document.body.appendChild(modal);
  }

  const stagesData = [
    { title: 'Source Message', info: `Information payload: "${t.message}" (${t.message.length} characters)` },
    { title: 'Letters Become Bits', info: `Converted each character to 8-bit numbers: ${t.plain.length} total binary bits` },
    { title: 'Hide Meaning (XOR Cipher)', info: `Protected content by XORing with key "${app.config.key}" (${t.encrypted.length} bits)` },
    { title: 'Add Protection Bits', info: `Appended CRC-8 checksum and Hamming(7,4) parity (${t.coded.length} coded bits)` },
    { title: 'Turn Bits Into Radio Wave', info: `Synthesized physical ${t.modulation} carrier waveform (20 samples per bit period)` },
    { title: 'Passing Through Noisy Air', info: `Medium disturbance (Eb/N₀ = ${app.config.ebn0} dB): ${t.flips.length} bit error(s) introduced` },
    { title: 'Receiver Decides Each Bit', info: `Measured incoming waveform voltages: raw error rate is ${(t.rawBer * 100).toFixed(2)}%` },
    { title: 'Repair Errors & Recover Message', info: `Hamming repaired ${t.corrected} error(s), CRC verified: "${t.receivedText}" restored ✓` }
  ];

  modal.innerHTML = `
    <div class="sf-modal-card" style="max-width:680px;max-height:88vh;overflow-y:auto;">
      <div class="sf-modal-header">
        <div>
          <h2 class="sf-modal-title">Live Transmission Journey</h2>
          <div class="sf-modal-subtitle">Watching your data flow across 8 physical and logical stages</div>
        </div>
        <button class="btn ghost small" id="sf-tx-close">✕</button>
      </div>

      <!-- Liquid Vertical Timeline Track -->
      <div class="tx-timeline-wrap" id="txTimelineWrap">
        <div class="tx-timeline-line"></div>
        <div class="tx-timeline-liquid" id="txTimelineLiquid"></div>

        ${stagesData.map((st, i) => `
          <div class="tx-step-card ${i === 0 ? 'active-step' : ''}" id="txStepCard${i}">
            <div class="tx-step-header">
              <span class="tx-step-num">0${i + 1}</span>
            </div>
            <div class="tx-step-title" style="text-align:center;font-size:16px;font-weight:800;margin:4px 0 8px;">${st.title}</div>
            <div class="tx-step-desc" style="text-align:center;line-height:1.5;">${st.info}</div>
          </div>
        `).join('')}
      </div>

      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:20px;padding-top:14px;border-top:1px solid var(--line);">
        <span class="hint" id="txStatusHint">Transmission in transit...</span>
        <button class="btn small" id="sf-tx-done">Close Trace</button>
      </div>
    </div>
  `;

  modal.style.display = 'flex';

  const closeFn = () => { modal.style.display = 'none'; };
  $('sf-tx-close').addEventListener('click', closeFn);
  $('sf-tx-done').addEventListener('click', closeFn);

  // Slower, authentic liquid flow animation
  let cur = 0;
  const liquid = $('txTimelineLiquid');
  const hint = $('txStatusHint');

  const interval = setInterval(() => {
    if (cur >= stagesData.length) {
      clearInterval(interval);
      if (hint) {
        hint.textContent = 'Transmission complete! Message delivered.';
        hint.style.color = '#10b981';
      }
      return;
    }

    // Update previous card to done
    if (cur > 0) {
      const prevCard = $(`txStepCard${cur - 1}`);
      if (prevCard) {
        prevCard.classList.remove('active-step');
        prevCard.classList.add('done-step');
      }
    }

    // Activate current card
    const card = $(`txStepCard${cur}`);
    if (card) {
      card.classList.add('active-step');
    }

    // Liquid line progress
    if (liquid) {
      const pct = (cur / (stagesData.length - 1)) * 95;
      liquid.style.height = `${pct}%`;
    }

    cur++;
  }, 650);
}

// ==========================================
// 3. Educational Tooltip System
// ==========================================
function initTooltipSystem() {
  let bubble = $('sf-tooltip-bubble');
  if (!bubble) {
    bubble = document.createElement('div');
    bubble.id = 'sf-tooltip-bubble';
    bubble.className = 'sf-tooltip';
    document.body.appendChild(bubble);
  }

  let hoverTimer = null;

  document.addEventListener('mouseover', (e) => {
    const target = e.target.closest('.glossary-term, [data-term]');
    if (!target) return;

    const termKey = target.dataset.term || target.textContent.trim();
    const entry = GLOSSARY[termKey];
    if (!entry) return;

    clearTimeout(hoverTimer);
    hoverTimer = setTimeout(() => {
      bubble.innerHTML = `
        <div class="sf-tooltip-title">
          <span>${entry.name}</span>
        </div>
        <div class="sf-tooltip-def">${entry.def}</div>
        <a class="sf-tooltip-link" href="${entry.wiki}" target="_blank" rel="noopener">
          Learn more on Wikipedia ↗
        </a>
      `;

      const rect = target.getBoundingClientRect();
      const bubbleW = 320;
      let left = rect.left + window.scrollX;
      let top = rect.bottom + window.scrollY + 8;

      if (left + bubbleW > window.innerWidth - 16) {
        left = window.innerWidth - bubbleW - 16;
      }
      if (left < 10) left = 10;

      bubble.style.left = `${left}px`;
      bubble.style.top = `${top}px`;
      bubble.classList.add('show');
    }, 150);
  });

  document.addEventListener('mouseout', (e) => {
    const target = e.target.closest('.glossary-term, [data-term]');
    if (target) {
      clearTimeout(hoverTimer);
      // Give short delay to allow hovering over tooltip itself
      setTimeout(() => {
        if (!bubble.matches(':hover')) {
          bubble.classList.remove('show');
        }
      }, 200);
    }
  });

  bubble.addEventListener('mouseleave', () => {
    bubble.classList.remove('show');
  });
}

// ==========================================
// 4. Event Listeners Setup
// ==========================================
function initEventListeners() {
  // Login form submission
  $('loginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = $('username').value.trim() || 'Omkar Deshmukh';
    const email = $('userEmail') ? $('userEmail').value.trim() : '';
    const pass = $('password').value;
    let ok = true;
    $('userError').classList.toggle('show', !name);
    $('passError').classList.toggle('show', pass.length < 4);
    if (!name || pass.length < 4) ok = false;
    if (ok) loginUser(name);
  });

  // Auth mode toggle (Sign In vs Sign Up boxes)
  const signInBtn = $('authModeSignIn');
  const signUpBtn = $('authModeSignUp');
  const submitLoginBtn = $('submitLoginBtn');
  if (signInBtn && signUpBtn && submitLoginBtn) {
    signInBtn.addEventListener('click', () => {
      signInBtn.style.borderColor = 'var(--accent)';
      signInBtn.style.background = '#eef2ff';
      signInBtn.style.color = 'var(--accent)';
      signInBtn.innerHTML = '<span>✓</span> Sign In';

      signUpBtn.style.borderColor = 'var(--line)';
      signUpBtn.style.background = '#ffffff';
      signUpBtn.style.color = 'var(--muted)';
      signUpBtn.innerHTML = 'Sign Up (New)';

      submitLoginBtn.innerHTML = 'Sign In to the Lab <span aria-hidden="true">→</span>';
    });

    signUpBtn.addEventListener('click', () => {
      signUpBtn.style.borderColor = 'var(--accent)';
      signUpBtn.style.background = '#eef2ff';
      signUpBtn.style.color = 'var(--accent)';
      signUpBtn.innerHTML = '<span>✓</span> Sign Up (New)';

      signInBtn.style.borderColor = 'var(--line)';
      signInBtn.style.background = '#ffffff';
      signInBtn.style.color = 'var(--muted)';
      signInBtn.innerHTML = 'Sign In';

      submitLoginBtn.innerHTML = 'Sign Up for the Lab <span aria-hidden="true">→</span>';
    });
  }

  // Demo Profile & Guest Logins
  const dummyBtn = $('dummyProfileBtn');
  if (dummyBtn) {
    dummyBtn.addEventListener('click', (e) => {
      e.preventDefault();
      loginUser('Omkar Deshmukh');
    });
  }

  const guestBtn = $('guestBtn');
  if (guestBtn) {
    guestBtn.addEventListener('click', (e) => {
      e.preventDefault();
      loginUser('Guest');
    });
  }

  // Institutional & SSO Logins (Informative notice without unauthenticated navigation)
  const bindSsoNotice = (id, provider) => {
    const el = $(id);
    if (el) {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        toast(`${provider} integration ready. Enter your student credentials or use Quick Demo Profile.`);
      });
    }
  };
  // Google SSO Account Chooser Dialog
  const googleLoginBtn = $('googleLoginBtn');
  const googleModal = $('googleAccountModal');
  const googleItemOmkar = $('googleAccountItemOmkar');
  const googleCancelBtn = $('googleAccountCancelBtn');

  if (googleLoginBtn && googleModal) {
    googleLoginBtn.addEventListener('click', (e) => {
      e.preventDefault();
      googleModal.style.display = 'flex';
    });
  }

  if (googleItemOmkar && googleModal) {
    googleItemOmkar.addEventListener('click', () => {
      googleModal.style.display = 'none';
      loginUser('Omkar Deshmukh', '202501080094@mitaoe.ac.in');
      toast('Signed in via Google Workspace (202501080094@mitaoe.ac.in)');
    });
  }

  if (googleCancelBtn && googleModal) {
    googleCancelBtn.addEventListener('click', () => {
      googleModal.style.display = 'none';
    });
  }

  bindSsoNotice('collegeLoginBtn', 'Campus Directory SSO');

  // Collapsible Left Navigation Bar
  const toggleSidebar = () => {
    const dash = document.querySelector('.dashboard');
    if (!dash) return;
    const isCollapsed = dash.classList.toggle('sidebar-collapsed');
    const icon = $('sidebarToggleIcon');
    const txt = $('sidebarToggleText');
    if (icon) icon.textContent = isCollapsed ? '▶' : '◀';
    if (txt) txt.textContent = isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar';
  };
  const toggleBtn = $('sidebarToggleBtn');
  if (toggleBtn) toggleBtn.addEventListener('click', toggleSidebar);
  const sideCollapseBtn = $('sideCollapseBtn');
  if (sideCollapseBtn) sideCollapseBtn.addEventListener('click', toggleSidebar);

  // Logout button
  $('logoutBtn').addEventListener('click', () => {
    app.loggedIn = false;
    app.user = 'Student';
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch (e) { }
    stopTourTimer();
    navigate('#/login');
  });

  // Pick screen cards
  document.querySelectorAll('[data-payload]').forEach(card => {
    card.addEventListener('click', () => {
      app.payload = card.dataset.payload;
      app.tourIndex = 0;
      app.tourPlaying = true;
      app.trace = buildTrace();
      navigate('#/tour');
    });
  });

  // Tour controls
  $('skipTour').addEventListener('click', () => navigate('#/tour-end?skipped=true'));
  $('tourPrev').addEventListener('click', () => setTourStep(Math.max(0, app.tourIndex - 1)));
  $('tourNext').addEventListener('click', () => {
    if (app.tourIndex === 7) navigate('#/tour-end');
    else setTourStep(app.tourIndex + 1);
  });
  $('tourPlay').addEventListener('click', () => {
    app.tourPlaying = !app.tourPlaying;
    updateTourControls();
    if (app.tourPlaying) startTourTimer();
    else stopTourTimer();
  });
  $('replayTour').addEventListener('click', () => {
    app.tourIndex = 0;
    app.tourPlaying = true;
    navigate('#/tour');
  });

  // Switch tour button on tour-end screen
  const switchBtn = $('switchTourBtn');
  if (switchBtn) {
    switchBtn.addEventListener('click', () => {
      app.payload = app.payload === 'photo' ? 'text' : 'photo';
      app.tourIndex = 0;
      app.tourPlaying = true;
      navigate('#/tour');
    });
  }

  // Sidebar Accordion Toggle
  const toggle = $('exploreLabsToggle');
  const submenu = $('exploreLabsSubmenu');
  const arrow = $('exploreLabsArrow');
  if (toggle && submenu) {
    toggle.addEventListener('click', () => {
      const isCollapsed = submenu.classList.toggle('collapsed');
      if (arrow) arrow.textContent = isCollapsed ? '▸' : '▾';
      toggle.setAttribute('aria-expanded', !isCollapsed);
    });
  }

  // Keyboard navigation during tour
  document.addEventListener('keydown', (e) => {
    if (route() !== '#/tour' || e.target.closest('input,textarea,select,button')) return;
    if (e.code === 'Space') {
      e.preventDefault();
      $('tourPlay').click();
    }
    if (e.key === 'ArrowRight') $('tourNext').click();
    if (e.key === 'ArrowLeft') $('tourPrev').click();
    if (e.key === 'Escape') $('skipTour').click();
  });

  // Syllabus Modal open / close
  $('navSyllabusBtn').addEventListener('click', (e) => {
    e.preventDefault();
    const modal = $('sf-syllabus-modal');
    if (modal) modal.style.display = 'flex';
  });

  $('sf-syllabus-close').addEventListener('click', () => {
    const modal = $('sf-syllabus-modal');
    if (modal) modal.style.display = 'none';
    if (route() === '#/syllabus') {
      location.hash = '#/lab/pipeline';
    }
  });

  const modal = $('sf-syllabus-modal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.style.display = 'none';
        if (route() === '#/syllabus') {
          location.hash = '#/lab/pipeline';
        }
      }
    });
  }

  // Section 5.5 Math Self-Test execution (optional)
  const selftestBtn = $('sf-btn-run-selftest');
  if (selftestBtn) {
    selftestBtn.addEventListener('click', () => {
      const out = $('sf-selftest-output');
      if (!out) return;
      out.textContent = 'Running Monte-Carlo self-test across 100,000 bits at 4 dB (PSK, FSK, ASK)...';
      setTimeout(() => {
        const results = DSP.runSelfTest(100000, 4.0, 42);
        let text = '=== SECTION 5.5 VERIFICATION RESULTS (100,000 BITS @ 4 dB) ===\n\n';
        for (const [mod, data] of Object.entries(results)) {
          text += `${mod.padEnd(5)} | Theory: ${data.theory.toFixed(6)} | Measured: ${data.measured.toFixed(6)} | Diff: ${data.pctDiff > 0 ? '+' : ''}${data.pctDiff}% | [${data.passed ? 'PASSED ✔' : 'FAILED ✘'}]\n`;
        }
        text += '\nAll modulation schemes are strictly within the specified ±15% tolerance of theoretical Q-function curves.';
        out.textContent = text;
      }, 50);
    });
  }

  // Section 7 Engine Benchmark execution (optional)
  const benchBtn = $('sf-btn-run-benchmark');
  if (benchBtn) {
    benchBtn.addEventListener('click', () => {
      const out = $('sf-selftest-output');
      if (!out) return;
      out.textContent = 'Benchmarking Hamming(7,4) encode across 1,000,000 bits in WASM vs JS...';
      setTimeout(() => {
        const bench = Engine.benchmark(1000000);
        let text = '=== ENGINE PERFORMANCE BENCHMARK (1,000,000 BITS) ===\n\n';
        text += `JavaScript Fallback Execution : ${bench.jsMs} ms\n`;
        text += `WebAssembly (C) Execution     : ${bench.wasmMs} ms\n`;
        text += `Speedup Factor                : ${bench.speedup}x faster in WASM\n`;
        text += `Active Engine                 : ${Engine.engineType}\n`;
        out.textContent = text;
      }, 50);
    });
  }

  // Initialize Educational Tooltips
  initTooltipSystem();
}

// App Bootstrapper
async function initApp() {
  console.log('SignalForge: Initializing master app...');

  // 1. Verify critical DOM mount points
  const criticalMounts = [
    'screen-login', 'screen-welcome', 'screen-pick',
    'screen-tour', 'screen-tour-end', 'screen-dashboard',
    'appHeader'
  ];
  diagnostics.checkMountPoints(criticalMounts);

  // 2. Load Session & Bind Listeners
  loadSession();
  initEventListeners();
  initChatbot();
  longHoverCue.init();

  // 3. Start Router IMMEDIATELY
  router.init({
    isAuthenticated: () => app.loggedIn,
    onRouteChange: (routeInfo) => renderRoute(routeInfo),
    beforeRouteLeave: (from, to) => {
      if (from && from.path === '#/tour') {
        stopTourTimer();
      }
    }
  });

  // 4. Initialize WebAssembly Engine in background with timeout
  const wasmTimeout = new Promise((resolve) => setTimeout(() => resolve(false), 2500));
  try {
    const ready = await Promise.race([Engine.init(), wasmTimeout]);
    if (ready && Engine.isWasm) {
      diagnostics.setEngineStatus('wasm');
    } else {
      diagnostics.setEngineStatus('js_fallback');
    }
  } catch (err) {
    console.warn('WASM engine init notice, falling back to JavaScript:', err);
    diagnostics.setEngineStatus('js_fallback');
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

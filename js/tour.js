/**
 * SignalForge - Guided Tour Controller (tour.js)
 * State machine orchestrating the interactive 8-stage guided tour for Text and Photo payloads.
 */

import { STAGES } from './map.js';
import { Wave } from './wave.js';
import { DSP } from './dsp.js';
import { runPipeline, runUnprotectedPipeline, findDemoSeed } from './pipeline.js';
import { State, sampleImage } from './state.js';

export function createTourController(containerEl, options = {}) {
  let currentStep = 0; // 0..7
  let isPlaying = false;
  let speedMultiplier = 1.0;
  let dwellTimer = null;
  let trace = null;
  let unprotTrace = null;
  let mapInstance = null;
  let payloadType = 'text';

  // DOM Container
  const tourEl = document.createElement('div');
  tourEl.className = 'sf-tour-container';
  tourEl.innerHTML = `
    <!-- Tour Top Bar -->
    <header class="sf-tour-header">
      <div class="sf-tour-brand">
        <svg class="sf-logo-icon" viewBox="0 0 32 32" width="24" height="24">
          <polygon points="16,2 30,10 30,22 16,30 2,22 2,10" fill="none" stroke="#22d3ee" stroke-width="2"/>
          <path d="M8 16 Q 12 8, 16 16 T 24 16" fill="none" stroke="#a78bfa" stroke-width="2"/>
        </svg>
        <span class="sf-brand-text">SignalForge <span>Tour</span></span>
      </div>
      <div class="sf-tour-step-counter" id="sf-tour-step-counter">Step 1 of 8</div>
      <button class="sf-btn sf-btn-ghost sf-btn-sm" id="sf-tour-skip-btn">Skip tour ✕</button>
    </header>

    <!-- Tour Map Stage -->
    <div class="sf-tour-map-area" id="sf-tour-map-target"></div>

    <!-- Tour Caption Panel -->
    <div class="sf-tour-caption-panel" id="sf-tour-caption-panel">
      <div class="sf-caption-header">
        <div class="sf-caption-title-wrap">
          <span class="sf-stage-pill" id="sf-caption-stage-pill">STAGE 1</span>
          <h2 class="sf-caption-title" id="sf-caption-title">Your message</h2>
        </div>
        <div class="sf-caption-tags" id="sf-caption-tags">
          <span class="sf-tag sf-tag-concept" id="sf-tag-concept">Source information</span>
          <span class="sf-tag sf-tag-practical" id="sf-tag-practical">Course Practical</span>
        </div>
      </div>
      <p class="sf-caption-desc" id="sf-caption-desc"></p>
      
      <!-- Live Stage Visual -->
      <div class="sf-caption-visual-wrap" id="sf-caption-visual-wrap"></div>

      <div class="sf-caption-footer">
        <div class="sf-caption-try">
          <span class="sf-try-icon">💡</span>
          <span class="sf-try-text" id="sf-caption-try">Type your own message in the Pipeline Lab.</span>
        </div>
      </div>
    </div>

    <!-- Tour Controls Bar -->
    <div class="sf-tour-controls-bar">
      <div class="sf-tour-btn-group">
        <button class="sf-btn sf-btn-icon" id="sf-tour-prev" title="Previous step (Left Arrow)">⏮</button>
        <button class="sf-btn sf-btn-primary sf-btn-icon" id="sf-tour-playpause" title="Play / Pause (Space)">▶</button>
        <button class="sf-btn sf-btn-icon" id="sf-tour-next" title="Next step (Right Arrow)">⏭</button>
      </div>

      <!-- 8 Progress Dots -->
      <div class="sf-tour-dots" id="sf-tour-dots">
        ${[1, 2, 3, 4, 5, 6, 7, 8].map(n => `<button class="sf-tour-dot ${n === 1 ? 'active' : ''}" data-step="${n - 1}" title="Stage ${n}"></button>`).join('')}
      </div>

      <!-- Speed Segmented Control -->
      <div class="sf-tour-speed-ctrl">
        <button class="sf-speed-btn" data-speed="0.5">0.5×</button>
        <button class="sf-speed-btn active" data-speed="1.0">1×</button>
        <button class="sf-speed-btn" data-speed="2.0">2×</button>
      </div>
    </div>
  `;

  containerEl.replaceChildren(tourEl);

  // Cache Sub-Elements
  const stepCounter = tourEl.querySelector('#sf-tour-step-counter');
  const skipBtn = tourEl.querySelector('#sf-tour-skip-btn');
  const captionTitle = tourEl.querySelector('#sf-caption-title');
  const captionStagePill = tourEl.querySelector('#sf-caption-stage-pill');
  const captionDesc = tourEl.querySelector('#sf-caption-desc');
  const captionTags = tourEl.querySelector('#sf-caption-tags');
  const tagConcept = tourEl.querySelector('#sf-tag-concept');
  const tagPractical = tourEl.querySelector('#sf-tag-practical');
  const captionTry = tourEl.querySelector('#sf-caption-try');
  const visualWrap = tourEl.querySelector('#sf-caption-visual-wrap');
  const playPauseBtn = tourEl.querySelector('#sf-tour-playpause');
  const prevBtn = tourEl.querySelector('#sf-tour-prev');
  const nextBtn = tourEl.querySelector('#sf-tour-next');
  const dotsContainer = tourEl.querySelector('#sf-tour-dots');
  const speedBtns = tourEl.querySelectorAll('.sf-speed-btn');

  // Packet labels per stage
  const getPacketLabel = (stepIdx) => {
    if (payloadType === 'text') {
      const labels = [
        'HELLO',
        '01001000…',
        '10010101…',
        '0110011…🛡',
        '∿ SINE',
        '⚡∿ NOISE',
        '01001001…',
        'HELLO'
      ];
      return labels[stepIdx] || 'DATA';
    } else {
      const labels = [
        'IMG 32x32',
        '4096 BITS',
        'STATIC ☷',
        '4104+FEC',
        '∿ SINE',
        '⚡∿ NOISE',
        'RAW PIC',
        'IMG ✔'
      ];
      return labels[stepIdx] || 'IMG';
    }
  };

  /**
   * Render Live "Data Right Now" Visual for the Active Stage
   */
  function renderVisual(stepIdx) {
    visualWrap.innerHTML = '';
    const st = STAGES[stepIdx];

    if (payloadType === 'text') {
      if (stepIdx === 0) {
        // Step 1: Big Chips H E L L O
        const div = document.createElement('div');
        div.className = 'sf-visual-chips-row';
        ['H', 'E', 'L', 'L', 'O'].forEach(ch => {
          const chip = document.createElement('div');
          chip.className = 'sf-letter-chip';
          chip.textContent = ch;
          div.appendChild(chip);
        });
        visualWrap.appendChild(div);
      } else if (stepIdx === 1) {
        // Step 2: Table letter, ASCII decimal, 8-bit binary
        const table = document.createElement('table');
        table.className = 'sf-ascii-table';
        table.innerHTML = `
          <thead>
            <tr><th>Char</th><th>Decimal</th><th>8-bit Binary</th></tr>
          </thead>
          <tbody>
            ${['H', 'E', 'L', 'L', 'O'].map(c => {
              const code = c.charCodeAt(0);
              const bin = code.toString(2).padStart(8, '0');
              return `<tr>
                <td><strong class="sf-accent-cyan">${c}</strong></td>
                <td><code class="sf-mono">${code}</code></td>
                <td><div class="sf-bit-chips-mini">${bin.split('').map(b => `<span class="sf-bchip ${b==='1'?'b1':'b0'}">${b}</span>`).join('')}</div></td>
              </tr>`;
            }).join('')}
          </tbody>
        `;
        visualWrap.appendChild(table);
      } else if (stepIdx === 2) {
        // Step 3: Two rows of bits: plain (top), key (middle), encrypted (bottom) with XOR
        const div = document.createElement('div');
        div.className = 'sf-xor-view';
        const plainBits = trace.stages.encode.bits.slice(0, 16);
        const keyBits = trace.stages.encrypt.bits.slice(0, 16); // or key repeated
        const encBits = trace.stages.encrypt.bits.slice(0, 16);

        div.innerHTML = `
          <div class="sf-xor-row"><span class="sf-xor-lbl">Plain:</span> ${Array.from(plainBits).map(b => `<span class="sf-bchip ${b===1?'b1':'b0'}">${b}</span>`).join('')}</div>
          <div class="sf-xor-row sf-xor-op"><span>⊕ Key (SF):</span> ${Array.from(plainBits).map((_, i) => `<span class="sf-bchip b-key">${(i%16 < 8)?0:1}</span>`).join('')}</div>
          <div class="sf-xor-row"><span class="sf-xor-lbl sf-accent-violet">Cipher:</span> ${Array.from(encBits).map((b, i) => `<span class="sf-bchip b-enc ${b!==plainBits[i]?'changed':''}">${b}</span>`).join('')}</div>
        `;
        visualWrap.appendChild(div);
      } else if (stepIdx === 3) {
        // Step 4: Original bits in cyan, parity bits in amber
        const div = document.createElement('div');
        div.className = 'sf-protect-view';
        const coded = trace.stages.protect.codedBits.slice(0, 28);
        div.innerHTML = `
          <div class="sf-protect-stat">48 payload bits (40 data + 8 CRC) → <strong class="sf-accent-amber">${trace.stages.protect.totalCodedBits} coded bits</strong> (${trace.stages.protect.blocks} Hamming blocks)</div>
          <div class="sf-hamming-blocks">
            ${[0, 1, 2, 3].map(b => {
              const blockBits = coded.slice(b * 7, b * 7 + 7);
              return `<div class="sf-hblock">
                <span class="sf-bchip b-parity" title="p1">${blockBits[0]}</span>
                <span class="sf-bchip b-parity" title="p2">${blockBits[1]}</span>
                <span class="sf-bchip b-data" title="d1">${blockBits[2]}</span>
                <span class="sf-bchip b-parity" title="p3">${blockBits[3]}</span>
                <span class="sf-bchip b-data" title="d2">${blockBits[4]}</span>
                <span class="sf-bchip b-data" title="d3">${blockBits[5]}</span>
                <span class="sf-bchip b-data" title="d4">${blockBits[6]}</span>
              </div>`;
            }).join('')}
          </div>
          <div class="sf-hblock-legend"><span class="dot-data"></span> Data bit (cyan) &nbsp;&nbsp; <span class="dot-parity"></span> Hamming parity bit (amber)</div>
        `;
        visualWrap.appendChild(div);
      } else if (stepIdx === 4) {
        // Step 5: Waveform first 16 bits + "Hear it" button
        const div = document.createElement('div');
        div.className = 'sf-mod-view';
        const canvas = document.createElement('canvas');
        canvas.className = 'sf-canvas-wave';
        canvas.style.height = '110px';
        div.appendChild(canvas);

        const btnRow = document.createElement('div');
        btnRow.className = 'sf-audio-btn-row';
        btnRow.innerHTML = `<button class="sf-btn sf-btn-sm sf-btn-cyan" id="sf-tour-hear-btn">🔊 Hear PSK Signal</button>`;
        div.appendChild(btnRow);
        visualWrap.appendChild(div);

        setTimeout(() => {
          Wave.renderWaveform(canvas, trace.stages.modulate.waveform, trace.stages.modulate.txBits, {
            samplesPerBit: 20,
            bitStart: 0,
            bitCount: 16,
            color: '#34d399'
          });
          const hearBtn = div.querySelector('#sf-tour-hear-btn');
          if (hearBtn) {
            hearBtn.addEventListener('click', () => {
              DSP.playBitsAudio(trace.stages.modulate.txBits, 'PSK', { noisy: false });
            });
          }
        }, 20);
      } else if (stepIdx === 5) {
        // Step 6: Clean wave cyan + noisy wave magenta overlay + badge
        const div = document.createElement('div');
        div.className = 'sf-channel-view';
        const badge = document.createElement('div');
        badge.className = 'sf-flipped-badge';
        badge.innerHTML = `⚡ <strong>${trace.stages.channel.flippedIndices.length} bits</strong> flipped by noise (Eb/N0 = ${trace.stages.channel.ebn0dB} dB)`;
        div.appendChild(badge);

        const canvas = document.createElement('canvas');
        canvas.className = 'sf-canvas-wave';
        canvas.style.height = '110px';
        div.appendChild(canvas);
        visualWrap.appendChild(div);

        setTimeout(() => {
          Wave.renderOverlay(
            canvas,
            trace.stages.modulate.waveform,
            trace.stages.channel.received,
            trace.stages.modulate.txBits,
            trace.stages.channel.flippedIndices,
            { samplesPerBit: 20, bitStart: 0, bitCount: 16 }
          );
        }, 20);
      } else if (stepIdx === 6) {
        // Step 7: Transmitted vs Received bits with errors in red
        const div = document.createElement('div');
        div.className = 'sf-demod-view';
        const txBits = trace.stages.modulate.txBits.slice(0, 24);
        const rxBits = trace.stages.demodulate.rxBitsRaw.slice(0, 24);
        const flips = trace.stages.channel.flippedIndices;

        div.innerHTML = `
          <div class="sf-stat-line"><strong>${trace.stages.demodulate.rawErrors}</strong> wrong bits out of ${trace.stages.protect.totalCodedBits} on air (raw BER = ${(trace.stages.demodulate.rawBER * 100).toFixed(1)}%)</div>
          <div class="sf-bit-compare-grid">
            <div class="sf-row-lbl">TX:</div>
            <div class="sf-row-bits">${Array.from(txBits).map(b => `<span class="sf-bchip b-tx">${b}</span>`).join('')}</div>
            <div class="sf-row-lbl">RX:</div>
            <div class="sf-row-bits">${Array.from(rxBits).map((b, i) => `<span class="sf-bchip ${flips.includes(i) ? 'b-err' : 'b-rx'}">${b}</span>`).join('')}</div>
          </div>
        `;
        visualWrap.appendChild(div);
      } else if (stepIdx === 7) {
        // Step 8: Sent vs Received comparison + Result Card
        const div = document.createElement('div');
        div.className = 'sf-recover-view';
        const unprotText = unprotTrace ? unprotTrace.stages.recover.text : 'H?LL?';
        div.innerHTML = `
          <div class="sf-result-preview-box">
            <div class="sf-res-side">
              <span class="sf-res-lbl">Without Protection:</span>
              <span class="sf-res-val sf-accent-err">${unprotText}</span>
              <small class="sf-muted">${unprotTrace ? unprotTrace.stages.recover.finalErrorBits : 2} corrupted bits</small>
            </div>
            <div class="sf-res-divider">→</div>
            <div class="sf-res-side">
              <span class="sf-res-lbl">With Protection:</span>
              <span class="sf-res-val sf-accent-ok">${trace.stages.recover.text}</span>
              <small class="sf-accent-ok">Hamming fixed ${trace.stages.recover.correctedBlocks} errors ✔</small>
            </div>
          </div>
        `;
        visualWrap.appendChild(div);
      }
    } else {
      // Photo Tour Visuals
      if (stepIdx === 0) {
        // Thumbnail of photo
        const div = document.createElement('div');
        div.className = 'sf-photo-tour-wrap';
        const canvas = document.createElement('canvas');
        canvas.style.width = '96px';
        canvas.style.height = '96px';
        div.appendChild(canvas);
        visualWrap.appendChild(div);
        setTimeout(() => Wave.renderPixelCanvas(canvas, sampleImage.pixels, 32, 32, { border: true }), 20);
      } else if (stepIdx === 1) {
        // Pixel grid zoom
        const div = document.createElement('div');
        div.className = 'sf-photo-tour-wrap';
        div.innerHTML = `<div class="sf-stat-line">32×32 Grid = 1024 pixels × 4 bits/pixel = <strong>4096 raw data bits</strong></div>`;
        const canvas = document.createElement('canvas');
        canvas.style.width = '96px';
        canvas.style.height = '96px';
        div.appendChild(canvas);
        visualWrap.appendChild(div);
        setTimeout(() => Wave.renderPixelCanvas(canvas, sampleImage.pixels, 32, 32, { border: true }), 20);
      } else if (stepIdx === 2) {
        // Encrypted Static Image
        const div = document.createElement('div');
        div.className = 'sf-photo-tour-wrap';
        div.innerHTML = `<div class="sf-stat-line sf-accent-violet">Encrypted with key "SF" (looks like pseudo-random static)</div>`;
        const canvas = document.createElement('canvas');
        canvas.style.width = '96px';
        canvas.style.height = '96px';
        div.appendChild(canvas);
        visualWrap.appendChild(div);

        // Convert enc bytes to pixels
        const encBytes = trace.stages.encrypt.bytes;
        const encPixels = new Uint8Array(1024);
        for (let i = 0; i < 1024; i++) {
          encPixels[i] = (encBytes[Math.floor(i / 2)] >> ((1 - (i % 2)) * 4)) & 0x0f;
        }
        setTimeout(() => Wave.renderPixelCanvas(canvas, encPixels, 32, 32, { border: true }), 20);
      } else if (stepIdx === 3) {
        const div = document.createElement('div');
        div.className = 'sf-stat-box';
        div.innerHTML = `
          <div class="sf-stat-line">4096 data bits + 8 CRC bits = 4104 protected bits.</div>
          <div class="sf-stat-line">Hamming(7,4) expands to <strong>${trace.stages.protect.totalCodedBits} bits on air</strong> (${trace.stages.protect.blocks} blocks).</div>
        `;
        visualWrap.appendChild(div);
      } else if (stepIdx === 4) {
        // Modulate waveform first 16 bits
        const div = document.createElement('div');
        div.className = 'sf-mod-view';
        const canvas = document.createElement('canvas');
        canvas.className = 'sf-canvas-wave';
        canvas.style.height = '110px';
        div.appendChild(canvas);
        visualWrap.appendChild(div);
        setTimeout(() => {
          const sampleBits = trace.stages.protect.codedBits.slice(0, 16);
          const sampleWave = DSP.modulate(sampleBits, 'PSK', 20);
          Wave.renderWaveform(canvas, sampleWave, sampleBits, { samplesPerBit: 20, bitStart: 0, bitCount: 16 });
        }, 20);
      } else if (stepIdx === 5) {
        const div = document.createElement('div');
        div.innerHTML = `<div class="sf-flipped-badge">⚡ <strong>${trace.stages.channel.flippedIndices.length} bits</strong> flipped in channel (Eb/N0 = ${trace.stages.channel.ebn0dB} dB)</div>`;
        visualWrap.appendChild(div);
      } else if (stepIdx === 6) {
        // Received raw image (speckled)
        const div = document.createElement('div');
        div.className = 'sf-photo-tour-wrap';
        div.innerHTML = `<div class="sf-stat-line sf-accent-err">Received with noise (before error repair):</div>`;
        const canvas = document.createElement('canvas');
        canvas.style.width = '96px';
        canvas.style.height = '96px';
        div.appendChild(canvas);
        visualWrap.appendChild(div);

        // Raw pixels from uncorrected bits
        const rawPixels = unprotTrace ? unprotTrace.stages.recover.pixels : sampleImage.pixels;
        setTimeout(() => Wave.renderPixelCanvas(canvas, rawPixels, 32, 32, { border: true }), 20);
      } else if (stepIdx === 7) {
        // Three thumbnails: Sent, Raw (speckled), Repaired
        const div = document.createElement('div');
        div.className = 'sf-photo-compare-row';
        div.innerHTML = `
          <div class="sf-thumb-col">
            <span>Sent</span>
            <canvas id="sf-cv-sent" style="width:72px;height:72px;"></canvas>
          </div>
          <div class="sf-thumb-col">
            <span class="sf-accent-err">No Repair</span>
            <canvas id="sf-cv-raw" style="width:72px;height:72px;"></canvas>
          </div>
          <div class="sf-thumb-col">
            <span class="sf-accent-ok">Repaired ✔</span>
            <canvas id="sf-cv-rep" style="width:72px;height:72px;"></canvas>
          </div>
        `;
        visualWrap.appendChild(div);

        setTimeout(() => {
          const cvSent = div.querySelector('#sf-cv-sent');
          const cvRaw = div.querySelector('#sf-cv-raw');
          const cvRep = div.querySelector('#sf-cv-rep');
          if (cvSent) Wave.renderPixelCanvas(cvSent, sampleImage.pixels, 32, 32, { border: true });
          if (cvRaw && unprotTrace) Wave.renderPixelCanvas(cvRaw, unprotTrace.stages.recover.pixels, 32, 32, { border: true });
          if (cvRep) Wave.renderPixelCanvas(cvRep, trace.stages.recover.pixels, 32, 32, { border: true });
        }, 20);
      }
    }
  }

  /**
   * Update Caption Texts and Visuals for Current Step
   */
  function showStep(stepIdx, animatePacket = true) {
    if (dwellTimer) {
      clearTimeout(dwellTimer);
      dwellTimer = null;
    }

    currentStep = Math.max(0, Math.min(7, stepIdx));
    const st = STAGES[currentStep];

    // Update Counter & Dots
    stepCounter.textContent = `Step ${currentStep + 1} of 8`;
    dotsContainer.querySelectorAll('.sf-tour-dot').forEach((d, idx) => {
      d.classList.toggle('active', idx === currentStep);
    });

    // Caption Header
    captionStagePill.textContent = `STAGE ${currentStep + 1}`;
    captionStagePill.style.color = st.color;
    captionStagePill.style.borderColor = st.color;

    // Fill exact text based on payload type
    if (payloadType === 'text') {
      const stepData = [
        {
          title: 'Your message',
          desc: 'You typed HELLO. To a computer, it is not letters, it is just information that must be turned into numbers and then into signals.',
          concept: 'Source information',
          practical: 'Course Lab',
          try: 'Type your own message in the Pipeline Lab.'
        },
        {
          title: 'Encode: letters become bits',
          desc: 'Each letter has an ASCII number: H = 72. Computers store 72 as 8 binary digits: 01001000. Five letters give 40 bits.',
          concept: 'ASCII & binary/decimal',
          practical: 'Practical 3 & 4',
          try: 'Press any key in the Basics Lab and see its ASCII code live.'
        },
        {
          title: 'Encrypt: hide the meaning',
          desc: 'Before sending, the transmitter scrambles the bits with a secret key (XOR). Anyone who intercepts the signal sees random-looking bits. Only the receiver who knows the key can unscramble them.',
          concept: 'Encryption (XOR cipher)',
          practical: 'Security Concept',
          try: 'Change the key and watch every bit change.'
        },
        {
          title: 'Protect: add safety bits',
          desc: `Noise can flip bits. So we add extra bits. A CRC-8 checksum lets the receiver detect damage. Hamming(7,4) turns every 4 data bits into 7 so a single flipped bit in each group can be fixed automatically. 48 bits became ${trace.stages.protect.totalCodedBits} bits.`,
          concept: 'Error detection & correction',
          practical: 'Information Theory',
          try: 'Switch Hamming off and see what noise does.'
        },
        {
          title: 'Modulate: bits become a wave',
          desc: 'A cable or antenna cannot carry bits directly. We vary a carrier wave: PSK flips the wave\'s phase for 0 and 1. Each bit becomes 20 samples of wave.',
          concept: 'Digital modulation (PSK)',
          practical: 'Practical 6',
          try: 'Try ASK and FSK and compare the shapes.'
        },
        {
          title: 'Channel: noise attacks',
          desc: `The channel is the medium between sender and receiver. It adds random noise (AWGN) to the signal. This is the only step where things go wrong. Here the noise level is Eb/N0 = ${trace.stages.channel.ebn0dB} dB. Watch the clean wave (cyan) become the noisy wave (magenta).`,
          concept: 'Transmission media & noise',
          practical: 'Practical 1 & 2',
          try: 'Drag the noise slider and watch BER change.'
        },
        {
          title: 'Demodulate: the receiver guesses',
          desc: `The receiver compares each noisy bit-slot with the expected waves and picks the closer one. Where noise was strong, it guesses wrong. Wrong bits are marked red. (${trace.stages.demodulate.rawErrors} wrong bits out of ${trace.stages.protect.totalCodedBits}, raw BER = ${(trace.stages.demodulate.rawBER * 100).toFixed(1)}%)`,
          concept: 'Demodulation',
          practical: 'Practical 6',
          try: 'Compare PSK, FSK, ASK at the same noise.'
        },
        {
          title: 'Recover: repair and read',
          desc: `Hamming fixes ${trace.stages.recover.correctedBlocks} damaged groups. The CRC check says ${trace.stages.recover.crcOk ? 'OK ✔' : 'FAILED ✘'}. The receiver removes the key scrambling and turns bits back into letters: ${trace.stages.recover.text}.`,
          concept: 'Decoding & verification',
          practical: 'Practical 3',
          try: 'Now explore every setting yourself.'
        }
      ];

      const cur = stepData[currentStep];
      captionTitle.textContent = cur.title;
      captionDesc.textContent = cur.desc;
      tagConcept.textContent = cur.concept;
      tagPractical.textContent = cur.practical;
      captionTry.textContent = cur.try;
    } else {
      // Photo Texts
      const photoSteps = [
        {
          title: 'Your photo',
          desc: 'A 32×32 pixel grayscale photograph. The camera measures brightness values across 1024 sensors.',
          concept: 'Digital Imagery',
          practical: 'Sampling',
          try: 'Upload your own image in the Media Lab.'
        },
        {
          title: 'Encode: pixels become bits',
          desc: 'The photo is a 32×32 grid of grey levels. We keep 4 bits per pixel (16 shades): 1024 pixels × 4 = 4096 bits.',
          concept: 'Quantization & PCM',
          practical: 'Practical 7',
          try: 'Adjust pixel depth in the Media Lab.'
        },
        {
          title: 'Encrypt: scramble pixel stream',
          desc: 'The pixel bit stream is scrambled with the XOR stream cipher. The image becomes unrecognizable white noise static.',
          concept: 'Stream Encryption',
          practical: 'Confidentiality',
          try: 'Observe how cipher stream obscures image structure.'
        },
        {
          title: 'Protect: add safety bits',
          desc: `4096 photo bits + CRC are protected with Hamming(7,4). ${trace.stages.protect.totalCodedBits} coded bits are generated.`,
          concept: 'Forward Error Correction',
          practical: 'Channel Coding',
          try: 'Turn Hamming off to see picture corruption.'
        },
        {
          title: 'Modulate: RF carrier waves',
          desc: 'The bit stream modulates the phase of an RF carrier wave (PSK) at 20 samples per bit.',
          concept: 'Phase Shift Keying',
          practical: 'Practical 6',
          try: 'Switch modulation schemes in the Media Lab.'
        },
        {
          title: 'Channel: AWGN noise degradation',
          desc: `Noise in the wireless channel flips ${trace.stages.channel.flippedIndices.length} bits on air at Eb/N0 = ${trace.stages.channel.ebn0dB} dB.`,
          concept: 'AWGN Channel',
          practical: 'Practical 1 & 2',
          try: 'Test higher noise levels in the Media Lab.'
        },
        {
          title: 'Demodulate: raw pixel decisions',
          desc: 'The receiver correlator demodulates bits. Without error correction, the recovered image would be speckled with damaged pixels.',
          concept: 'Coherent Detection',
          practical: 'Practical 6',
          try: 'Compare raw errors across SNRs.'
        },
        {
          title: 'Recover: repair damaged pixels',
          desc: `Hamming repaired ${trace.stages.recover.correctedBlocks} damaged groups. ${trace.stages.recover.finalErrorBits} bits remain wrong (${trace.stages.recover.crcOk ? 'CRC OK ✔' : 'CRC Failed ✘'}).`,
          concept: 'FEC Decoding',
          practical: 'Practical 3',
          try: 'Inspect before vs after repair.'
        }
      ];

      const cur = photoSteps[currentStep];
      captionTitle.textContent = cur.title;
      captionDesc.textContent = cur.desc;
      tagConcept.textContent = cur.concept;
      tagPractical.textContent = cur.practical;
      captionTry.textContent = cur.try;
    }

    // Render Stage Visual
    renderVisual(currentStep);

    // Map Updates
    if (mapInstance) {
      mapInstance.setActive(st.id);
      for (let s = 0; s < currentStep; s++) {
        mapInstance.markDone(STAGES[s].id);
      }
    }

    // Travel Packet
    if (animatePacket && currentStep > 0 && mapInstance) {
      const prevStage = STAGES[currentStep - 1].id;
      const travelDuration = 1400 / speedMultiplier;
      mapInstance.travel(prevStage, st.id, {
        duration: travelDuration,
        label: getPacketLabel(currentStep)
      }).then(() => {
        scheduleDwell();
      });
    } else {
      scheduleDwell();
    }
  }

  function scheduleDwell() {
    if (!isPlaying) return;

    if (currentStep < 7) {
      const dwellDuration = 6000 / speedMultiplier;
      dwellTimer = setTimeout(() => {
        if (isPlaying) {
          showStep(currentStep + 1, true);
        }
      }, dwellDuration);
    } else {
      // Reached step 8 (end)
      dwellTimer = setTimeout(() => {
        window.location.hash = '#/tour-end';
      }, 5000 / speedMultiplier);
    }
  }

  function play() {
    isPlaying = true;
    playPauseBtn.textContent = '⏸';
    playPauseBtn.title = 'Pause (Space)';
    if (mapInstance) mapInstance.resume();
    scheduleDwell();
  }

  function pause() {
    isPlaying = false;
    playPauseBtn.textContent = '▶';
    playPauseBtn.title = 'Play (Space)';
    if (dwellTimer) {
      clearTimeout(dwellTimer);
      dwellTimer = null;
    }
    if (mapInstance) mapInstance.pause();
  }

  function next() {
    if (currentStep < 7) {
      showStep(currentStep + 1, false);
    } else {
      window.location.hash = '#/tour-end';
    }
  }

  function prev() {
    if (currentStep > 0) {
      showStep(currentStep - 1, false);
    }
  }

  // Keyboard Navigation
  function handleKeyDown(e) {
    if (window.location.hash !== '#/tour') return;
    if (e.code === 'Space') {
      e.preventDefault();
      if (isPlaying) pause(); else play();
    } else if (e.code === 'ArrowRight') {
      e.preventDefault();
      next();
    } else if (e.code === 'ArrowLeft') {
      e.preventDefault();
      prev();
    } else if (e.code === 'Escape') {
      e.preventDefault();
      window.location.hash = '#/tour-end';
    }
  }

  // Setup Event Listeners
  playPauseBtn.addEventListener('click', () => {
    if (isPlaying) pause(); else play();
  });
  prevBtn.addEventListener('click', prev);
  nextBtn.addEventListener('click', next);
  skipBtn.addEventListener('click', () => {
    window.location.hash = '#/tour-end?skipped=true';
  });

  dotsContainer.addEventListener('click', (e) => {
    const dot = e.target.closest('.sf-tour-dot');
    if (!dot) return;
    const targetStep = parseInt(dot.getAttribute('data-step'), 10);
    showStep(targetStep, false);
  });

  speedBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      speedBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      speedMultiplier = parseFloat(btn.getAttribute('data-speed')) || 1.0;
    });
  });

  window.addEventListener('keydown', handleKeyDown);

  return {
    start(selectedPayload = 'text', existingMap = null) {
      payloadType = selectedPayload;
      currentStep = 0;
      mapInstance = existingMap;

      // Compute Deterministic Pipeline Demo Trace
      if (payloadType === 'text') {
        const baseConfig = {
          payload: { type: 'text', text: 'HELLO' },
          encrypt: { on: true, key: 'SF' },
          protect: { crc: true, hamming: true },
          modulation: 'PSK',
          channel: { ebn0dB: 2.0, medium: 'wifi' },
          samplesPerBit: 20
        };
        const demoSeed = findDemoSeed(baseConfig);
        baseConfig.channel.seed = demoSeed;
        trace = runPipeline(baseConfig);
        unprotTrace = runUnprotectedPipeline(baseConfig);
      } else {
        const baseConfig = {
          payload: {
            type: 'image',
            pixels: sampleImage.pixels,
            width: 32,
            height: 32,
            bitsPerPixel: 4
          },
          encrypt: { on: true, key: 'SF' },
          protect: { crc: true, hamming: true },
          modulation: 'PSK',
          channel: { ebn0dB: 4.0, medium: 'wifi' },
          samplesPerBit: 20
        };
        const demoSeed = findDemoSeed(baseConfig);
        baseConfig.channel.seed = demoSeed;
        trace = runPipeline(baseConfig);
        unprotTrace = runUnprotectedPipeline(baseConfig);
      }

      if (mapInstance) {
        mapInstance.reset();
        mapInstance.setTrace(trace);
      }

      showStep(0, false);
      play();
    },

    destroy() {
      pause();
      window.removeEventListener('keydown', handleKeyDown);
    }
  };
}

/**
 * SignalForge - Signal Lab Controller (signalLab.js)
 * Covers Practicals 5 and 7:
 * 1. Analog Modulation (Practical 5): AM, FM, and PM synthesis, AWGN channel, envelope & discriminator demodulation, MSE & SNR.
 * 2. Pulse Code Modulation (PCM - Practical 7): Analog sampling, staircase quantization (1-8 bits), encoding bitstream,
 *    and SNR_q theoretical comparison (6.02*n + 1.76 dB).
 */

import { DSP } from '../dsp.js';

export function createSignalLab(containerEl) {
  let activeTab = 'analog'; // 'analog' | 'pcm'

  const labEl = document.createElement('div');
  labEl.className = 'sf-signal-lab';
  labEl.innerHTML = `
    <!-- Top Header & Sub-lab Switcher -->
    <div class="sf-section-header">
      <div>
        <h3 class="sf-section-title">Signals & Modulation Laboratory</h3>
        <p class="sf-section-hint">Practicals 5 & 7: Explore continuous analog modulation (AM/FM/PM) and discrete Pulse Code Modulation (PCM sampling, quantization, encoding).</p>
      </div>
      <div class="sf-segmented-ctrl" id="sf-sig-tab-ctrl">
        <button class="sf-seg-btn active" data-tab="analog">📻 Analog Modulation (AM/FM/PM)</button>
        <button class="sf-seg-btn" data-tab="pcm">📊 PCM (Sampling & Quantization)</button>
      </div>
    </div>

    <!-- ================= ANALOG TAB ================= -->
    <div class="sf-signal-content" id="sf-sig-analog-tab">
      <div class="sf-lab-grid">
        <!-- Left: Analog Controls -->
        <aside class="sf-panel sf-lab-controls">
          <div class="sf-panel-header">
            <h4 class="sf-panel-title">Modulator Parameters (Practical 5)</h4>
          </div>
          <div class="sf-panel-body">
            <!-- Modulation Type -->
            <div class="sf-ctrl-group">
              <label class="sf-group-label">Analog Modulation Type</label>
              <div class="sf-segmented-ctrl" id="sf-analog-type-ctrl">
                <button class="sf-seg-btn active" data-type="AM">AM (Amplitude)</button>
                <button class="sf-seg-btn" data-type="FM">FM (Frequency)</button>
                <button class="sf-seg-btn" data-type="PM">PM (Phase)</button>
              </div>
            </div>

            <!-- Message Signal Type -->
            <div class="sf-ctrl-group">
              <label class="sf-group-label">Message Waveform m(t)</label>
              <div class="sf-chips-wrap" id="sf-analog-msg-type">
                <button class="sf-chip active" data-mtype="sine">Single Sine Wave</button>
                <button class="sf-chip" data-mtype="voice">Voice-like (Dual Tone)</button>
              </div>
            </div>

            <!-- Sliders -->
            <div class="sf-ctrl-group">
              <div class="sf-slider-header">
                <label for="sf-sl-fm">Message Frequency fm</label>
                <span id="sf-val-fm" class="sf-mono sf-accent-cyan">2.0 Hz</span>
              </div>
              <input type="range" id="sf-sl-fm" class="sf-slider" min="1" max="5" step="0.5" value="2.0">
            </div>

            <div class="sf-ctrl-group">
              <div class="sf-slider-header">
                <label for="sf-sl-fc">Carrier Frequency fc</label>
                <span id="sf-val-fc" class="sf-mono sf-accent-cyan">25.0 Hz</span>
              </div>
              <input type="range" id="sf-sl-fc" class="sf-slider" min="10" max="40" step="1" value="25.0">
            </div>

            <div class="sf-ctrl-group">
              <div class="sf-slider-header">
                <label for="sf-sl-mi">Modulation Index (μ / β)</label>
                <span id="sf-val-mi" class="sf-mono sf-accent-cyan">0.80</span>
              </div>
              <input type="range" id="sf-sl-mi" class="sf-slider" min="0.1" max="1.5" step="0.05" value="0.80">
            </div>

            <div class="sf-ctrl-group">
              <div class="sf-slider-header">
                <label for="sf-sl-snr">Channel AWGN SNR</label>
                <span id="sf-val-snr" class="sf-mono sf-accent-cyan">20 dB</span>
              </div>
              <input type="range" id="sf-sl-snr" class="sf-slider" min="0" max="40" step="2" value="20">
            </div>
          </div>
        </aside>

        <!-- Right: 4 Stacked Canvases -->
        <main class="sf-lab-inspect-col">
          <div class="sf-panel">
            <div class="sf-panel-header">
              <h4 class="sf-panel-title">Analog Waveform Stages</h4>
              <div id="sf-analog-metrics" style="font-family:var(--font-mono); font-size:12px; color:var(--ok);">
                MSE: 0.0012 | Recovered SNR: 22.4 dB
              </div>
            </div>
            <div class="sf-panel-body" style="display:flex; flex-direction:column; gap:14px;">
              <!-- 1. Message m(t) -->
              <div>
                <div style="font-size:12px; font-weight:700; color:var(--cyan); margin-bottom:4px;">1. Modulating Message Signal m(t)</div>
                <canvas id="sf-cv-m" width="600" height="80" style="width:100%; height:80px; background:#0d1527; border:1px solid var(--line); border-radius:8px;"></canvas>
              </div>

              <!-- 2. Carrier c(t) -->
              <div>
                <div style="font-size:12px; font-weight:700; color:var(--muted); margin-bottom:4px;">2. High-Frequency Carrier Wave c(t) = Ac cos(2π fc t)</div>
                <canvas id="sf-cv-c" width="600" height="80" style="width:100%; height:80px; background:#0d1527; border:1px solid var(--line); border-radius:8px;"></canvas>
              </div>

              <!-- 3. Modulated s(t) -->
              <div>
                <div style="font-size:12px; font-weight:700; color:var(--ok); margin-bottom:4px;" id="sf-lbl-mod">3. Modulated Signal s(t) [AM Envelope]</div>
                <canvas id="sf-cv-s" width="600" height="90" style="width:100%; height:90px; background:#0d1527; border:1px solid var(--line); border-radius:8px;"></canvas>
              </div>

              <!-- 4. Demodulated vs Original -->
              <div>
                <div style="font-size:12px; font-weight:700; color:var(--violet); margin-bottom:4px;">4. Demodulated Output (Green) vs Original Message (Faint Cyan)</div>
                <canvas id="sf-cv-d" width="600" height="80" style="width:100%; height:80px; background:#0d1527; border:1px solid var(--line); border-radius:8px;"></canvas>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>

    <!-- ================= PCM TAB ================= -->
    <div class="sf-signal-content" id="sf-sig-pcm-tab" style="display:none;">
      <div class="sf-lab-grid">
        <!-- Left: PCM Controls -->
        <aside class="sf-panel sf-lab-controls">
          <div class="sf-panel-header">
            <h4 class="sf-panel-title">PCM Parameters (Practical 7)</h4>
          </div>
          <div class="sf-panel-body">
            <!-- Sampling Rate -->
            <div class="sf-ctrl-group">
              <div class="sf-slider-header">
                <label for="sf-sl-pcm-fs">Sampling Rate fs</label>
                <span id="sf-val-pcm-fs" class="sf-mono sf-accent-cyan">24 Hz</span>
              </div>
              <input type="range" id="sf-sl-pcm-fs" class="sf-slider" min="4" max="64" step="2" value="24">
              <div class="sf-slider-ticks">
                <span id="sf-nyquist-status" style="color:var(--ok);">fs > 2fm (Over-Nyquist ✔)</span>
                <span>Nyquist = 4 Hz</span>
              </div>
            </div>

            <!-- Quantization Bits (1..8) -->
            <div class="sf-ctrl-group">
              <div class="sf-slider-header">
                <label for="sf-sl-pcm-bits">Quantization Bits (n)</label>
                <span id="sf-val-pcm-bits" class="sf-mono sf-accent-cyan">3 bits (8 levels)</span>
              </div>
              <input type="range" id="sf-sl-pcm-bits" class="sf-slider" min="1" max="8" step="1" value="3">
              <div class="sf-slider-ticks">
                <span>1 bit (2 levels)</span>
                <span>4 bits (16 levels)</span>
                <span>8 bits (256 levels)</span>
              </div>
            </div>

            <!-- Theory comparison card -->
            <div class="sf-panel" style="background:#0d1527; border:1px solid var(--line); padding:14px; margin-top:20px;">
              <h5 style="font-size:12px; font-weight:700; color:var(--text-bright); margin-bottom:8px;">Theoretical Quantization SNR Formula:</h5>
              <div style="font-family:var(--font-mono); font-size:13px; color:var(--cyan); margin-bottom:6px;">
                SNR_q ≈ 6.02 · n + 1.76 dB
              </div>
              <p class="sf-muted" style="font-size:11px;">
                Each additional quantization bit improves dynamic range by approximately 6 dB while doubling transmission bandwidth.
              </p>
            </div>
          </div>
        </aside>

        <!-- Right: PCM 3 Stages Canvases -->
        <main class="sf-lab-inspect-col">
          <div class="sf-panel">
            <div class="sf-panel-header">
              <h4 class="sf-panel-title">PCM Stages: Sampling → Quantization → Encoding</h4>
              <div id="sf-pcm-metrics" style="font-family:var(--font-mono); font-size:12px; color:var(--cyan);">
                SNR_q Theory: 19.8 dB | Measured: 19.4 dB
              </div>
            </div>
            <div class="sf-panel-body" style="display:flex; flex-direction:column; gap:16px;">
              <!-- 1. Analog with Sample Points -->
              <div>
                <div style="font-size:12px; font-weight:700; color:var(--cyan); margin-bottom:4px;">1. Sampling (Flat-top PAM Sample Points on Continuous Wave)</div>
                <canvas id="sf-cv-pcm-sample" width="600" height="90" style="width:100%; height:90px; background:#0d1527; border:1px solid var(--line); border-radius:8px;"></canvas>
              </div>

              <!-- 2. Staircase Quantization -->
              <div>
                <div style="font-size:12px; font-weight:700; color:var(--warn); margin-bottom:4px;">2. Quantization Staircase (Discrete Amplitude Levels Δ = 2A / 2^n)</div>
                <canvas id="sf-cv-pcm-quant" width="600" height="110" style="width:100%; height:110px; background:#0d1527; border:1px solid var(--line); border-radius:8px;"></canvas>
              </div>

              <!-- 3. Quantization Error Signal -->
              <div>
                <div style="font-size:12px; font-weight:700; color:var(--err); margin-bottom:4px;">3. Quantization Error e(t) = m_q(t) - m(t)</div>
                <canvas id="sf-cv-pcm-error" width="600" height="70" style="width:100%; height:70px; background:#0d1527; border:1px solid var(--line); border-radius:8px;"></canvas>
              </div>

              <!-- 4. Binary Bitstream Output -->
              <div style="background:#0d1527; border:1px solid var(--line); border-radius:8px; padding:12px;">
                <div style="font-size:12px; font-weight:700; color:var(--ok); margin-bottom:6px;">4. Transmitted PCM Digital Bitstream:</div>
                <div id="sf-pcm-bitstream" style="display:flex; flex-wrap:wrap; gap:3px; max-height:80px; overflow-y:auto; font-family:var(--font-mono); font-size:11px;">
                  <!-- Dynamic bit chips -->
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  `;

  containerEl.replaceChildren(labEl);

  // Tab controller
  const tabCtrl = labEl.querySelector('#sf-sig-tab-ctrl');
  const analogTab = labEl.querySelector('#sf-sig-analog-tab');
  const pcmTab = labEl.querySelector('#sf-sig-pcm-tab');

  tabCtrl.addEventListener('click', (e) => {
    const btn = e.target.closest('.sf-seg-btn');
    if (!btn) return;
    tabCtrl.querySelectorAll('.sf-seg-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeTab = btn.getAttribute('data-tab');

    if (activeTab === 'analog') {
      analogTab.style.display = 'block';
      pcmTab.style.display = 'none';
      renderAnalog();
    } else {
      analogTab.style.display = 'none';
      pcmTab.style.display = 'block';
      renderPCM();
    }
  });

  /* ==========================================================================
     ANALOG MODULATION RENDERING (Practical 5)
     ========================================================================== */
  let analogModType = 'AM';
  let analogMsgType = 'sine';

  const slFm = labEl.querySelector('#sf-sl-fm');
  const slFc = labEl.querySelector('#sf-sl-fc');
  const slMi = labEl.querySelector('#sf-sl-mi');
  const slSnr = labEl.querySelector('#sf-sl-snr');

  function renderAnalog() {
    const fm = parseFloat(slFm.value);
    const fc = parseFloat(slFc.value);
    const mi = parseFloat(slMi.value);
    const snrDb = parseFloat(slSnr.value);

    labEl.querySelector('#sf-val-fm').textContent = `${fm.toFixed(1)} Hz`;
    labEl.querySelector('#sf-val-fc').textContent = `${fc.toFixed(1)} Hz`;
    labEl.querySelector('#sf-val-mi').textContent = mi.toFixed(2);
    labEl.querySelector('#sf-val-snr').textContent = `${snrDb} dB`;

    const cvM = labEl.querySelector('#sf-cv-m');
    const cvC = labEl.querySelector('#sf-cv-c');
    const cvS = labEl.querySelector('#sf-cv-s');
    const cvD = labEl.querySelector('#sf-cv-d');

    const duration = 1.0; // 1 second
    const sampleRate = 2000;
    const totalSamples = duration * sampleRate;
    const time = new Float32Array(totalSamples);
    const m = new Float32Array(totalSamples);
    const c = new Float32Array(totalSamples);
    const s = new Float32Array(totalSamples);
    const d = new Float32Array(totalSamples);

    // Generate m(t) and c(t)
    for (let i = 0; i < totalSamples; i++) {
      const t = i / sampleRate;
      time[i] = t;
      if (analogMsgType === 'sine') {
        m[i] = Math.cos(2 * Math.PI * fm * t);
      } else {
        // Voice-like dual tone
        m[i] = 0.7 * Math.cos(2 * Math.PI * fm * t) + 0.4 * Math.cos(2 * Math.PI * (fm * 2.2) * t);
      }
      c[i] = Math.cos(2 * Math.PI * fc * t);
    }

    // Modulate s(t)
    let cumulativeM = 0;
    for (let i = 0; i < totalSamples; i++) {
      const t = time[i];
      if (analogModType === 'AM') {
        // AM: s(t) = [1 + mi * m(t)] * c(t)
        s[i] = (1.0 + mi * m[i]) * c[i];
      } else if (analogModType === 'FM') {
        // FM: s(t) = cos(2*pi*fc*t + 2*pi*kf * integral(m))
        cumulativeM += m[i] * (1.0 / sampleRate);
        s[i] = Math.cos(2 * Math.PI * fc * t + 2 * Math.PI * (mi * 15.0) * cumulativeM);
      } else if (analogModType === 'PM') {
        // PM: s(t) = cos(2*pi*fc*t + kp * m(t))
        s[i] = Math.cos(2 * Math.PI * fc * t + mi * Math.PI * m[i]);
      }
    }

    // Add Channel AWGN
    const signalPower = s.reduce((acc, v) => acc + v * v, 0) / totalSamples;
    const snrLinear = Math.pow(10, snrDb / 10.0);
    const noisePower = signalPower / snrLinear;
    const noiseSigma = Math.sqrt(noisePower);

    const rng = DSP.createRng(42);
    const gaussian = DSP.createGaussianGenerator(rng);
    const noisyS = new Float32Array(totalSamples);
    for (let i = 0; i < totalSamples; i++) {
      noisyS[i] = s[i] + gaussian(noiseSigma);
    }

    // Demodulation
    if (analogModType === 'AM') {
      // Envelope detector: diode rectifier + RC filter
      let envelope = 0;
      const alpha = 0.08;
      for (let i = 0; i < totalSamples; i++) {
        const rectified = Math.abs(noisyS[i]);
        envelope = envelope * (1 - alpha) + rectified * alpha;
        d[i] = (envelope - 0.3) * (1.0 / Math.max(0.1, mi)) * 3.14;
      }
    } else {
      // FM/PM Demodulator: Zero-crossing / Phase discriminator
      for (let i = 1; i < totalSamples - 1; i++) {
        // Differential discriminator
        const diff = (noisyS[i] - noisyS[i - 1]) * sampleRate;
        d[i] = (Math.abs(diff) / (2 * Math.PI * fc) - 1.0) * 0.8;
      }
    }

    // Compute MSE and Recovered SNR
    let sse = 0;
    let mPower = 0;
    const startIdx = Math.floor(sampleRate * 0.1); // skip initial filter transient
    for (let i = startIdx; i < totalSamples; i++) {
      const err = m[i] - d[i];
      sse += err * err;
      mPower += m[i] * m[i];
    }
    const mse = sse / (totalSamples - startIdx);
    const recSnr = 10 * Math.log10(Math.max(1e-5, mPower / Math.max(1e-5, sse)));

    labEl.querySelector('#sf-analog-metrics').textContent = `MSE: ${mse.toFixed(4)} | Recovered SNR: ${recSnr.toFixed(1)} dB`;
    labEl.querySelector('#sf-lbl-mod').textContent = `3. Modulated Signal s(t) [${analogModType} Modulation]`;

    // Draw Canvases
    drawWaveToCanvas(cvM, m, '#22d3ee', 1.2);
    drawWaveToCanvas(cvC, c, '#8fa0c8', 1.2);
    drawWaveToCanvas(cvS, noisyS, '#34d399', 2.5);
    drawCompareCanvas(cvD, m, d);
  }

  function drawWaveToCanvas(canvas, wave, color, maxAmp = 1.5) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    ctx.fillStyle = '#0d1527';
    ctx.fillRect(0, 0, w, h);

    // Center grid line
    ctx.strokeStyle = '#1e294b';
    ctx.beginPath();
    ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2);
    ctx.stroke();

    ctx.strokeStyle = color;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    const len = wave.length;
    for (let i = 0; i < len; i++) {
      const x = (i / len) * w;
      const y = h / 2 - (wave[i] / maxAmp) * (h / 2 * 0.85);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  function drawCompareCanvas(canvas, orig, demod) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    ctx.fillStyle = '#0d1527';
    ctx.fillRect(0, 0, w, h);

    // Original in faint cyan
    ctx.strokeStyle = 'rgba(34, 211, 238, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    const len = orig.length;
    for (let i = 0; i < len; i++) {
      const x = (i / len) * w;
      const y = h / 2 - (orig[i] / 1.5) * (h / 2 * 0.85);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Demodulated in green
    ctx.strokeStyle = '#34d399';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    for (let i = 0; i < len; i++) {
      const x = (i / len) * w;
      const y = h / 2 - (demod[i] / 1.5) * (h / 2 * 0.85);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // Bind Analog Controls
  [slFm, slFc, slMi, slSnr].forEach(sl => sl.addEventListener('input', renderAnalog));

  labEl.querySelectorAll('#sf-analog-type-ctrl .sf-seg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      labEl.querySelectorAll('#sf-analog-type-ctrl .sf-seg-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      analogModType = btn.getAttribute('data-type');
      renderAnalog();
    });
  });

  labEl.querySelectorAll('#sf-analog-msg-type .sf-chip').forEach(ch => {
    ch.addEventListener('click', () => {
      labEl.querySelectorAll('#sf-analog-msg-type .sf-chip').forEach(c => c.classList.remove('active'));
      ch.classList.add('active');
      analogMsgType = ch.getAttribute('data-mtype');
      renderAnalog();
    });
  });

  /* ==========================================================================
     PCM RENDERING (Practical 7)
     ========================================================================== */
  const slPcmFs = labEl.querySelector('#sf-sl-pcm-fs');
  const slPcmBits = labEl.querySelector('#sf-sl-pcm-bits');

  function renderPCM() {
    const fs = parseInt(slPcmFs.value, 10);
    const nBits = parseInt(slPcmBits.value, 10);
    const nLevels = Math.pow(2, nBits);
    const fm = 2.0; // 2 Hz message wave

    labEl.querySelector('#sf-val-pcm-fs').textContent = `${fs} Hz`;
    labEl.querySelector('#sf-val-pcm-bits').textContent = `${nBits} bits (${nLevels} levels)`;

    const nyqStatus = labEl.querySelector('#sf-nyquist-status');
    if (fs >= 2 * fm) {
      nyqStatus.textContent = `fs ≥ 2fm (Over-Nyquist ✔)`;
      nyqStatus.style.color = 'var(--ok)';
    } else {
      nyqStatus.textContent = `fs < 2fm (Aliasing Warning ⚡)`;
      nyqStatus.style.color = 'var(--err)';
    }

    const cvSample = labEl.querySelector('#sf-cv-pcm-sample');
    const cvQuant = labEl.querySelector('#sf-cv-pcm-quant');
    const cvError = labEl.querySelector('#sf-cv-pcm-error');
    const bitBox = labEl.querySelector('#sf-pcm-bitstream');

    const duration = 1.0;
    const simRate = 1000;
    const totalSim = duration * simRate;
    const analogWave = new Float32Array(totalSim);

    for (let i = 0; i < totalSim; i++) {
      const t = i / simRate;
      analogWave[i] = Math.sin(2 * Math.PI * fm * t); // -1.0 .. +1.0
    }

    // PAM Sample points
    const step = Math.floor(simRate / fs);
    const sampleIndices = [];
    const sampleValues = [];
    for (let i = 0; i < totalSim; i += step) {
      sampleIndices.push(i);
      sampleValues.push(analogWave[i]);
    }

    // Quantization intervals: Range [-1, +1], delta = 2.0 / nLevels
    const delta = 2.0 / nLevels;
    const quantizedValues = sampleValues.map(val => {
      // Map [-1, 1] to [0, nLevels-1]
      const normalized = (val + 1.0) / 2.0;
      const level = Math.max(0, Math.min(nLevels - 1, Math.round(normalized * (nLevels - 1))));
      return -1.0 + (level + 0.5) * delta;
    });

    // Quantization Error
    const errorSignal = new Float32Array(totalSim);
    let sse = 0;
    let sSig = 0;
    for (let i = 0; i < totalSim; i++) {
      const sIdx = Math.floor(i / step) * step;
      const sampleVal = analogWave[Math.min(sIdx, totalSim - 1)];
      const normalized = (sampleVal + 1.0) / 2.0;
      const level = Math.max(0, Math.min(nLevels - 1, Math.round(normalized * (nLevels - 1))));
      const qVal = -1.0 + (level + 0.5) * delta;
      const err = qVal - analogWave[i];
      errorSignal[i] = err;
      sse += err * err;
      sSig += analogWave[i] * analogWave[i];
    }

    // SNR formulas
    const theorySnr = 6.02 * nBits + 1.76;
    const measSnr = 10 * Math.log10(sSig / Math.max(1e-6, sse));
    labEl.querySelector('#sf-pcm-metrics').textContent = `SNR_q Theory: ${theorySnr.toFixed(1)} dB | Measured: ${measSnr.toFixed(1)} dB`;

    // 1. Draw Sample Points Canvas
    drawSampleCanvas(cvSample, analogWave, sampleIndices, sampleValues);

    // 2. Draw Staircase Quantization Canvas
    drawStaircaseCanvas(cvQuant, analogWave, sampleIndices, quantizedValues, nLevels, delta);

    // 3. Draw Quantization Error Canvas
    drawWaveToCanvas(cvError, errorSignal, '#ef4444', 0.8);

    // 4. Encode to Bitstream chips
    const bitChips = [];
    sampleValues.forEach((val, idx) => {
      const normalized = (val + 1.0) / 2.0;
      const level = Math.max(0, Math.min(nLevels - 1, Math.round(normalized * (nLevels - 1))));
      const binStr = level.toString(2).padStart(nBits, '0');
      bitChips.push(`<span class="sf-bchip b-data" title="Sample ${idx+1}: level ${level}">${binStr}</span>`);
    });
    bitBox.innerHTML = bitChips.join(' ');
  }

  function drawSampleCanvas(canvas, wave, sIndices, sValues) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    ctx.fillStyle = '#0d1527';
    ctx.fillRect(0, 0, w, h);

    // Continuous wave
    ctx.strokeStyle = 'rgba(34, 211, 238, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    const len = wave.length;
    for (let i = 0; i < len; i++) {
      const x = (i / len) * w;
      const y = h / 2 - wave[i] * (h / 2 * 0.8);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Sample Stems and Points
    ctx.strokeStyle = '#22d3ee';
    ctx.fillStyle = '#22d3ee';
    ctx.lineWidth = 1.8;
    sIndices.forEach((sIdx, i) => {
      const x = (sIdx / len) * w;
      const y = h / 2 - sValues[i] * (h / 2 * 0.8);
      ctx.beginPath();
      ctx.moveTo(x, h / 2);
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, y, 3.5, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function drawStaircaseCanvas(canvas, wave, sIndices, qValues, nLevels, delta) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    ctx.fillStyle = '#0d1527';
    ctx.fillRect(0, 0, w, h);

    // Quantization Grid Lines
    ctx.strokeStyle = '#1e294b';
    ctx.lineWidth = 1;
    for (let l = 0; l < nLevels; l++) {
      const val = -1.0 + (l + 0.5) * delta;
      const y = h / 2 - val * (h / 2 * 0.8);
      ctx.beginPath();
      ctx.moveTo(0, y); ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Faint Analog
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    const len = wave.length;
    for (let i = 0; i < len; i++) {
      const x = (i / len) * w;
      const y = h / 2 - wave[i] * (h / 2 * 0.8);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Staircase
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    for (let i = 0; i < sIndices.length; i++) {
      const xStart = (sIndices[i] / len) * w;
      const xEnd = (i + 1 < sIndices.length ? sIndices[i + 1] / len : 1.0) * w;
      const y = h / 2 - qValues[i] * (h / 2 * 0.8);

      if (i === 0) ctx.moveTo(xStart, y);
      else ctx.lineTo(xStart, y);
      ctx.lineTo(xEnd, y);
    }
    ctx.stroke();
  }

  [slPcmFs, slPcmBits].forEach(sl => sl.addEventListener('input', renderPCM));

  // Initial render
  renderAnalog();

  return {};
}

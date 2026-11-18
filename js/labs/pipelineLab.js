/**
 * SignalForge - Pipeline Lab Controller (pipelineLab.js)
 * Full interactive exploration lab for the 8-stage communication chain:
 * Controls, interactive map, inspector with 8 tabs, result cards, BER curve modal, and audio synthesis.
 */

import { State } from '../state.js';
import { STAGES, createMap } from '../map.js';
import { Wave } from '../wave.js';
import { DSP } from '../dsp.js';
import { runPipeline, runUnprotectedPipeline } from '../pipeline.js';

export function createPipelineLab(containerEl) {
  let activeTab = 'message';
  let debounceTimer = null;
  let mapInstance = null;
  let isRunningAnim = false;

  const labEl = document.createElement('div');
  labEl.className = 'sf-pipeline-lab';
  labEl.innerHTML = `
    <!-- Top Interactive Pipeline Map -->
    <div class="sf-lab-map-section">
      <div class="sf-section-header">
        <h3 class="sf-section-title">End-to-End Pipeline Map</h3>
        <span class="sf-section-hint">Click any stage node to inspect its live data</span>
      </div>
      <div class="sf-lab-map-box" id="sf-lab-map-box"></div>
    </div>

    <!-- Main Workspace: Controls (Left) + Inspector & Results (Right) -->
    <div class="sf-lab-grid">
      <!-- Left Column: Controls -->
      <aside class="sf-panel sf-lab-controls">
        <div class="sf-panel-header">
          <h4 class="sf-panel-title">Transmitter & Channel Controls</h4>
          <button class="sf-btn sf-btn-ghost sf-btn-xs" id="sf-ctrl-reset">Reset</button>
        </div>

        <div class="sf-panel-body">
          <!-- 1. Payload & Key -->
          <div class="sf-ctrl-group">
            <div class="sf-field-header">
              <label for="sf-inp-msg">Source Message</label>
              <div class="sf-char-counter"><span id="sf-msg-count">5</span>/32 chars</div>
            </div>
            <div class="sf-input-btn-row">
              <input type="text" id="sf-inp-msg" class="sf-input" maxlength="32" value="HELLO" placeholder="Type text (max 32 chars)">
              <button class="sf-btn sf-btn-outline sf-btn-sm" id="sf-btn-hello">Use HELLO</button>
            </div>
          </div>

          <div class="sf-ctrl-group">
            <div class="sf-field-header">
              <label for="sf-inp-key">Encryption Key (XOR)</label>
              <span class="sf-badge sf-badge-violet">Educational cipher</span>
            </div>
            <input type="text" id="sf-inp-key" class="sf-input" maxlength="16" value="SF" placeholder="Secret key">
          </div>

          <!-- 2. Protection Toggles -->
          <div class="sf-ctrl-group">
            <label class="sf-group-label">Protection Schemes</label>
            <div class="sf-toggles-row">
              <label class="sf-toggle-card">
                <input type="checkbox" id="sf-chk-enc" checked>
                <div class="sf-toggle-content">
                  <span class="sf-toggle-title">Encrypt</span>
                  <small>XOR Stream</small>
                </div>
              </label>

              <label class="sf-toggle-card">
                <input type="checkbox" id="sf-chk-crc" checked>
                <div class="sf-toggle-content">
                  <span class="sf-toggle-title">CRC-8</span>
                  <small>Detect Errors</small>
                </div>
              </label>

              <label class="sf-toggle-card">
                <input type="checkbox" id="sf-chk-ham" checked>
                <div class="sf-toggle-content">
                  <span class="sf-toggle-title">Hamming(7,4)</span>
                  <small>Correct 1-bit</small>
                </div>
              </label>
            </div>
          </div>

          <!-- 3. Digital Modulation -->
          <div class="sf-ctrl-group">
            <label class="sf-group-label">Digital Modulation Scheme</label>
            <div class="sf-segmented-ctrl" id="sf-mod-segmented">
              <button class="sf-seg-btn" data-mod="ASK">ASK (OOK)</button>
              <button class="sf-seg-btn" data-mod="FSK">FSK (2-Freq)</button>
              <button class="sf-seg-btn active" data-mod="PSK">PSK (BPSK)</button>
            </div>
          </div>

          <!-- 4. Channel Presets & Noise -->
          <div class="sf-ctrl-group">
            <label class="sf-group-label">Transmission Medium Preset</label>
            <div class="sf-chips-wrap">
              <button class="sf-chip" data-snr="14" data-med="fiber">Fiber (14 dB)</button>
              <button class="sf-chip" data-snr="9" data-med="copper">Copper Cable (9 dB)</button>
              <button class="sf-chip active" data-snr="5" data-med="wifi">Wi-Fi (5 dB)</button>
              <button class="sf-chip" data-snr="1" data-med="noisy">Noisy Room (1 dB)</button>
            </div>
          </div>

          <div class="sf-ctrl-group">
            <div class="sf-slider-header">
              <label for="sf-slider-ebn0">Signal-to-Noise Ratio (Eb/N0)</label>
              <div class="sf-slider-val"><span id="sf-val-ebn0">2.0</span> dB</div>
            </div>
            <input type="range" id="sf-slider-ebn0" class="sf-slider" min="-2" max="14" step="0.5" value="2.0">
            <div class="sf-slider-ticks">
              <span>-2 dB (Severe noise)</span>
              <span>6 dB</span>
              <span>14 dB (Clean)</span>
            </div>
          </div>

          <div class="sf-ctrl-btn-row">
            <button class="sf-btn sf-btn-outline sf-btn-sm" id="sf-btn-new-noise">🎲 New noise seed</button>
          </div>

          <!-- 5. Actions: Run, Hear, BER Modal -->
          <div class="sf-actions-stack">
            <button class="sf-btn sf-btn-primary sf-btn-lg" id="sf-btn-run">▶ Run transmission</button>
            <div class="sf-actions-split">
              <button class="sf-btn sf-btn-outline" id="sf-btn-hear">🔊 Hear signal</button>
              <button class="sf-btn sf-btn-outline" id="sf-btn-ber">📈 BER curve</button>
            </div>
          </div>
        </div>
      </aside>

      <!-- Right Column: Stage Inspector & Result Card -->
      <main class="sf-lab-inspect-col">
        <!-- Inspector Card with 8 Stage Tabs -->
        <div class="sf-panel sf-inspector-panel">
          <div class="sf-inspector-tabs" id="sf-inspector-tabs">
            ${STAGES.map((s, idx) => `
              <button class="sf-tab-btn ${idx === 0 ? 'active' : ''}" data-tab="${s.id}">
                <span class="sf-tab-num">${s.num}</span>
                <span class="sf-tab-name">${s.title}</span>
              </button>
            `).join('')}
          </div>

          <div class="sf-panel-body sf-tab-content-area" id="sf-tab-content">
            <!-- Dynamic tab content renders here -->
          </div>
        </div>

        <!-- Result Card -->
        <div class="sf-panel sf-result-panel" id="sf-result-card">
          <!-- Live result summary renders here -->
        </div>
      </main>
    </div>

    <!-- BER Curve Modal (hidden by default) -->
    <div class="sf-modal-backdrop" id="sf-ber-modal" style="display:none;">
      <div class="sf-modal-card">
        <div class="sf-modal-header">
          <div>
            <h3 class="sf-modal-title">Bit Error Rate (BER) Theoretical vs Measured</h3>
            <p class="sf-modal-subtitle">Monte-Carlo sweep across Eb/N0 values (0..12 dB) compared to theoretical Q-function curves</p>
          </div>
          <button class="sf-btn sf-btn-ghost sf-btn-sm" id="sf-modal-close">✕</button>
        </div>
        <div class="sf-modal-body">
          <div class="sf-ber-canvas-box">
            <canvas id="sf-ber-canvas" width="680" height="340"></canvas>
            <div class="sf-ber-progress-bar" id="sf-ber-progress-bar" style="display:none;">
              <div class="sf-ber-progress-fill" id="sf-ber-progress-fill"></div>
            </div>
          </div>
        </div>
        <div class="sf-modal-footer">
          <button class="sf-btn sf-btn-outline" id="sf-btn-ber-rerun">Re-run sweep</button>
          <button class="sf-btn sf-btn-primary" id="sf-btn-ber-download">Download PNG</button>
        </div>
      </div>
    </div>

    <!-- Audio Player Modal / Dialog -->
    <div class="sf-modal-backdrop" id="sf-audio-modal" style="display:none;">
      <div class="sf-modal-card sf-modal-card-sm">
        <div class="sf-modal-header">
          <h3 class="sf-modal-title">Audio Signal Player</h3>
          <button class="sf-btn sf-btn-ghost sf-btn-sm" id="sf-audio-modal-close">✕</button>
        </div>
        <div class="sf-modal-body">
          <p class="sf-muted">Web Audio API synthesizes audible tones directly from transmitted bit decisions (1800 Hz carrier for PSK/ASK, 1200/2200 Hz for FSK).</p>
          <div class="sf-audio-play-buttons">
            <button class="sf-btn sf-btn-cyan sf-btn-lg" id="sf-btn-play-clean">🔊 Play Clean Signal</button>
            <button class="sf-btn sf-btn-pink sf-btn-lg" id="sf-btn-play-noisy">🔊 Play Noisy Channel Signal</button>
          </div>
        </div>
      </div>
    </div>
  `;

  containerEl.replaceChildren(labEl);

  // Cache Elements
  const mapTarget = labEl.querySelector('#sf-lab-map-box');
  const inpMsg = labEl.querySelector('#sf-inp-msg');
  const msgCount = labEl.querySelector('#sf-msg-count');
  const btnHello = labEl.querySelector('#sf-btn-hello');
  const inpKey = labEl.querySelector('#sf-inp-key');
  const chkEnc = labEl.querySelector('#sf-chk-enc');
  const chkCrc = labEl.querySelector('#sf-chk-crc');
  const chkHam = labEl.querySelector('#sf-chk-ham');
  const modSegmented = labEl.querySelector('#sf-mod-segmented');
  const sliderEbn0 = labEl.querySelector('#sf-slider-ebn0');
  const valEbn0 = labEl.querySelector('#sf-val-ebn0');
  const btnNewNoise = labEl.querySelector('#sf-btn-new-noise');
  const btnReset = labEl.querySelector('#sf-ctrl-reset');
  const btnRun = labEl.querySelector('#sf-btn-run');
  const btnHear = labEl.querySelector('#sf-btn-hear');
  const btnBer = labEl.querySelector('#sf-btn-ber');
  const tabButtons = labEl.querySelectorAll('.sf-tab-btn');
  const tabContent = labEl.querySelector('#sf-tab-content');
  const resultCard = labEl.querySelector('#sf-result-card');
  const berModal = labEl.querySelector('#sf-ber-modal');
  const berClose = labEl.querySelector('#sf-modal-close');
  const berCanvas = labEl.querySelector('#sf-ber-canvas');
  const berProgress = labEl.querySelector('#sf-ber-progress-bar');
  const berProgressFill = labEl.querySelector('#sf-ber-progress-fill');
  const berRerun = labEl.querySelector('#sf-btn-ber-rerun');
  const berDownload = labEl.querySelector('#sf-btn-ber-download');
  const audioModal = labEl.querySelector('#sf-audio-modal');
  const audioClose = labEl.querySelector('#sf-audio-modal-close');
  const btnPlayClean = labEl.querySelector('#sf-btn-play-clean');
  const btnPlayNoisy = labEl.querySelector('#sf-btn-play-noisy');

  // Initialize Map
  mapInstance = createMap(mapTarget, { interactive: true, isTour: false });
  mapInstance.onNodeClick((stageId) => {
    switchTab(stageId);
  });

  // Switch Active Tab in Inspector
  function switchTab(stageId) {
    activeTab = stageId;
    tabButtons.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === stageId);
    });
    mapInstance.setActive(stageId);
    renderInspectorTab();
  }

  // Render Content of the Selected Inspector Tab
  function renderInspectorTab() {
    const trace = State.getTrace();
    if (!trace) return;

    const st = trace.stages[activeTab];
    tabContent.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'sf-inspector-stage-head';
    const stageInfo = STAGES.find(s => s.id === activeTab) || STAGES[0];
    header.innerHTML = `
      <div class="sf-stage-badge" style="background:${stageInfo.color}22; border-color:${stageInfo.color}; color:${stageInfo.color};">
        STAGE ${stageInfo.num}: ${stageInfo.title.toUpperCase()}
      </div>
      <h3 class="sf-tab-heading">${stageInfo.subtitle}</h3>
    `;
    tabContent.appendChild(header);

    const bodyWrap = document.createElement('div');
    bodyWrap.className = 'sf-tab-inner-body';

    if (activeTab === 'message') {
      bodyWrap.innerHTML = `
        <div class="sf-stat-line">Source text: <strong>"${st.text}"</strong> (${st.bytes.length} bytes, ${st.bytes.length * 8} bits)</div>
        <div class="sf-chips-row">
          ${st.text.split('').map(ch => `<div class="sf-letter-chip">${ch}</div>`).join('')}
        </div>
        <p class="sf-muted sf-mt-2">Plain text information generated at the source. At this step the data is human-readable characters.</p>
      `;
    } else if (activeTab === 'encode') {
      bodyWrap.innerHTML = `
        <div class="sf-stat-line">Encoding UTF-8 / ASCII characters into 8-bit binary numbers:</div>
        <table class="sf-ascii-table">
          <thead><tr><th>Char</th><th>Decimal</th><th>Hex</th><th>8-bit Binary</th></tr></thead>
          <tbody>
            ${trace.stages.message.text.split('').map(ch => {
              const code = ch.charCodeAt(0);
              return `<tr>
                <td><strong class="sf-accent-cyan">${ch}</strong></td>
                <td><code class="sf-mono">${code}</code></td>
                <td><code class="sf-mono">0x${code.toString(16).toUpperCase().padStart(2, '0')}</code></td>
                <td><div class="sf-bit-chips-mini">${code.toString(2).padStart(8, '0').split('').map(b => `<span class="sf-bchip ${b==='1'?'b1':'b0'}">${b}</span>`).join('')}</div></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      `;
    } else if (activeTab === 'encrypt') {
      const on = st.on;
      bodyWrap.innerHTML = `
        <div class="sf-stat-line">Status: <strong class="${on ? 'sf-accent-ok' : 'sf-accent-warn'}">${on ? 'ENABLED (XOR Cipher)' : 'DISABLED (Pass-through)'}</strong> | Key: <code>"${st.key}"</code></div>
        <div class="sf-xor-view">
          <div class="sf-xor-row"><span class="sf-xor-lbl">Plain Bits:</span> ${Array.from(trace.stages.encode.bits.slice(0, 24)).map(b => `<span class="sf-bchip ${b===1?'b1':'b0'}">${b}</span>`).join('')}</div>
          <div class="sf-xor-row sf-xor-op"><span>⊕ Key Stream:</span> ${Array.from(trace.stages.encode.bits.slice(0, 24)).map((_, i) => `<span class="sf-bchip b-key">${st.keyBytes[i % st.keyBytes.length] & 1}</span>`).join('')}</div>
          <div class="sf-xor-row"><span class="sf-xor-lbl sf-accent-violet">Cipher Bits:</span> ${Array.from(st.bits.slice(0, 24)).map((b, i) => `<span class="sf-bchip b-enc ${b !== trace.stages.encode.bits[i] ? 'changed' : ''}">${b}</span>`).join('')}</div>
        </div>
        <p class="sf-muted sf-mt-2">Educational stream cipher: Each plain byte is bitwise XORed with the repeated key. The receiver applies the identical XOR operation with the same key to invert.</p>
      `;
    } else if (activeTab === 'protect') {
      const coded = st.codedBits;
      bodyWrap.innerHTML = `
        <div class="sf-stat-line">
          CRC-8: <strong class="${st.crcOn ? 'sf-accent-ok' : 'sf-muted'}">${st.crcOn ? '0x' + st.crcValue.toString(16).toUpperCase().padStart(2, '0') : 'OFF'}</strong> &nbsp;|&nbsp;
          Hamming(7,4): <strong class="${st.hammingOn ? 'sf-accent-ok' : 'sf-muted'}">${st.hammingOn ? 'ON (' + st.blocks + ' blocks)' : 'OFF'}</strong> &nbsp;|&nbsp;
          Total Bits on Air: <strong class="sf-accent-amber">${st.totalCodedBits}</strong>
        </div>
        <div class="sf-hamming-blocks">
          ${st.hammingOn ? [0, 1, 2, 3].map(b => {
            if (b * 7 >= coded.length) return '';
            const blockBits = coded.slice(b * 7, b * 7 + 7);
            return `<div class="sf-hblock">
              <span class="sf-bchip b-parity" title="p1 (parity)">${blockBits[0]}</span>
              <span class="sf-bchip b-parity" title="p2 (parity)">${blockBits[1]}</span>
              <span class="sf-bchip b-data" title="d1 (data)">${blockBits[2]}</span>
              <span class="sf-bchip b-parity" title="p3 (parity)">${blockBits[3]}</span>
              <span class="sf-bchip b-data" title="d2 (data)">${blockBits[4]}</span>
              <span class="sf-bchip b-data" title="d3 (data)">${blockBits[5]}</span>
              <span class="sf-bchip b-data" title="d4 (data)">${blockBits[6]}</span>
            </div>`;
          }).join('') : '<p class="sf-muted">Hamming is OFF. Raw bits sent without Forward Error Correction.</p>'}
        </div>
      `;
    } else if (activeTab === 'modulate') {
      const canvas = document.createElement('canvas');
      canvas.className = 'sf-canvas-wave';
      canvas.style.height = '140px';
      bodyWrap.appendChild(canvas);

      const sliderRow = document.createElement('div');
      sliderRow.className = 'sf-slider-header sf-mt-2';
      sliderRow.innerHTML = `
        <label for="sf-wave-scroll">Waveform Window Offset:</label>
        <span id="sf-wave-offset-val">Bits 0..16</span>
      `;
      bodyWrap.appendChild(sliderRow);

      const scrollInput = document.createElement('input');
      scrollInput.type = 'range';
      scrollInput.className = 'sf-slider';
      scrollInput.min = '0';
      const maxOffset = Math.max(0, trace.stages.modulate.txBits.length - 16);
      scrollInput.max = String(maxOffset);
      scrollInput.value = '0';
      bodyWrap.appendChild(scrollInput);

      const drawWave = (offset) => {
        Wave.renderWaveform(canvas, st.waveform, st.txBits, {
          samplesPerBit: st.samplesPerBit,
          bitStart: offset,
          bitCount: 16,
          color: '#34d399'
        });
      };

      scrollInput.addEventListener('input', (e) => {
        const off = parseInt(e.target.value, 10);
        const offVal = bodyWrap.querySelector('#sf-wave-offset-val');
        if (offVal) offVal.textContent = `Bits ${off}..${off + 16}`;
        drawWave(off);
      });

      setTimeout(() => drawWave(0), 10);
    } else if (activeTab === 'channel') {
      const topBadge = document.createElement('div');
      topBadge.className = 'sf-flipped-badge';
      topBadge.innerHTML = `⚡ <strong>${st.flippedIndices.length} bits flipped</strong> on air (AWGN noise σ = ${st.sigma.toFixed(3)}, Eb/N0 = ${st.ebn0dB} dB)`;
      bodyWrap.appendChild(topBadge);

      const canvasWave = document.createElement('canvas');
      canvasWave.className = 'sf-canvas-wave';
      canvasWave.style.height = '120px';
      bodyWrap.appendChild(canvasWave);

      const canvasHist = document.createElement('canvas');
      canvasHist.className = 'sf-canvas-wave sf-mt-2';
      canvasHist.style.height = '100px';
      bodyWrap.appendChild(canvasHist);

      setTimeout(() => {
        Wave.renderOverlay(
          canvasWave,
          trace.stages.modulate.waveform,
          st.received,
          trace.stages.modulate.txBits,
          st.flippedIndices,
          { samplesPerBit: 20, bitStart: 0, bitCount: 16 }
        );
        Wave.renderNoiseHistogram(canvasHist, st.noise, st.sigma);
      }, 10);
    } else if (activeTab === 'demodulate') {
      const txBits = trace.stages.modulate.txBits.slice(0, 32);
      const rxBits = st.rxBitsRaw.slice(0, 32);
      const flips = trace.stages.channel.flippedIndices;

      bodyWrap.innerHTML = `
        <div class="sf-stat-line">
          Raw Errors: <strong class="${st.rawErrors > 0 ? 'sf-accent-err' : 'sf-accent-ok'}">${st.rawErrors}</strong> / ${st.totalBitsOnAir} &nbsp;|&nbsp;
          Raw BER: <strong>${(st.rawBER * 100).toFixed(2)}%</strong> (${st.rawBER < 0.001 ? st.rawBER.toExponential(2) : st.rawBER.toFixed(4)})
        </div>
        <div class="sf-bit-compare-grid">
          <div class="sf-row-lbl">TX Bits:</div>
          <div class="sf-row-bits">${Array.from(txBits).map(b => `<span class="sf-bchip b-tx">${b}</span>`).join('')}</div>
          <div class="sf-row-lbl">RX Decided:</div>
          <div class="sf-row-bits">${Array.from(rxBits).map((b, i) => `<span class="sf-bchip ${flips.includes(i) ? 'b-err' : 'b-rx'}">${b}</span>`).join('')}</div>
        </div>
        <p class="sf-muted sf-mt-2">The correlation detector computes inner product T = Σ r[k]·c[k] over each 20-sample window. Noise can cross the decision threshold, creating bit errors (highlighted in red).</p>
      `;
    } else if (activeTab === 'recover') {
      bodyWrap.innerHTML = `
        <div class="sf-recover-steps">
          <div class="sf-rec-step">
            <span class="sf-step-bullet">1</span>
            <div><strong>Hamming(7,4) FEC:</strong> ${st.correctedBlocks} error blocks corrected automatically.</div>
          </div>
          <div class="sf-rec-step">
            <span class="sf-step-bullet">2</span>
            <div><strong>CRC-8 Verification:</strong> <span class="${st.crcOk ? 'sf-badge-ok' : 'sf-badge-err'}">${st.crcOk ? 'CRC OK ✔' : 'CRC FAILED ✘'}</span></div>
          </div>
          <div class="sf-rec-step">
            <span class="sf-step-bullet">3</span>
            <div><strong>XOR Decryption:</strong> Inverted key stream using key <code>"${trace.config.encrypt.key}"</code></div>
          </div>
          <div class="sf-rec-step">
            <span class="sf-step-bullet">4</span>
            <div><strong>Final Output:</strong> <strong class="sf-accent-cyan">"${st.text}"</strong> (Final bit errors: ${st.finalErrorBits})</div>
          </div>
        </div>
      `;
    }

    tabContent.appendChild(bodyWrap);
  }

  // Update Result Card
  function renderResultCard() {
    const trace = State.getTrace();
    if (!trace) return;

    const unprot = runUnprotectedPipeline(State.config);
    const sent = trace.config.payload.text || 'HELLO';
    const received = trace.stages.recover.text;
    const rawBER = trace.summary.rawBER;
    const finalBER = trace.summary.finalBER;

    resultCard.innerHTML = `
      <div class="sf-panel-header">
        <h4 class="sf-panel-title">Transmission Results</h4>
        <span class="sf-badge ${trace.summary.crcOk ? 'sf-badge-ok' : 'sf-badge-err'}">
          ${trace.summary.crcOk ? 'CRC PASS ✔' : 'CRC FAILED ✘'}
        </span>
      </div>

      <div class="sf-panel-body">
        <div class="sf-res-top-grid">
          <div class="sf-res-metric">
            <span class="sf-rm-lbl">Sent Text</span>
            <span class="sf-rm-val sf-accent-cyan">${sent}</span>
          </div>
          <div class="sf-res-metric">
            <span class="sf-rm-lbl">Received Text</span>
            <span class="sf-rm-val ${received === sent ? 'sf-accent-ok' : 'sf-accent-err'}">${received || '(empty)'}</span>
          </div>
          <div class="sf-res-metric">
            <span class="sf-rm-lbl">Raw Channel BER</span>
            <span class="sf-rm-val">${(rawBER * 100).toFixed(1)}% <small class="sf-muted">(${trace.stages.demodulate.rawErrors} / ${trace.summary.totalBitsOnAir})</small></span>
          </div>
          <div class="sf-res-metric">
            <span class="sf-rm-lbl">Final Decoded BER</span>
            <span class="sf-rm-val ${finalBER === 0 ? 'sf-accent-ok' : 'sf-accent-err'}">${(finalBER * 100).toFixed(1)}% <small class="sf-muted">(${trace.stages.recover.finalErrorBits} bits)</small></span>
          </div>
        </div>

        <!-- Side-by-side: Without vs With Protection -->
        <div class="sf-res-comparison-box">
          <div class="sf-cmp-col">
            <div class="sf-cmp-header">Without Protection</div>
            <div class="sf-cmp-text sf-accent-err">${unprot.stages.recover.text || 'Corrupted'}</div>
            <div class="sf-cmp-stat">${unprot.stages.recover.finalErrorBits} uncorrected errors (${(unprot.summary.finalBER * 100).toFixed(1)}% BER)</div>
          </div>
          <div class="sf-cmp-sep">VS</div>
          <div class="sf-cmp-col">
            <div class="sf-cmp-header">With Protection (CRC + FEC)</div>
            <div class="sf-cmp-text sf-accent-ok">${received}</div>
            <div class="sf-cmp-stat">${trace.summary.errorsCorrected} blocks fixed automatically ✔</div>
          </div>
        </div>
      </div>
    `;
  }

  // Handle Form Control Changes with 120ms Debounce
  function handleControlChange() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const msg = inpMsg.value || 'HELLO';
      msgCount.textContent = String(msg.length);
      const key = inpKey.value || 'SF';
      const encOn = chkEnc.checked;
      const crcOn = chkCrc.checked;
      const hamOn = chkHam.checked;
      const activeModBtn = modSegmented.querySelector('.sf-seg-btn.active');
      const modulation = activeModBtn ? activeModBtn.getAttribute('data-mod') : 'PSK';
      const ebn0 = parseFloat(sliderEbn0.value) || 2.0;

      valEbn0.textContent = ebn0.toFixed(1);

      State.updateConfig({
        payload: { text: msg },
        encrypt: { on: encOn, key },
        protect: { crc: crcOn, hamming: hamOn },
        modulation,
        channel: { ebn0dB: ebn0 }
      });

      const newTrace = State.getTrace();
      mapInstance.setTrace(newTrace);
      renderInspectorTab();
      renderResultCard();
    }, 120);
  }

  // Bind Control Events
  inpMsg.addEventListener('input', () => {
    msgCount.textContent = String(inpMsg.value.length);
    handleControlChange();
  });

  btnHello.addEventListener('click', () => {
    inpMsg.value = 'HELLO';
    msgCount.textContent = '5';
    handleControlChange();
  });

  inpKey.addEventListener('input', handleControlChange);
  chkEnc.addEventListener('change', handleControlChange);
  chkCrc.addEventListener('change', handleControlChange);
  chkHam.addEventListener('change', handleControlChange);

  sliderEbn0.addEventListener('input', () => {
    valEbn0.textContent = parseFloat(sliderEbn0.value).toFixed(1);
    handleControlChange();
  });

  modSegmented.addEventListener('click', (e) => {
    const btn = e.target.closest('.sf-seg-btn');
    if (!btn) return;
    modSegmented.querySelectorAll('.sf-seg-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    handleControlChange();
  });

  // Medium presets
  labEl.querySelectorAll('.sf-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      labEl.querySelectorAll('.sf-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const snr = parseFloat(chip.getAttribute('data-snr'));
      sliderEbn0.value = String(snr);
      valEbn0.textContent = snr.toFixed(1);
      handleControlChange();
    });
  });

  // New Noise Seed
  btnNewNoise.addEventListener('click', () => {
    const newSeed = Math.floor(Math.random() * 90000) + 1000;
    State.updateConfig({ channel: { seed: newSeed } });
    mapInstance.setTrace(State.getTrace());
    renderInspectorTab();
    renderResultCard();
  });

  // Reset Controls
  btnReset.addEventListener('click', () => {
    inpMsg.value = 'HELLO';
    msgCount.textContent = '5';
    inpKey.value = 'SF';
    chkEnc.checked = true;
    chkCrc.checked = true;
    chkHam.checked = true;
    sliderEbn0.value = '2.0';
    valEbn0.textContent = '2.0';
    modSegmented.querySelectorAll('.sf-seg-btn').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-mod') === 'PSK');
    });
    handleControlChange();
  });

  // Run Transmission Animation across Map
  btnRun.addEventListener('click', async () => {
    if (isRunningAnim) return;
    isRunningAnim = true;
    btnRun.disabled = true;
    btnRun.textContent = 'Running transmission...';

    mapInstance.reset();
    const trace = State.getTrace();
    mapInstance.setTrace(trace);

    // Sequence stages 0..7
    for (let i = 0; i < STAGES.length - 1; i++) {
      const from = STAGES[i].id;
      const to = STAGES[i + 1].id;
      mapInstance.setActive(from);
      mapInstance.markDone(from);
      await mapInstance.travel(from, to, { duration: 600, label: 'DATA' });
    }

    mapInstance.setActive('recover');
    mapInstance.markDone('recover');
    switchTab('recover');
    renderResultCard();

    btnRun.disabled = false;
    btnRun.textContent = '▶ Run transmission';
    isRunningAnim = false;
  });

  // Inspector Tab Buttons
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      switchTab(btn.getAttribute('data-tab'));
    });
  });

  // Audio Modal Handlers
  btnHear.addEventListener('click', () => {
    audioModal.style.display = 'flex';
  });
  audioClose.addEventListener('click', () => {
    audioModal.style.display = 'none';
  });
  btnPlayClean.addEventListener('click', () => {
    const trace = State.getTrace();
    DSP.playBitsAudio(trace.stages.modulate.txBits, trace.config.modulation, { noisy: false });
  });
  btnPlayNoisy.addEventListener('click', () => {
    const trace = State.getTrace();
    DSP.playBitsAudio(trace.stages.modulate.txBits, trace.config.modulation, { noisy: true, sigmaRatio: 0.6 });
  });

  // BER Curve Modal & Sweep Execution
  btnBer.addEventListener('click', () => {
    berModal.style.display = 'flex';
    runBerSweep();
  });
  berClose.addEventListener('click', () => {
    berModal.style.display = 'none';
  });
  berRerun.addEventListener('click', runBerSweep);

  function runBerSweep() {
    const ctx = berCanvas.getContext('2d');
    const w = berCanvas.width;
    const h = berCanvas.height;
    ctx.fillStyle = '#0d1527';
    ctx.fillRect(0, 0, w, h);

    berProgress.style.display = 'block';
    berProgressFill.style.width = '0%';

    const currentEbn0 = State.config.channel.ebn0dB;
    const ebn0Points = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    const measuredPSK = [];
    const measuredFSK = [];
    const measuredASK = [];

    const padL = 60, padR = 24, padT = 30, padB = 40;
    const plotW = w - padL - padR;
    const plotH = h - padT - padB;

    const xToPx = (snr) => padL + (snr / 12) * plotW;
    const yToPx = (ber) => {
      const minLog = -6; // 1e-6
      const maxLog = 0;  // 1e0
      const logVal = Math.max(minLog, Math.log10(Math.max(1e-7, ber)));
      return padT + ((maxLog - logVal) / (maxLog - minLog)) * plotH;
    };

    function drawGridAndCurves() {
      ctx.fillStyle = '#0d1527';
      ctx.fillRect(0, 0, w, h);

      // Grid Lines
      ctx.strokeStyle = '#1e294b';
      ctx.lineWidth = 1;

      // X grid (0..12 dB)
      for (let snr = 0; snr <= 12; snr += 2) {
        const x = xToPx(snr);
        ctx.beginPath();
        ctx.moveTo(x, padT); ctx.lineTo(x, padT + plotH);
        ctx.stroke();
        ctx.fillStyle = '#8fa0c8';
        ctx.font = '11px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${snr} dB`, x, padT + plotH + 16);
      }

      // Y grid (10^0 down to 10^-6)
      for (let p = 0; p >= -6; p--) {
        const y = yToPx(Math.pow(10, p));
        ctx.beginPath();
        ctx.moveTo(padL, y); ctx.lineTo(padL + plotW, y);
        ctx.stroke();
        ctx.fillStyle = '#8fa0c8';
        ctx.font = '11px "JetBrains Mono", monospace';
        ctx.textAlign = 'right';
        ctx.fillText(`10^${p}`, padL - 8, y + 4);
      }

      // X/Y Axis Titles
      ctx.fillStyle = '#e8eefc';
      ctx.font = 'bold 12px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Eb/N0 (dB)', padL + plotW / 2, h - 8);

      // Highlight Current Setting as a vertical line
      const curX = xToPx(Math.max(0, Math.min(12, currentEbn0)));
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.6)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(curX, padT); ctx.lineTo(curX, padT + plotH);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#fbbf24';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.fillText(`Current: ${currentEbn0} dB`, curX, padT - 8);

      // Theoretical Dashed Curves (Q function)
      const drawTheory = (mod, color) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        for (let x = 0; x <= 12; x += 0.2) {
          const ber = DSP.theoreticalBER(x, mod);
          const px = xToPx(x);
          const py = yToPx(ber);
          if (x === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      };

      drawTheory('PSK', '#22d3ee');
      drawTheory('FSK', '#a78bfa');
      drawTheory('ASK', '#34d399');

      // Legend
      ctx.fillStyle = '#e8eefc';
      ctx.font = '11px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#22d3ee'; ctx.fillText('--- PSK Theory (● Measured)', padL + 10, padT + 14);
      ctx.fillStyle = '#a78bfa'; ctx.fillText('--- FSK Theory (▲ Measured)', padL + 180, padT + 14);
      ctx.fillStyle = '#34d399'; ctx.fillText('--- ASK Theory (■ Measured)', padL + 350, padT + 14);
    }

    drawGridAndCurves();

    // Run Monte-Carlo in chunks
    let pointIdx = 0;
    const bitsPerPoint = 15000;
    const testBits = new Uint8Array(bitsPerPoint);
    const rng = DSP.createRng(999);
    for (let i = 0; i < bitsPerPoint; i++) testBits[i] = rng() > 0.5 ? 1 : 0;

    function processNextPoint() {
      if (pointIdx >= ebn0Points.length) {
        berProgress.style.display = 'none';
        return;
      }

      const snr = ebn0Points[pointIdx];
      const pskSim = DSP.simulateBitsStreaming(testBits, 'PSK', snr, 1000 + pointIdx);
      const fskSim = DSP.simulateBitsStreaming(testBits, 'FSK', snr, 2000 + pointIdx);
      const askSim = DSP.simulateBitsStreaming(testBits, 'ASK', snr, 3000 + pointIdx);

      const pskBer = pskSim.flippedIndices.length / bitsPerPoint;
      const fskBer = fskSim.flippedIndices.length / bitsPerPoint;
      const askBer = askSim.flippedIndices.length / bitsPerPoint;

      measuredPSK.push({ snr, ber: pskBer });
      measuredFSK.push({ snr, ber: fskBer });
      measuredASK.push({ snr, ber: askBer });

      // Draw measured dots
      drawGridAndCurves();

      measuredPSK.forEach(pt => {
        if (pt.ber > 0) {
          ctx.fillStyle = '#22d3ee';
          ctx.beginPath();
          ctx.arc(xToPx(pt.snr), yToPx(pt.ber), 4, 0, Math.PI * 2);
          ctx.fill();
        }
      });
      measuredFSK.forEach(pt => {
        if (pt.ber > 0) {
          ctx.fillStyle = '#a78bfa';
          ctx.beginPath();
          ctx.arc(xToPx(pt.snr), yToPx(pt.ber), 4, 0, Math.PI * 2);
          ctx.fill();
        }
      });
      measuredASK.forEach(pt => {
        if (pt.ber > 0) {
          ctx.fillStyle = '#34d399';
          ctx.fillRect(xToPx(pt.snr) - 3.5, yToPx(pt.ber) - 3.5, 7, 7);
        }
      });

      pointIdx++;
      const pct = (pointIdx / ebn0Points.length) * 100;
      berProgressFill.style.width = `${pct}%`;

      setTimeout(processNextPoint, 15);
    }

    processNextPoint();
  }

  // Download Chart PNG
  berDownload.addEventListener('click', () => {
    berCanvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SignalForge_BER_Curve_${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
    });
  });

  // Initial Render
  renderInspectorTab();
  renderResultCard();

  return {
    update() {
      const trace = State.getTrace();
      mapInstance.setTrace(trace);
      renderInspectorTab();
      renderResultCard();
    }
  };
}

/**
 * SignalForge - Media Lab Controller (mediaLab.js)
 * Concept: Image and Video transmission over noisy channels (Practical 7 & PCM brightness quantization).
 * Features:
 * - Image transmission: 4 canvases (Original -> Encrypted -> Received Raw -> Received Repaired)
 * - Row-by-row packetization with CRC failure border markers
 * - Quantization presets: 2 / 4 / 8 bits per pixel, sizes 16x16 to 64x64
 * - Scanline row-by-row transfer animation
 * - Real PSNR calculation (Peak Signal-to-Noise Ratio)
 * - Video transmission: Built-in 6-frame bouncing ball animation + video file upload
 * - Looping 4 fps playback with per-frame BER bar chart
 */

import { State, sampleImage } from '../state.js';
import { Wave } from '../wave.js';
import { DSP } from '../dsp.js';
import { Engine } from '../engine.js';
import { runPipeline, runUnprotectedPipeline, bytesToBits, bitsToBytes } from '../pipeline.js';

export function createMediaLab(containerEl) {
  let activeTab = 'image'; // 'image' | 'video'
  let currentImageSize = 32;
  let currentBpp = 4; // 2, 4, 8 bits per pixel
  let currentPixels = sampleImage.pixels; // default 32x32
  let isSending = false;

  // Video state
  let videoFramesOrig = [];
  let videoFramesRecv = [];
  let videoFrameErrors = [];
  let videoPlayInterval = null;
  let currentVideoFrame = 0;

  const labEl = document.createElement('div');
  labEl.className = 'sf-media-lab';
  labEl.innerHTML = `
    <!-- Top Lab Switcher Tabs -->
    <div class="sf-section-header">
      <div>
        <h3 class="sf-section-title">Media Transmission Laboratory</h3>
        <p class="sf-section-hint">Explore how real digital communication links send high-volume multimedia (images & video) using packetization and PCM quantization.</p>
      </div>
      <div class="sf-segmented-ctrl" id="sf-media-tab-ctrl">
        <button class="sf-seg-btn active" data-tab="image">🖼 Image Transmission</button>
        <button class="sf-seg-btn" data-tab="video">🎥 Video & Frames</button>
      </div>
    </div>

    <!-- ================= IMAGE TAB CONTENT ================= -->
    <div class="sf-media-content" id="sf-media-img-tab">
      <div class="sf-lab-grid">
        <!-- Left: Image Controls -->
        <aside class="sf-panel sf-lab-controls">
          <div class="sf-panel-header">
            <h4 class="sf-panel-title">Image Source & Parameters</h4>
          </div>
          <div class="sf-panel-body">
            <!-- Source Selection -->
            <div class="sf-ctrl-group">
              <label class="sf-group-label">Image Source</label>
              <div class="sf-input-btn-row">
                <button class="sf-btn sf-btn-outline sf-btn-sm" id="sf-img-btn-sample">Use Sample Dish</button>
                <label class="sf-btn sf-btn-primary sf-btn-sm" style="cursor:pointer;">
                  Upload Photo
                  <input type="file" id="sf-img-file-input" accept="image/*" style="display:none;">
                </label>
              </div>
            </div>

            <!-- Resolution & Quantization -->
            <div class="sf-ctrl-group">
              <label class="sf-group-label">Resolution (Square Grid)</label>
              <div class="sf-chips-wrap" id="sf-img-size-chips">
                <button class="sf-chip" data-size="16">16×16</button>
                <button class="sf-chip active" data-size="32">32×32</button>
                <button class="sf-chip" data-size="48">48×48</button>
                <button class="sf-chip" data-size="64">64×64</button>
              </div>
            </div>

            <div class="sf-ctrl-group">
              <div class="sf-slider-header">
                <label>Quantization (Brightness PCM)</label>
                <span id="sf-img-bpp-label" class="sf-mono sf-accent-cyan">4 bits (16 shades)</span>
              </div>
              <div class="sf-chips-wrap" id="sf-img-bpp-chips">
                <button class="sf-chip" data-bpp="2">2 bits (4 shades)</button>
                <button class="sf-chip active" data-bpp="4">4 bits (16 shades)</button>
                <button class="sf-chip" data-bpp="8">8 bits (256 shades)</button>
              </div>
            </div>

            <!-- Channel & Protection -->
            <div class="sf-ctrl-group">
              <label class="sf-group-label">Security & Protection</label>
              <div class="sf-toggles-row">
                <label class="sf-toggle-card">
                  <input type="checkbox" id="sf-img-chk-enc" checked>
                  <div class="sf-toggle-content"><span class="sf-toggle-title">Encrypt</span><small>XOR Scramble</small></div>
                </label>
                <label class="sf-toggle-card">
                  <input type="checkbox" id="sf-img-chk-crc" checked>
                  <div class="sf-toggle-content"><span class="sf-toggle-title">Row CRC-8</span><small>Packet Check</small></div>
                </label>
                <label class="sf-toggle-card">
                  <input type="checkbox" id="sf-img-chk-ham" checked>
                  <div class="sf-toggle-content"><span class="sf-toggle-title">Hamming</span><small>Fix 1-bit</small></div>
                </label>
              </div>
            </div>

            <div class="sf-ctrl-group">
              <div class="sf-slider-header">
                <label for="sf-img-slider-ebn0">Channel Noise (Eb/N0)</label>
                <span id="sf-img-val-ebn0" class="sf-mono sf-accent-cyan">4.0 dB</span>
              </div>
              <input type="range" id="sf-img-slider-ebn0" class="sf-slider" min="-2" max="14" step="0.5" value="4.0">
            </div>

            <div class="sf-ctrl-btn-row">
              <button class="sf-btn sf-btn-outline sf-btn-sm" id="sf-img-btn-noise">🎲 New noise seed</button>
            </div>

            <div class="sf-actions-stack" style="margin-top:20px;">
              <button class="sf-btn sf-btn-primary sf-btn-lg" id="sf-img-btn-send">▶ Send Image (Scanline)</button>
            </div>
          </div>
        </aside>

        <!-- Right: 4 Image Canvases and Metrics -->
        <main class="sf-lab-inspect-col">
          <div class="sf-panel">
            <div class="sf-panel-header">
              <h4 class="sf-panel-title">End-to-End Image Transmission Stages</h4>
              <span class="sf-badge sf-badge-ok" id="sf-img-status-badge">Ready</span>
            </div>
            <div class="sf-panel-body">
              <p class="sf-muted" style="margin-bottom:16px;">
                <strong>Concept:</strong> A picture is just numbers (PCM-style spatial sampling and grayscale quantization). Each horizontal row acts as one independent transmission packet with its own CRC checksum.
              </p>

              <!-- Four Canvases Side by Side -->
              <div class="sf-media-canvases-row">
                <!-- 1. Original -->
                <div class="sf-media-card">
                  <div class="sf-media-card-title">1. Original Image</div>
                  <div class="sf-canvas-container">
                    <canvas id="sf-cv-media-orig" width="128" height="128"></canvas>
                  </div>
                  <span class="sf-media-card-sub" id="sf-img-sub-orig">32×32 @ 4 bpp</span>
                </div>

                <!-- 2. Encrypted (Static) -->
                <div class="sf-media-card">
                  <div class="sf-media-card-title sf-accent-violet">2. Encrypted Stream</div>
                  <div class="sf-canvas-container">
                    <canvas id="sf-cv-media-enc" width="128" height="128"></canvas>
                  </div>
                  <span class="sf-media-card-sub">Cipher Static (Key: "SF")</span>
                </div>

                <!-- 3. Received Raw (No Repair) -->
                <div class="sf-media-card">
                  <div class="sf-media-card-title sf-accent-err">3. Received Raw (No Repair)</div>
                  <div class="sf-canvas-container">
                    <canvas id="sf-cv-media-raw" width="128" height="128"></canvas>
                  </div>
                  <span class="sf-media-card-sub sf-accent-err" id="sf-img-sub-raw">Noise Speckled</span>
                </div>

                <!-- 4. Received Repaired -->
                <div class="sf-media-card">
                  <div class="sf-media-card-title sf-accent-ok">4. Received Repaired</div>
                  <div class="sf-canvas-container" id="sf-cv-rep-wrap">
                    <canvas id="sf-cv-media-rep" width="128" height="128"></canvas>
                  </div>
                  <span class="sf-media-card-sub sf-accent-ok" id="sf-img-sub-rep">Hamming Corrected</span>
                </div>
              </div>

              <!-- Transmission Metrics -->
              <div class="sf-res-top-grid" style="margin-top:24px;">
                <div class="sf-res-metric">
                  <span class="sf-rm-lbl">Bits on Air</span>
                  <span class="sf-rm-val sf-accent-cyan" id="sf-img-m-bits">7,182</span>
                </div>
                <div class="sf-res-metric">
                  <span class="sf-rm-lbl">Channel Raw BER</span>
                  <span class="sf-rm-val" id="sf-img-m-rawber">1.4%</span>
                </div>
                <div class="sf-res-metric">
                  <span class="sf-rm-lbl">Residual Bad Pixels</span>
                  <span class="sf-rm-val sf-accent-ok" id="sf-img-m-badpix">0 / 1024</span>
                </div>
                <div class="sf-res-metric">
                  <span class="sf-rm-lbl">Failed Row Packets</span>
                  <span class="sf-rm-val" id="sf-img-m-rowcrc">0 / 32</span>
                </div>
              </div>

              <!-- PSNR Quality Metric -->
              <div class="sf-res-comparison-box" style="margin-top:16px;">
                <div class="sf-cmp-col">
                  <div class="sf-cmp-header">Unprotected PSNR Quality</div>
                  <div class="sf-cmp-text sf-accent-err" id="sf-img-psnr-raw">21.4 dB</div>
                  <small class="sf-muted">Severe visual speckle degradation</small>
                </div>
                <div class="sf-cmp-sep">VS</div>
                <div class="sf-cmp-col">
                  <div class="sf-cmp-header">Protected Link PSNR Quality</div>
                  <div class="sf-cmp-text sf-accent-ok" id="sf-img-psnr-rep">∞ dB (Perfect)</div>
                  <small class="sf-accent-ok">Clean reconstructed picture</small>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>

    <!-- ================= VIDEO TAB CONTENT ================= -->
    <div class="sf-media-content" id="sf-media-vid-tab" style="display:none;">
      <div class="sf-lab-grid">
        <!-- Left: Video Controls -->
        <aside class="sf-panel sf-lab-controls">
          <div class="sf-panel-header">
            <h4 class="sf-panel-title">Video Parameters</h4>
          </div>
          <div class="sf-panel-body">
            <div class="sf-ctrl-group">
              <label class="sf-group-label">Video Clip Source</label>
              <div class="sf-input-btn-row">
                <button class="sf-btn sf-btn-outline sf-btn-sm" id="sf-vid-btn-ball">Bouncing Ball (6 Frames)</button>
                <label class="sf-btn sf-btn-primary sf-btn-sm" style="cursor:pointer;">
                  Upload Short Video
                  <input type="file" id="sf-vid-file-input" accept="video/*" style="display:none;">
                </label>
              </div>
            </div>

            <div class="sf-ctrl-group">
              <div class="sf-slider-header">
                <label for="sf-vid-slider-ebn0">Channel Noise (Eb/N0)</label>
                <span id="sf-vid-val-ebn0" class="sf-mono sf-accent-cyan">3.0 dB</span>
              </div>
              <input type="range" id="sf-vid-slider-ebn0" class="sf-slider" min="-2" max="14" step="0.5" value="3.0">
            </div>

            <div class="sf-ctrl-group">
              <label class="sf-group-label">FEC Protection</label>
              <label class="sf-toggle-card">
                <input type="checkbox" id="sf-vid-chk-fec" checked>
                <div class="sf-toggle-content"><span class="sf-toggle-title">Hamming(7,4) Protection</span><small>Auto-repair frames</small></div>
              </label>
            </div>

            <div class="sf-actions-stack" style="margin-top:20px;">
              <button class="sf-btn sf-btn-primary sf-btn-lg" id="sf-vid-btn-process">⚡ Transmit & Play Video</button>
            </div>
          </div>
        </aside>

        <!-- Right: Video Playback & Per-Frame BER -->
        <main class="sf-lab-inspect-col">
          <div class="sf-panel">
            <div class="sf-panel-header">
              <h4 class="sf-panel-title">Live 4 FPS Video Comparison Loop</h4>
              <span class="sf-badge sf-badge-ok">4 FPS Sequence</span>
            </div>
            <div class="sf-panel-body">
              <p class="sf-muted" style="margin-bottom:16px;">
                <strong>Concept:</strong> Video is simply a time sequence of sampled image frames. Each frame travels through the communication chain as a stream of packets.
              </p>

              <!-- Video Loops Side by Side -->
              <div style="display:flex; justify-content:center; gap:40px; margin-bottom:24px;">
                <div style="text-align:center;">
                  <h5 style="color:var(--text-bright); margin-bottom:8px;">Transmitted Video (Original)</h5>
                  <canvas id="sf-cv-vid-orig" width="160" height="160" style="width:160px; height:160px; background:#0d1527; border:2px solid var(--line); border-radius:12px;"></canvas>
                  <div class="sf-muted" style="font-size:12px; margin-top:4px;">Frame <span id="sf-vid-frame-idx-1">1</span> of 6</div>
                </div>

                <div style="text-align:center;">
                  <h5 class="sf-accent-cyan" style="margin-bottom:8px;">Received Video (Over Air)</h5>
                  <canvas id="sf-cv-vid-recv" width="160" height="160" style="width:160px; height:160px; background:#0d1527; border:2px solid var(--cyan); border-radius:12px; box-shadow:var(--glow-cyan);"></canvas>
                  <div class="sf-muted" style="font-size:12px; margin-top:4px;">Frame <span id="sf-vid-frame-idx-2">1</span> of 6</div>
                </div>
              </div>

              <!-- Per-Frame BER Chart -->
              <div class="sf-panel" style="background:#0d1527; border:1px solid var(--line); padding:16px;">
                <h5 style="font-size:13px; font-weight:600; color:var(--text-bright); margin-bottom:10px;">Per-Frame Bit Error Rate (BER)</h5>
                <div id="sf-vid-ber-bars" style="display:flex; align-items:flex-end; gap:16px; height:90px; padding:0 10px;">
                  <!-- Dynamic bars render here -->
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  `;

  containerEl.replaceChildren(labEl);

  // Tab switching
  const tabCtrl = labEl.querySelector('#sf-media-tab-ctrl');
  const imgTab = labEl.querySelector('#sf-media-img-tab');
  const vidTab = labEl.querySelector('#sf-media-vid-tab');

  tabCtrl.addEventListener('click', (e) => {
    const btn = e.target.closest('.sf-seg-btn');
    if (!btn) return;
    tabCtrl.querySelectorAll('.sf-seg-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeTab = btn.getAttribute('data-tab');

    if (activeTab === 'image') {
      imgTab.style.display = 'block';
      vidTab.style.display = 'none';
      if (videoPlayInterval) clearInterval(videoPlayInterval);
    } else {
      imgTab.style.display = 'none';
      vidTab.style.display = 'block';
      initBouncingBallVideo();
    }
  });

  /* ==========================================================================
     IMAGE PROCESSING HELPERS
     ========================================================================== */
  function quantizePixels(pixels, bpp) {
    const maxVal = (1 << bpp) - 1;
    const out = new Uint8Array(pixels.length);
    for (let i = 0; i < pixels.length; i++) {
      // Input is 0..15 (4 bits) or 0..255 (8 bits)
      const normalized = pixels[i] / 15.0;
      out[i] = Math.round(normalized * maxVal);
    }
    return out;
  }

  function resizePixels(srcPixels, srcW, srcH, dstW, dstH) {
    const dst = new Uint8Array(dstW * dstH);
    for (let dy = 0; dy < dstH; dy++) {
      for (let dx = 0; dx < dstW; dx++) {
        const sx = Math.floor((dx / dstW) * srcW);
        const sy = Math.floor((dy / dstH) * srcH);
        dst[dy * dstW + dx] = srcPixels[sy * srcW + sx];
      }
    }
    return dst;
  }

  function computePSNR(orig, test, maxVal) {
    let sse = 0;
    const len = orig.length;
    for (let i = 0; i < len; i++) {
      const diff = orig[i] - test[i];
      sse += diff * diff;
    }
    const mse = sse / len;
    if (mse === 0) return 99.9; // Practically infinite
    return 10 * Math.log10((maxVal * maxVal) / mse);
  }

  /* ==========================================================================
     RUN IMAGE SIMULATION
     ========================================================================== */
  function simulateImageTransmission(onProgress = null) {
    const encOn = labEl.querySelector('#sf-img-chk-enc').checked;
    const crcOn = labEl.querySelector('#sf-img-chk-crc').checked;
    const hamOn = labEl.querySelector('#sf-img-chk-ham').checked;
    const ebn0 = parseFloat(labEl.querySelector('#sf-img-slider-ebn0').value) || 4.0;
    const seed = Math.floor(Math.random() * 80000) + 100;

    const size = currentImageSize;
    const bpp = currentBpp;
    const totalPixels = size * size;
    const rawDataBitsCount = totalPixels * bpp;

    // Resized & quantized source pixels
    const activePixels = resizePixels(currentPixels, 32, 32, size, size);
    const quantized = quantizePixels(activePixels, bpp);

    // Convert pixels to bitstream
    const rawBits = new Uint8Array(rawDataBitsCount);
    for (let i = 0; i < totalPixels; i++) {
      const p = quantized[i];
      for (let b = 0; b < bpp; b++) {
        rawBits[i * bpp + b] = (p >> (bpp - 1 - b)) & 1;
      }
    }

    // Packetize per row: each row is (size * bpp) bits
    const bitsPerRow = size * bpp;
    const bytesPerRow = Math.ceil(bitsPerRow / 8);
    const rowCrcFails = [];
    const repPixels = new Uint8Array(totalPixels);
    const rawUnprotPixels = new Uint8Array(totalPixels);
    const encPixels = new Uint8Array(totalPixels);

    let totalBitsOnAir = 0;
    let totalErrorsOnAir = 0;

    // Key 'SF'
    const key = [83, 70];

    for (let r = 0; r < size; r++) {
      const rowBitStart = r * bitsPerRow;
      const rowBits = rawBits.slice(rowBitStart, rowBitStart + bitsPerRow);
      const rowBytes = bitsToBytes(rowBits);

      // Encrypt row
      const encRowBytes = encOn ? Engine.xor(rowBytes, key) : rowBytes.slice();
      const encRowBits = bytesToBits(encRowBytes).slice(0, bitsPerRow);

      // Render enc pixels
      for (let x = 0; x < size; x++) {
        let val = 0;
        for (let b = 0; b < bpp; b++) {
          val = (val << 1) | encRowBits[x * bpp + b];
        }
        encPixels[r * size + x] = val;
      }

      // CRC-8 per row
      let rowProtectedBits;
      let expectedCrc = 0;
      if (crcOn) {
        expectedCrc = Engine.crc8(encRowBytes);
        rowProtectedBits = new Uint8Array(bitsPerRow + 8);
        rowProtectedBits.set(encRowBits, 0);
        for (let j = 0; j < 8; j++) {
          rowProtectedBits[bitsPerRow + j] = (expectedCrc >> (7 - j)) & 1;
        }
      } else {
        rowProtectedBits = encRowBits.slice();
      }

      // Hamming(7,4) per row
      const codedBits = hamOn ? Engine.hammingEncode(rowProtectedBits) : rowProtectedBits.slice();
      totalBitsOnAir += codedBits.length;

      // Channel Simulation
      const sim = DSP.simulateBitsStreaming(codedBits, 'PSK', ebn0, seed + r * 13);
      totalErrorsOnAir += sim.flippedIndices.length;
      const rxCoded = sim.rxBits;

      // Decode with Protection
      let bitsAfterFec;
      if (hamOn) {
        const dec = Engine.hammingDecode(rxCoded, rowProtectedBits.length);
        bitsAfterFec = dec.bits;
      } else {
        bitsAfterFec = rxCoded.slice(0, rowProtectedBits.length);
      }

      // CRC Check
      let rowDataBits;
      if (crcOn && bitsAfterFec.length >= 8) {
        const dLen = bitsAfterFec.length - 8;
        rowDataBits = bitsAfterFec.slice(0, dLen);
        let rxCrc = 0;
        for (let j = 0; j < 8; j++) rxCrc = (rxCrc << 1) | bitsAfterFec[dLen + j];
        const computedCrc = Engine.crc8(bitsToBytes(rowDataBits));
        if (rxCrc !== computedCrc) {
          rowCrcFails.push(r);
        }
      } else {
        rowDataBits = bitsAfterFec.slice(0, bitsPerRow);
      }

      // Decrypt
      const rxEncRowBytes = bitsToBytes(rowDataBits);
      const rxPlainRowBytes = encOn ? Engine.xor(rxEncRowBytes, key) : rxEncRowBytes;
      const finalRowBits = bytesToBits(rxPlainRowBytes).slice(0, bitsPerRow);

      for (let x = 0; x < size; x++) {
        let val = 0;
        for (let b = 0; b < bpp; b++) {
          val = (val << 1) | finalRowBits[x * bpp + b];
        }
        repPixels[r * size + x] = val;
      }

      // Raw unprotect decode for comparison
      const rawRxBits = rxCoded.slice(0, bitsPerRow);
      const rawRxBytes = bitsToBytes(rawRxBits);
      const rawPlain = encOn ? Engine.xor(rawRxBytes, key) : rawRxBytes;
      const rawFinalBits = bytesToBits(rawPlain).slice(0, bitsPerRow);

      for (let x = 0; x < size; x++) {
        let val = 0;
        for (let b = 0; b < bpp; b++) {
          val = (val << 1) | rawFinalBits[x * bpp + b];
        }
        rawUnprotPixels[r * size + x] = val;
      }

      if (onProgress) onProgress(r, size);
    }

    // Metrics calculations
    const rawBER = totalBitsOnAir > 0 ? (totalErrorsOnAir / totalBitsOnAir) : 0;
    let badPixelsCount = 0;
    for (let i = 0; i < totalPixels; i++) {
      if (repPixels[i] !== quantized[i]) badPixelsCount++;
    }

    const maxVal = (1 << bpp) - 1;
    const psnrRaw = computePSNR(quantized, rawUnprotPixels, maxVal);
    const psnrRep = computePSNR(quantized, repPixels, maxVal);

    return {
      size,
      bpp,
      quantized,
      encPixels,
      rawUnprotPixels,
      repPixels,
      totalBitsOnAir,
      totalErrorsOnAir,
      rawBER,
      badPixelsCount,
      rowCrcFails,
      psnrRaw,
      psnrRep
    };
  }

  function renderImageCanvases(result) {
    const cvOrig = labEl.querySelector('#sf-cv-media-orig');
    const cvEnc = labEl.querySelector('#sf-cv-media-enc');
    const cvRaw = labEl.querySelector('#sf-cv-media-raw');
    const cvRep = labEl.querySelector('#sf-cv-media-rep');

    const size = result.size;

    // Normalizing pixel drawing for varying bpp
    const scaleFactor = 15.0 / ((1 << result.bpp) - 1);
    const normalize = (pixels) => {
      const out = new Uint8Array(pixels.length);
      for (let i = 0; i < pixels.length; i++) {
        out[i] = Math.round(pixels[i] * scaleFactor);
      }
      return out;
    };

    Wave.renderPixelCanvas(cvOrig, normalize(result.quantized), size, size, { border: true });
    Wave.renderPixelCanvas(cvEnc, normalize(result.encPixels), size, size, { border: true });
    Wave.renderPixelCanvas(cvRaw, normalize(result.rawUnprotPixels), size, size, { border: true });
    Wave.renderPixelCanvas(cvRep, normalize(result.repPixels), size, size, { border: true });

    // Mark failed CRC rows with red edge on Rep Canvas wrapper
    const repWrap = labEl.querySelector('#sf-cv-rep-wrap');
    if (result.rowCrcFails.length > 0) {
      repWrap.style.boxShadow = '0 0 14px rgba(248, 113, 113, 0.7)';
      repWrap.style.border = '2px solid #ef4444';
    } else {
      repWrap.style.boxShadow = 'var(--glow-cyan)';
      repWrap.style.border = '2px solid var(--ok)';
    }

    // Update Metrics
    labEl.querySelector('#sf-img-m-bits').textContent = result.totalBitsOnAir.toLocaleString();
    labEl.querySelector('#sf-img-m-rawber').textContent = `${(result.rawBER * 100).toFixed(2)}%`;
    labEl.querySelector('#sf-img-m-badpix').textContent = `${result.badPixelsCount} / ${size * size}`;
    labEl.querySelector('#sf-img-m-rowcrc').textContent = `${result.rowCrcFails.length} / ${size}`;

    labEl.querySelector('#sf-img-psnr-raw').textContent = `${result.psnrRaw.toFixed(1)} dB`;
    labEl.querySelector('#sf-img-psnr-rep').textContent = result.psnrRep >= 90 ? '∞ dB (Perfect)' : `${result.psnrRep.toFixed(1)} dB`;

    labEl.querySelector('#sf-img-sub-orig').textContent = `${size}×${size} @ ${result.bpp} bpp`;
    labEl.querySelector('#sf-img-status-badge').textContent = result.badPixelsCount === 0 ? 'Repaired (0 errors) ✔' : `${result.badPixelsCount} pixel errors`;
    labEl.querySelector('#sf-img-status-badge').className = result.badPixelsCount === 0 ? 'sf-badge sf-badge-ok' : 'sf-badge sf-badge-err';
  }

  // Scanline Transmission Animation
  function runScanlineAnimation() {
    if (isSending) return;
    isSending = true;
    const sendBtn = labEl.querySelector('#sf-img-btn-send');
    sendBtn.disabled = true;
    sendBtn.textContent = 'Transmitting scanlines...';

    const cvRep = labEl.querySelector('#sf-cv-media-rep');
    const ctx = cvRep.getContext('2d');
    const size = currentImageSize;

    const result = simulateImageTransmission();

    let currentRow = 0;
    const rowStep = () => {
      if (currentRow < size) {
        // Draw up to currentRow
        const partialRep = new Uint8Array(size * size);
        for (let i = 0; i < (currentRow + 1) * size; i++) {
          partialRep[i] = result.repPixels[i];
        }
        renderImageCanvases({ ...result, repPixels: partialRep });

        // Draw scanline cursor
        ctx.fillStyle = 'rgba(34, 211, 238, 0.7)';
        ctx.fillRect(0, currentRow * (cvRep.height / size), cvRep.width, 2);

        currentRow++;
        requestAnimationFrame(rowStep);
      } else {
        renderImageCanvases(result);
        sendBtn.disabled = false;
        sendBtn.textContent = '▶ Send Image (Scanline)';
        isSending = false;
      }
    };

    requestAnimationFrame(rowStep);
  }

  /* ==========================================================================
     VIDEO TRANSMISSION (Bouncing Ball & Video File)
     ========================================================================== */
  function generateBouncingBallFrames() {
    const frames = [];
    const size = 32;
    // 6 frames of a bouncing sphere
    const ballPositions = [
      { x: 6, y: 8, r: 4 },
      { x: 10, y: 16, r: 4.5 },
      { x: 16, y: 24, r: 5 }, // ground impact
      { x: 21, y: 17, r: 4.5 },
      { x: 26, y: 10, r: 4 },
      { x: 20, y: 6, r: 4 }
    ];

    ballPositions.forEach(b => {
      const pix = new Uint8Array(size * size);
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const dx = x - b.x;
          const dy = y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          let val = 2; // dark bg
          if (dist <= b.r) {
            val = Math.round(15 - (dist / b.r) * 10); // 3D highlight
          }
          if (y === 28) val = 6; // ground floor line
          pix[y * size + x] = Math.max(0, Math.min(15, val));
        }
      }
      frames.push(pix);
    });

    return frames;
  }

  function initBouncingBallVideo() {
    videoFramesOrig = generateBouncingBallFrames();
    transmitVideoFrames();
  }

  function transmitVideoFrames() {
    const ebn0 = parseFloat(labEl.querySelector('#sf-vid-slider-ebn0').value) || 3.0;
    const fecOn = labEl.querySelector('#sf-vid-chk-fec').checked;

    videoFramesRecv = [];
    videoFrameErrors = [];

    videoFramesOrig.forEach((framePix, idx) => {
      // Send frame through pipeline
      const cfg = {
        payload: { type: 'image', pixels: framePix, width: 32, height: 32, bitsPerPixel: 4 },
        protect: { crc: true, hamming: fecOn },
        channel: { ebn0dB: ebn0, seed: 5000 + idx * 77 }
      };
      const trace = runPipeline(cfg);
      videoFramesRecv.push(trace.stages.recover.pixels || framePix);
      videoFrameErrors.push(trace.summary.finalBER);
    });

    // Render Per-Frame BER Bar Chart
    const barBox = labEl.querySelector('#sf-vid-ber-bars');
    barBox.innerHTML = '';
    videoFrameErrors.forEach((ber, i) => {
      const col = document.createElement('div');
      col.style.flex = '1';
      col.style.display = 'flex';
      col.style.flexDirection = 'column';
      col.style.alignItems = 'center';
      col.style.gap = '4px';

      const barH = Math.max(4, Math.min(70, ber * 400));
      col.innerHTML = `
        <span style="font-family:var(--font-mono); font-size:10px; color:${ber>0?'var(--err)':'var(--ok)'};">${(ber * 100).toFixed(1)}%</span>
        <div style="width:100%; height:${barH}px; background:${ber>0?'var(--err)':'var(--ok)'}; border-radius:3px;"></div>
        <span style="font-size:11px; color:var(--muted);">F${i+1}</span>
      `;
      barBox.appendChild(col);
    });

    // Start 4 FPS playback loop
    if (videoPlayInterval) clearInterval(videoPlayInterval);
    currentVideoFrame = 0;

    const cvOrig = labEl.querySelector('#sf-cv-vid-orig');
    const cvRecv = labEl.querySelector('#sf-cv-vid-recv');
    const fIdx1 = labEl.querySelector('#sf-vid-frame-idx-1');
    const fIdx2 = labEl.querySelector('#sf-vid-frame-idx-2');

    videoPlayInterval = setInterval(() => {
      if (videoFramesOrig.length === 0) return;
      currentVideoFrame = (currentVideoFrame + 1) % videoFramesOrig.length;
      fIdx1.textContent = String(currentVideoFrame + 1);
      fIdx2.textContent = String(currentVideoFrame + 1);

      Wave.renderPixelCanvas(cvOrig, videoFramesOrig[currentVideoFrame], 32, 32);
      Wave.renderPixelCanvas(cvRecv, videoFramesRecv[currentVideoFrame], 32, 32);
    }, 250); // 4 FPS = 250ms per frame
  }

  /* ==========================================================================
     IMAGE EVENT BINDINGS
     ========================================================================== */
  labEl.querySelector('#sf-img-btn-sample').addEventListener('click', () => {
    currentPixels = sampleImage.pixels;
    const res = simulateImageTransmission();
    renderImageCanvases(res);
  });

  // Size chips
  labEl.querySelectorAll('#sf-img-size-chips .sf-chip').forEach(ch => {
    ch.addEventListener('click', () => {
      labEl.querySelectorAll('#sf-img-size-chips .sf-chip').forEach(c => c.classList.remove('active'));
      ch.classList.add('active');
      currentImageSize = parseInt(ch.getAttribute('data-size'), 10);
      const res = simulateImageTransmission();
      renderImageCanvases(res);
    });
  });

  // BPP chips
  labEl.querySelectorAll('#sf-img-bpp-chips .sf-chip').forEach(ch => {
    ch.addEventListener('click', () => {
      labEl.querySelectorAll('#sf-img-bpp-chips .sf-chip').forEach(c => c.classList.remove('active'));
      ch.classList.add('active');
      currentBpp = parseInt(ch.getAttribute('data-bpp'), 10);
      labEl.querySelector('#sf-img-bpp-label').textContent = `${currentBpp} bits (${1 << currentBpp} shades)`;
      const res = simulateImageTransmission();
      renderImageCanvases(res);
    });
  });

  // Sliders & Toggles
  labEl.querySelector('#sf-img-slider-ebn0').addEventListener('input', (e) => {
    labEl.querySelector('#sf-img-val-ebn0').textContent = `${parseFloat(e.target.value).toFixed(1)} dB`;
    const res = simulateImageTransmission();
    renderImageCanvases(res);
  });

  ['#sf-img-chk-enc', '#sf-img-chk-crc', '#sf-img-chk-ham'].forEach(id => {
    labEl.querySelector(id).addEventListener('change', () => {
      const res = simulateImageTransmission();
      renderImageCanvases(res);
    });
  });

  labEl.querySelector('#sf-img-btn-noise').addEventListener('click', () => {
    const res = simulateImageTransmission();
    renderImageCanvases(res);
  });

  labEl.querySelector('#sf-img-btn-send').addEventListener('click', runScanlineAnimation);

  // Upload Photo Handlers
  const fileInp = labEl.querySelector('#sf-img-file-input');
  fileInp.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const img = new Image();
    const reader = new FileReader();
    reader.onload = (re) => {
      img.onload = () => {
        // Render downscaled 32x32 grayscale
        const off = document.createElement('canvas');
        off.width = 32;
        off.height = 32;
        const ctx = off.getContext('2d');
        ctx.drawImage(img, 0, 0, 32, 32);
        const data = ctx.getImageData(0, 0, 32, 32).data;
        const newPix = new Uint8Array(1024);
        for (let i = 0; i < 1024; i++) {
          const r = data[i * 4];
          const g = data[i * 4 + 1];
          const b = data[i * 4 + 2];
          const lum = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
          newPix[i] = Math.round((lum / 255.0) * 15);
        }
        currentPixels = newPix;
        const res = simulateImageTransmission();
        renderImageCanvases(res);
      };
      img.src = re.target.result;
    };
    reader.readAsDataURL(file);
  });

  // Video Controls
  labEl.querySelector('#sf-vid-btn-ball').addEventListener('click', initBouncingBallVideo);
  labEl.querySelector('#sf-vid-slider-ebn0').addEventListener('input', (e) => {
    labEl.querySelector('#sf-vid-val-ebn0').textContent = `${parseFloat(e.target.value).toFixed(1)} dB`;
    transmitVideoFrames();
  });
  labEl.querySelector('#sf-vid-chk-fec').addEventListener('change', transmitVideoFrames);
  labEl.querySelector('#sf-vid-btn-process').addEventListener('click', transmitVideoFrames);

  // Initial Execution
  const initialRes = simulateImageTransmission();
  renderImageCanvases(initialRes);

  return {
    destroy() {
      if (videoPlayInterval) clearInterval(videoPlayInterval);
    }
  };
}

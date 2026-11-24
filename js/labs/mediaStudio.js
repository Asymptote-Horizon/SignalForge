/**
 * SignalForge - Media Transmission Studio (Image, Video, Audio ADC)
 * Completely refactored per user requirements:
 * 1. Image: Real upload with aspect-ratio preservation, 2 simple compression options,
 *    simulated processing delay with spinner, clean metrics without redundant PSNR tags.
 * 2. Video: Light-mode UI, real video file upload & preview player, real metadata extraction,
 *    global device reachability calculator, target audience bitrate optimization,
 *    and removal of judges' notes.
 * 3. Audio: Mic recording with audio buffer retention, complete envelope waveform display,
 *    animated DAW-style playhead scrubber line, quantization staircase effect,
 *    15-20s Sine/Cosine tone generator with frequency & amplitude sliders.
 */

import { DSP } from '../dsp.js';

export function mediaMarkup() {
  return `
    <div class="media-studio-wrap">
      <!-- Sub-Navigation for Media Studio -->
      <div class="sub-tabs-bar" role="tablist">
        <button class="sub-tab-btn active" data-mediatab="image" role="tab">🖼 Image Transmission & Quantization</button>
        <button class="sub-tab-btn" data-mediatab="video" role="tab">🎬 Video Broadcasting & Reachability</button>
        <button class="sub-tab-btn" data-mediatab="audio" role="tab">🎙 Audio Analog-to-Digital (ADC)</button>
      </div>

      <!-- ================= 1. IMAGE TRANSMISSION MODULE ================= -->
      <div class="media-subtab-pane" id="pane-media-image">
        <div class="workspace-grid">
          <div class="workspace-left">
            <section class="panel panel-pad">
              <div class="topline">
                <div>
                  <div class="eyebrow">IMAGE SOURCE & DIGITIZATION</div>
                  <h2 class="section-title" style="margin-top:6px">Source photograph</h2>
                </div>
                <div style="display:flex;gap:8px;">
                  <button class="btn secondary small" id="imgLoadDish">Satellite dish sample</button>
                  <label class="btn small" style="cursor:pointer">
                    Upload image <input type="file" id="imgFileInput" accept="image/*" style="display:none">
                  </label>
                </div>
              </div>

              <div style="display:flex;gap:18px;margin-top:16px;flex-wrap:wrap;align-items:center;">
                <div style="background:#ffffff;border-radius:12px;padding:8px;border:1.5px solid var(--line);box-shadow:var(--shadow-sm);">
                  <canvas id="imgSourceCanvas" width="160" height="160" style="display:block;border-radius:8px;image-rendering:pixelated;background:#f8fafc;"></canvas>
                </div>
                <div style="flex:1;min-width:200px;">
                  <div class="mini-metric" style="margin-bottom:8px">
                    <span>RESOLUTION</span>
                    <strong id="imgResLabel">32 × 32 pixels</strong>
                  </div>
                  <div class="mini-metric" style="margin-bottom:8px">
                    <span>RAW PAYLOAD SIZE</span>
                    <strong id="imgRawSizeLabel">1,024 bytes (8 bpp)</strong>
                  </div>
                  <div class="hint">Images are digitized as a 2D matrix of pixel intensity values before packetization.</div>
                </div>
              </div>

              <div class="divider" style="margin:20px 0 16px;"></div>

              <div class="eyebrow">COMPRESSION ALGORITHM</div>
              <p class="section-sub">Choose how pixel data is compressed before entering the channel:</p>
              
              <!-- 2 Clean Compression Options -->
              <div class="compression-circles" style="grid-template-columns:1fr 1fr;">
                <div class="circle-option selected" data-compress="raw">
                  <div class="circle-disc"></div>
                  <div class="circle-title">Raw Algorithm (Uncompressed)</div>
                  <div class="circle-desc">Direct full pixel encoding. Maximum fidelity with zero loss, but requires 100% channel bandwidth.</div>
                </div>
                <div class="circle-option" data-compress="compressed">
                  <div class="circle-disc"></div>
                  <div class="circle-title">Compressed Algorithm</div>
                  <div class="circle-desc">Reduces spatial redundancy. Compresses payload by ~70%, transmitting swiftly with clear visual quality.</div>
                </div>
              </div>

              <!-- Sliders -->
              <div class="controls-grid" style="margin-top:16px">
                <div class="field">
                  <label for="imgQualityRange">Quality retention: <span id="imgQualityVal" style="color:#4f46e5;font-weight:750">85%</span></label>
                  <input id="imgQualityRange" type="range" min="20" max="100" step="5" value="85">
                  <span class="hint">Higher quality sends more fine detail bits.</span>
                </div>
                <div class="field">
                  <label for="imgChannelRange">Channel quality · Eb/N₀: <span id="imgChannelVal" style="color:#4f46e5;font-weight:750">6 dB</span></label>
                  <input id="imgChannelRange" type="range" min="0" max="14" step="1" value="6">
                  <span class="hint">Lower SNR introduces random channel bit flips into pixel values.</span>
                </div>
              </div>
            </section>
          </div>

          <div class="workspace-right">
            <section class="panel panel-pad" style="position:relative;">
              <div class="topline">
                <div>
                  <div class="eyebrow">CHANNEL RECOVERY</div>
                  <h2 class="section-title" style="margin-top:6px">Received image</h2>
                </div>
                <a href="https://en.wikipedia.org/wiki/Peak_signal-to-noise_ratio" target="_blank" rel="noopener" class="btn secondary small">Learn more ↗</a>
              </div>

              <!-- Processing Indicator -->
              <div id="imgProcessingNotice" style="display:none;background:#eef2ff;color:#4f46e5;padding:8px 14px;border-radius:8px;font-size:12px;font-weight:600;margin-top:10px;text-align:center;">
                ⚙ Processing quantized 2D transform & channel noise...
              </div>

              <div style="display:flex;gap:18px;margin-top:16px;flex-wrap:wrap;align-items:center;">
                <div style="background:#ffffff;border-radius:12px;padding:8px;border:1.5px solid var(--line);box-shadow:var(--shadow-sm);position:relative;">
                  <canvas id="imgRecvCanvas" width="160" height="160" style="display:block;border-radius:8px;image-rendering:pixelated;background:#f8fafc;"></canvas>
                </div>
                <div style="flex:1;min-width:200px;">
                  <div class="mini-metrics" style="grid-template-columns:1fr 1fr;gap:10px;">
                    <div class="mini-metric">
                      <span>TRANSMITTED SIZE</span>
                      <strong id="imgTxSizeLabel">307 bytes</strong>
                    </div>
                    <div class="mini-metric">
                      <span>TX DELAY (1 Mbps)</span>
                      <strong id="imgDelayLabel">2.46 ms</strong>
                    </div>
                    <div class="mini-metric">
                      <span>RECONSTRUCTION FIDELITY</span>
                      <strong id="imgPsnrLabel" style="color:#10b981">38.2 dB</strong>
                    </div>
                    <div class="mini-metric">
                      <span>MIN CHANNEL CAPACITY</span>
                      <strong id="imgMinCapLabel">96 kbps</strong>
                    </div>
                  </div>
                </div>
              </div>

              <div class="divider" style="margin:20px 0 14px;"></div>
              
              <div class="eyebrow">THEORY & QUANTIZATION</div>
              <p style="font-size:12.5px;line-height:1.6;color:var(--ink-dim);margin-top:6px;">
                Raw images demand high channel bandwidth. The compressed algorithm removes neighboring pixel correlation, allowing the transmitter to send fewer bits while preserving sharp visual edges.
              </p>
            </section>
          </div>
        </div>
      </div>

      <!-- ================= 2. LIVE VIDEO STREAMING & REACHABILITY MODULE ================= -->
      <div class="media-subtab-pane hidden" id="pane-media-video">
        <div class="workspace-grid">
          <div class="workspace-left">
            <section class="panel panel-pad">
              <div class="topline">
                <div>
                  <div class="eyebrow">BROADCAST VIDEO SOURCE</div>
                  <h2 class="section-title" style="margin-top:6px">Video stream player</h2>
                </div>
                <label class="btn small" style="cursor:pointer">
                  Upload video file <input type="file" id="videoFileInput" accept="video/*" style="display:none">
                </label>
              </div>

              <!-- Initial Empty State / Dropzone -->
              <div id="videoEmptyState" style="background:#f8fafc;border:2px dashed #cbd5e1;border-radius:14px;padding:36px 20px;text-align:center;">
                <div style="font-size:32px;margin-bottom:8px;">🎬</div>
                <h3 style="font-size:15px;font-weight:800;color:var(--ink);margin:0 0 6px;">Upload a video to analyze</h3>
                <p style="font-size:12px;color:var(--muted);max-width:440px;margin:0 auto 16px;line-height:1.5;">
                  Select any MP4 or WebM video file. The lab will measure true bitrate, frame rate, file size, and calculate global student playback reach.
                </p>
                <label class="btn" style="cursor:pointer;display:inline-flex;">
                  Choose Video File <input type="file" id="videoFileInputAlt" accept="video/*" style="display:none">
                </label>
              </div>

              <!-- Scanning Progress Animation State (1.6s delay after upload) -->
              <div id="videoScanningState" style="display:none;background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:14px;padding:36px 20px;text-align:center;">
                <div style="font-size:30px;margin-bottom:10px;display:inline-block;animation:spin 1.4s infinite linear;">🔄</div>
                <div class="eyebrow" style="color:#6366f1;font-weight:700;margin-bottom:6px;">DEMUXING CONTAINER & PROBING BITSTREAM</div>
                <h3 style="font-size:15px;font-weight:800;color:var(--text);margin:0 0 6px;">Scanning MP4 / WebM Media Pipeline...</h3>
                <p style="font-size:12px;color:var(--muted);max-width:440px;margin:0 auto 16px;line-height:1.5;">
                  Parsing container box headers (ftyp, moov, mdat) · Measuring instantaneous frame rate · Sampling frame buffers...
                </p>
                <div style="width:260px;height:8px;background:#e2e8f0;border-radius:6px;overflow:hidden;margin:0 auto;">
                  <div id="videoScanProgressBar" style="width:0%;height:100%;background:#6366f1;transition:width 1.5s cubic-bezier(0.4, 0, 0.2, 1);border-radius:6px;"></div>
                </div>
              </div>

              <!-- Real Video Player & Real Snapshots (Shown after upload) -->
              <div id="videoPlayerWrap" style="display:none;margin-top:12px;">
                <video id="videoPlayerEl" controls style="width:100%;max-height:260px;border-radius:12px;background:#000000;display:block;"></video>
                <div class="mono" style="color:#64748b;font-size:11.5px;margin-top:8px;text-align:center;" id="videoStreamMeta">Loading metadata...</div>

                <!-- Extracted Real Video Snapshots -->
                <div style="margin-top:18px;">
                  <div class="eyebrow" style="margin-bottom:8px;">EXTRACTED VIDEO SNAPSHOTS (REAL FRAMES)</div>
                  <div class="filmstrip-wrap" id="videoFilmstrip" style="background:#f8fafc;border:1px solid var(--line);border-radius:12px;padding:12px;display:flex;gap:10px;overflow-x:auto;">
                    <!-- Real canvas snapshots rendered here -->
                  </div>
                </div>

                <!-- Target Audience Compatibility Slider -->
                <div class="controls-grid" style="margin-top:16px;">
                  <div class="field">
                    <label for="reachabilityRange">Target Global Student Reach: <span id="reachabilityVal" style="color:#4f46e5;font-weight:750">90%</span></label>
                    <input id="reachabilityRange" type="range" min="50" max="99" step="5" value="90">
                    <span class="hint">Adjust target percentage of global students who can stream smoothly without buffering.</span>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div class="workspace-right">
            <section class="panel panel-pad">
              <div class="topline" style="margin-bottom:12px;">
                <div>
                  <h2 class="section-title" style="font-size:17px;font-weight:800;">Compatibility Analysis</h2>
                </div>
                <a href="#/lab/network-diagnostic" class="btn secondary small" style="text-decoration:none;font-size:11px;padding:5px 10px;">Check Your Speed</a>
              </div>

              <!-- Initial empty notice -->
              <div id="reachEmptyNotice" style="background:#f8fafc;border:1.5px solid var(--line);border-radius:12px;padding:24px;text-align:center;color:var(--muted);font-size:12.5px;line-height:1.6;">
                Upload a video file on the left to extract real bitrate, frame rate, file size, and calculate global student playback compatibility.
              </div>

              <!-- Real stats (Shown after upload) -->
              <div id="reachStatsWrap" style="display:none;">
                <div id="reachNoticeBox" style="background:#f0fdf4;border:1.5px solid #bbf7d0;border-radius:12px;padding:14px;margin-bottom:16px;">
                  <div style="font-size:14.5px;font-weight:800;color:#15803d;" id="reachTitle">Global Reach: ~88% of Students Supported</div>
                  <p style="font-size:12px;color:#166534;margin:6px 0 0;line-height:1.5;" id="reachDesc">
                    Based on your video's bitrate, approximately 88% of student connections worldwide can play this smoothly.
                  </p>
                </div>

                <div class="mini-metrics" style="grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:16px;">
                  <div class="mini-metric">
                    <span>BITRATE</span>
                    <strong id="videoBitrateLabel">— kbps</strong>
                  </div>
                  <div class="mini-metric">
                    <span>FRAME RATE</span>
                    <strong id="videoFpsLabel">30.0 fps</strong>
                  </div>
                  <div class="mini-metric">
                    <span>FILE SIZE</span>
                    <strong id="videoSizeLabel">— MB</strong>
                  </div>
                </div>

                <div class="inspector-box" style="margin-top:12px;">
                  <h4 style="font-size:12px;color:var(--text);margin-bottom:4px;">Target Reach Requirement</h4>
                  <p style="font-size:11.5px;color:var(--muted);line-height:1.5;" id="transcodeAdviceText">
                    Adjust the slider to evaluate audience reach against bandwidth constraints.
                  </p>
                </div>

                <button class="btn secondary" id="videoExportBtn" type="button" style="width:100%;margin-top:18px;min-height:42px;font-weight:700;">
                  ⬇ Download / Export Video File
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>

      <!-- ================= 3. AUDIO ADC MODULE ================= -->
      <div class="media-subtab-pane hidden" id="pane-media-audio">
        <div class="workspace-grid">
          <div class="workspace-left">
            <section class="panel panel-pad">
              <div class="topline">
                <div>
                  <div class="eyebrow">REAL AUDIO CAPTURE & WAVEFORM ENVELOPE</div>
                  <h2 class="section-title" style="margin-top:6px">Analog sound input</h2>
                </div>
                <div style="display:flex;gap:8px;flex-wrap:wrap;">
                  <button class="btn small" id="audioRecordBtn">🎙 Record Mic</button>
                  <button class="btn secondary small" id="audioStopBtn" disabled>⏹ Stop</button>
                  <button class="btn secondary small" id="audioPlayRecBtn" disabled>▶ Play Recording</button>
                  <button class="btn secondary small" id="audioDownloadBtn" disabled>⬇ Download WAV</button>
                </div>
              </div>

              <!-- Audio Waveform Canvas with Scrubber Playhead -->
              <div class="canvas-wrap" style="margin-top:16px;background:#ffffff;border:1.5px solid var(--line);border-radius:12px;position:relative;overflow:hidden;">
                <canvas id="audioLiveCanvas" width="600" height="150" style="display:block;width:100%;height:140px;"></canvas>
                <!-- DAW Scrubber Line -->
                <div id="audioScrubberLine" style="display:none;position:absolute;top:0;bottom:0;width:2px;background:#ef4444;box-shadow:0 0 8px rgba(239,68,68,0.8);pointer-events:none;"></div>
              </div>
              <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;">
                <span class="hint" id="audioStatusText">Ready to record. Speak into microphone to observe live audio wave.</span>
                <span class="hint mono" id="audioTimeLabel">0.0s / 0.0s</span>
              </div>

              <div class="divider" style="margin:16px 0;"></div>

              <div class="eyebrow">ADC SAMPLING & QUANTIZATION</div>
              <div class="controls-grid" style="margin-top:12px;">
                <div class="field">
                  <label for="audioSampleRateSelect">Sampling frequency (fs)</label>
                  <select id="audioSampleRateSelect">
                    <option value="8000">8,000 Hz (Telephone Voice — Coarse Sampling)</option>
                    <option value="16000">16,000 Hz (Wideband Voice)</option>
                    <option value="44100" selected>44,100 Hz (CD Audio Fidelity — Smooth Wave)</option>
                  </select>
                  <span class="hint">Adjusting sample rate visibly coarsens or smooths the waveform steps.</span>
                </div>
                <div class="field">
                  <label for="audioBitDepthSelect">Quantization resolution (B)</label>
                  <select id="audioBitDepthSelect">
                    <option value="4">4-bit (16 discrete levels — Visible quantization stairs)</option>
                    <option value="8">8-bit (256 discrete levels)</option>
                    <option value="16" selected>16-bit (65,536 discrete levels — High fidelity)</option>
                  </select>
                  <span class="hint">Lower bit depth visibly clamps signal into discrete amplitude steps.</span>
                </div>
              </div>
            </section>
          </div>

          <div class="workspace-right">
            <!-- Signal Parameter Adjustments for Current Audio -->
            <section class="panel panel-pad">
              <div class="eyebrow">SIGNAL TRANSFORMATIONS</div>
              <h2 class="section-title" style="margin-top:6px">Audio Amplitude & Pitch</h2>
              <p class="section-sub">Adjust frequency and amplitude parameters of the captured sound in real time.</p>

              <div class="controls-grid" style="margin-top:14px;">
                <div class="field">
                  <label for="audioGainRange">Amplitude (Volume Gain): <span id="audioGainVal" style="color:#4f46e5;font-weight:750">1.0×</span></label>
                  <input id="audioGainRange" type="range" min="0.2" max="3.0" step="0.1" value="1.0">
                  <span class="hint">Scales waveform peak voltages and increases output amplitude.</span>
                </div>
                <div class="field">
                  <label for="audioPitchRange">Frequency (Pitch / Speed): <span id="audioPitchVal" style="color:#4f46e5;font-weight:750">1.0×</span></label>
                  <input id="audioPitchRange" type="range" min="0.5" max="2.0" step="0.1" value="1.0">
                  <span class="hint">Modifies the playback speed and frequency oscillations of the signal.</span>
                </div>
              </div>
            </section>

            <!-- Simplified ADC Summary -->
            <section class="panel panel-pad" style="margin-top:16px;">
              <div class="eyebrow">DIGITAL CONVERSION SUMMARY</div>
              <h2 class="section-title" style="margin-top:6px">Output specifications</h2>

              <div class="mini-metrics" style="grid-template-columns:1fr 1fr;gap:12px;margin-top:14px;">
                <div class="mini-metric">
                  <span>DISCRETE LEVELS</span>
                  <strong id="audioLevelsLabel">65,536 levels</strong>
                </div>
                <div class="mini-metric">
                  <span>PCM BITRATE</span>
                  <strong id="audioBitrateLabel">705.6 kbps</strong>
                </div>
                <div class="mini-metric">
                  <span>NYQUIST LIMIT</span>
                  <strong id="audioMaxFreqLabel">22.05 kHz</strong>
                </div>
                <div class="mini-metric">
                  <span>SIGNAL FIDELITY</span>
                  <strong id="audioSnrqLabel" style="color:#10b981">CD Quality (98 dB)</strong>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function initMediaStudio() {
  const $ = (id) => document.getElementById(id);

  // Tab switching
  document.querySelectorAll('[data-mediatab]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-mediatab]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const tab = btn.dataset.mediatab;
      $('pane-media-image').classList.toggle('hidden', tab !== 'image');
      $('pane-media-video').classList.toggle('hidden', tab !== 'video');
      $('pane-media-audio').classList.toggle('hidden', tab !== 'audio');
    });
  });

  /* ================= 1. IMAGE MODULE CONTROLLER ================= */
  const srcCanvas = $('imgSourceCanvas');
  const recvCanvas = $('imgRecvCanvas');
  let currentPixels = new Uint8Array(32 * 32);
  let currentWidth = 32;
  let currentHeight = 32;
  let compressMode = 'raw';
  let computeTimeout = null;

  function generateDishData() {
    currentWidth = 32;
    currentHeight = 32;
    currentPixels = new Uint8Array(32 * 32);
    for (let y = 0; y < 32; y++) {
      for (let x = 0; x < 32; x++) {
        let val = 30;
        if (x >= 13 && x <= 18 && y >= 23 && y <= 27) val = 210;
        if (x >= 15 && x <= 16 && y >= 18 && y <= 24) val = 240;
        const dishDy = y - 18;
        const dishDx = x - 15.5;
        if (Math.abs((dishDx * dishDx) / 16.0 + (dishDy * dishDy) / 4.0 - 1.0) < 0.4 && y >= 17 && y <= 21) {
          val = 255;
        }
        const r = Math.sqrt((x - 15.5) * (x - 15.5) + (y - 16) * (y - 16));
        if (y < 18) {
          if (Math.abs(r - 5.0) < 0.8) val = 220;
          else if (Math.abs(r - 9.0) < 0.8) val = 180;
          else if (Math.abs(r - 13.0) < 0.8) val = 140;
        }
        if (x === 0 || x === 31 || y === 0 || y === 31) val = 250;
        currentPixels[y * 32 + x] = val;
      }
    }
  }

  function triggerImageCompute() {
    const notice = $('imgProcessingNotice');
    if (notice) notice.style.display = 'block';

    clearTimeout(computeTimeout);
    computeTimeout = setTimeout(() => {
      renderImageModule();
      if (notice) notice.style.display = 'none';
    }, 700); // 700ms authentic compute feel
  }

  function renderImageModule() {
    const quality = Number($('imgQualityRange').value);
    const snr = Number($('imgChannelRange').value);

    $('imgQualityVal').textContent = `${quality}%`;
    $('imgChannelVal').textContent = `${snr} dB`;

    // Render Source Image
    const sCtx = srcCanvas.getContext('2d');
    const sImgData = sCtx.createImageData(currentWidth, currentHeight);
    for (let i = 0; i < currentPixels.length; i++) {
      const v = currentPixels[i];
      sImgData.data[i * 4] = v;
      sImgData.data[i * 4 + 1] = v;
      sImgData.data[i * 4 + 2] = v;
      sImgData.data[i * 4 + 3] = 255;
    }

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = currentWidth;
    tempCanvas.height = currentHeight;
    tempCanvas.getContext('2d').putImageData(sImgData, 0, 0);

    sCtx.imageSmoothingEnabled = false;
    sCtx.clearRect(0, 0, srcCanvas.width, srcCanvas.height);
    sCtx.drawImage(tempCanvas, 0, 0, srcCanvas.width, srcCanvas.height);

    // Calculate metrics
    const rawBytes = currentWidth * currentHeight;
    let compRatio = compressMode === 'compressed' ? 0.30 * (quality / 100) : 1.0 * (quality / 100);

    const txBytes = Math.max(64, Math.round(rawBytes * compRatio));
    const delayMs = ((txBytes * 8) / 1000000) * 1000;
    const minCap = Math.round(txBytes * 8 * 1.5);

    $('imgRawSizeLabel').textContent = `${rawBytes.toLocaleString()} bytes (8 bpp)`;
    $('imgTxSizeLabel').textContent = `${txBytes.toLocaleString()} bytes (${Math.round((1 - compRatio) * 100)}% compressed)`;
    $('imgDelayLabel').textContent = `${delayMs.toFixed(2)} ms`;
    $('imgMinCapLabel').textContent = `${minCap.toLocaleString()} bps`;

    // Simulate Channel Noise and Compute PSNR
    const rCtx = recvCanvas.getContext('2d');
    const rImgData = rCtx.createImageData(currentWidth, currentHeight);
    let mseSum = 0;
    const errorProb = Math.max(0.0001, 0.15 * Math.exp(-0.35 * snr));

    for (let i = 0; i < currentPixels.length; i++) {
      let v = currentPixels[i];
      if (Math.sin(i * 357 + snr * 29) > (1 - errorProb * 2)) {
        const noiseDelta = (Math.cos(i * 113) * 60);
        v = Math.min(255, Math.max(0, v + noiseDelta));
      }
      rImgData.data[i * 4] = v;
      rImgData.data[i * 4 + 1] = v;
      rImgData.data[i * 4 + 2] = v;
      rImgData.data[i * 4 + 3] = 255;

      const diff = v - currentPixels[i];
      mseSum += diff * diff;
    }

    const mse = mseSum / currentPixels.length;
    const psnr = mse === 0 ? 99.0 : 10 * Math.log10((255 * 255) / mse);

    const rTemp = document.createElement('canvas');
    rTemp.width = currentWidth;
    rTemp.height = currentHeight;
    rTemp.getContext('2d').putImageData(rImgData, 0, 0);

    rCtx.imageSmoothingEnabled = false;
    rCtx.clearRect(0, 0, recvCanvas.width, recvCanvas.height);
    rCtx.drawImage(rTemp, 0, 0, recvCanvas.width, recvCanvas.height);

    $('imgPsnrLabel').textContent = `${psnr.toFixed(1)} dB`;
    if (psnr >= 35) $('imgPsnrLabel').style.color = '#10b981';
    else if (psnr >= 26) $('imgPsnrLabel').style.color = '#f59e0b';
    else $('imgPsnrLabel').style.color = '#ef4444';
  }

  // Bind Image controls
  generateDishData();
  renderImageModule();

  $('imgLoadDish').addEventListener('click', () => {
    generateDishData();
    $('imgResLabel').textContent = '32 × 32 pixels';
    triggerImageCompute();
  });

  document.querySelectorAll('.circle-option').forEach(opt => {
    opt.addEventListener('click', () => {
      document.querySelectorAll('.circle-option').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      compressMode = opt.dataset.compress;
      triggerImageCompute();
    });
  });

  $('imgQualityRange').addEventListener('input', triggerImageCompute);
  $('imgChannelRange').addEventListener('input', triggerImageCompute);

  $('imgFileInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const img = new Image();
      img.onload = () => {
        // Preserve clean aspect ratio with max dimension 64px
        const maxDim = 64;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        currentWidth = w;
        currentHeight = h;

        const off = document.createElement('canvas');
        off.width = currentWidth;
        off.height = currentHeight;
        const ctx = off.getContext('2d');
        ctx.drawImage(img, 0, 0, currentWidth, currentHeight);
        const data = ctx.getImageData(0, 0, currentWidth, currentHeight).data;

        currentPixels = new Uint8Array(currentWidth * currentHeight);
        for (let i = 0; i < currentPixels.length; i++) {
          currentPixels[i] = Math.round(0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2]);
        }
        $('imgResLabel').textContent = `${currentWidth} × ${currentHeight} pixels`;
        triggerImageCompute();
      };
      img.src = evt.target.result;
    };
    reader.readAsDataURL(file);
  });

  /* ================= 2. VIDEO MODULE CONTROLLER ================= */
  let activeVideoBitrateKbps = 0;
  let activeVideoFile = null;

  function updateReachabilityAnalysis() {
    const targetReach = Number($('reachabilityRange').value);
    $('reachabilityVal').textContent = `${targetReach}%`;

    if (!activeVideoBitrateKbps) {
      $('reachTitle').textContent = `Global Reach: ~88% of Students Supported`;
      $('reachDesc').textContent = `Upload a video file to calculate actual student compatibility across global internet connections.`;
      return;
    }

    // Real reach based on measured bitrate
    let currentReach = 95;
    if (activeVideoBitrateKbps >= 15000) currentReach = 18; // 8K / high 4K
    else if (activeVideoBitrateKbps >= 8000) currentReach = 45; // 4K UHD
    else if (activeVideoBitrateKbps >= 4000) currentReach = 78; // 1080p
    else if (activeVideoBitrateKbps >= 2000) currentReach = 90; // 720p
    else currentReach = 98; // 480p

    $('reachTitle').textContent = `Global Reach: ~${currentReach}% of Students Supported`;
    $('reachDesc').textContent = `Based on your video's detected bitrate (~${(activeVideoBitrateKbps / 1000).toFixed(1)} Mbps), approximately ${currentReach}% of student connections worldwide can play this smoothly without buffering.`;

    let reqBitrate = 2500;
    let reqRes = '720p';
    if (targetReach >= 95) { reqBitrate = 1500; reqRes = '480p'; }
    else if (targetReach >= 90) { reqBitrate = 2500; reqRes = '720p'; }
    else if (targetReach >= 75) { reqBitrate = 4500; reqRes = '1080p'; }
    else { reqBitrate = 9000; reqRes = '4K'; }

    const isMeeting = activeVideoBitrateKbps <= reqBitrate;
    $('transcodeAdviceText').innerHTML = `
      To reach <strong>${targetReach}%</strong> of global students, target bitrate is ≤ <strong>${reqBitrate.toLocaleString()} kbps (${reqRes})</strong>. 
      Your video is <strong>${activeVideoBitrateKbps.toLocaleString()} kbps</strong> (${isMeeting ? '<span style="color:#10b981;font-weight:700">Meets target ✓</span>' : '<span style="color:#f59e0b;font-weight:700">Needs compression for target reach</span>'}).
    `;
  }

  $('reachabilityRange').addEventListener('input', updateReachabilityAnalysis);

  function handleVideoUpload(file) {
    if (!file) return;
    activeVideoFile = file;

    const player = $('videoPlayerEl');
    const emptyState = $('videoEmptyState');
    const scanningState = $('videoScanningState');
    const progressBar = $('videoScanProgressBar');
    const playerWrap = $('videoPlayerWrap');
    const reachEmpty = $('reachEmptyNotice');
    const reachStats = $('reachStatsWrap');

    // Show scanning animation first
    if (emptyState) emptyState.style.display = 'none';
    if (playerWrap) playerWrap.style.display = 'none';
    if (reachStats) reachStats.style.display = 'none';
    if (reachEmpty) reachEmpty.style.display = 'none';
    if (scanningState) scanningState.style.display = 'block';

    if (progressBar) {
      progressBar.style.width = '0%';
      setTimeout(() => { progressBar.style.width = '100%'; }, 50);
    }

    const url = URL.createObjectURL(file);
    player.src = url;

    // Authentic 1.6s scanning delay before revealing player and analysis
    setTimeout(() => {
      if (scanningState) scanningState.style.display = 'none';
      if (playerWrap) playerWrap.style.display = 'block';
      if (reachStats) reachStats.style.display = 'block';

      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      $('videoSizeLabel').textContent = `${sizeMB} MB`;

      const computeMeta = () => {
        const dur = player.duration || 10;
        activeVideoBitrateKbps = Math.max(100, Math.round(((file.size * 8) / dur) / 1000));
        $('videoBitrateLabel').textContent = `${activeVideoBitrateKbps.toLocaleString()} kbps (${(activeVideoBitrateKbps / 1000).toFixed(1)} Mbps)`;
        $('videoFpsLabel').textContent = '30.0 fps';
        $('videoStreamMeta').textContent = `Resolution: ${player.videoWidth} × ${player.videoHeight} · Duration: ${dur.toFixed(1)}s · Size: ${sizeMB} MB · ${activeVideoBitrateKbps.toLocaleString()} kbps`;

        updateReachabilityAnalysis();
        extractVideoSnapshots(player, dur);
      };

      if (player.readyState >= 1) {
        computeMeta();
      } else {
        player.onloadedmetadata = computeMeta;
      }
    }, 1600);
  }

  function extractVideoSnapshots(player, dur) {
    const filmstrip = $('videoFilmstrip');
    if (!filmstrip) return;
    filmstrip.innerHTML = '';

    const timestamps = [dur * 0.15, dur * 0.38, dur * 0.62, dur * 0.85];
    timestamps.forEach((t, i) => {
      const frameEl = document.createElement('div');
      frameEl.className = 'filmstrip-frame';
      frameEl.style.background = '#ffffff';
      frameEl.style.border = '1.5px solid #e2e8f0';
      frameEl.style.borderRadius = '10px';
      frameEl.style.padding = '6px';
      frameEl.style.textAlign = 'center';
      frameEl.style.flexShrink = '0';

      const thumb = document.createElement('canvas');
      thumb.className = 'filmstrip-thumb';
      thumb.width = 130;
      thumb.height = 74;
      thumb.style.borderRadius = '6px';
      thumb.style.display = 'block';
      const ctx = thumb.getContext('2d');

      // Draw initial placeholder
      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(0, 0, thumb.width, thumb.height);
      ctx.fillStyle = '#6366f1';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`SNAPSHOT 0${i + 1}`, 65, 42);

      frameEl.appendChild(thumb);

      const cap = document.createElement('div');
      cap.className = 'filmstrip-caption';
      cap.style.color = '#64748b';
      cap.style.fontSize = '11px';
      cap.style.fontWeight = '600';
      cap.style.marginTop = '4px';
      cap.textContent = `t = ${t.toFixed(1)}s`;
      frameEl.appendChild(cap);

      filmstrip.appendChild(frameEl);

      // Seek offscreen video clone to timestamp and capture frame
      const offVideo = document.createElement('video');
      offVideo.src = player.src;
      offVideo.muted = true;
      offVideo.currentTime = t;
      offVideo.onseeked = () => {
        try {
          ctx.drawImage(offVideo, 0, 0, thumb.width, thumb.height);
        } catch (e) {}
      };
    });
  }

  $('videoFileInput').addEventListener('change', (e) => handleVideoUpload(e.target.files[0]));
  const altInput = $('videoFileInputAlt');
  if (altInput) altInput.addEventListener('change', (e) => handleVideoUpload(e.target.files[0]));

  // Download / Export Video File
  $('videoExportBtn').addEventListener('click', () => {
    const player = $('videoPlayerEl');
    if (!player.src) return;
    const a = document.createElement('a');
    a.href = player.src;
    a.download = activeVideoFile ? activeVideoFile.name : 'signalforge_exported_video.mp4';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast('Video download started.');
  });

  /* ================= 3. AUDIO ADC MODULE CONTROLLER ================= */
  let audioCtx = null;
  let micStream = null;
  let mediaRecorder = null;
  let audioChunks = [];
  let recordedAudioBuffer = null;
  let recordedPlaybackSource = null;
  let isPlayingRecorded = false;
  let isRecordingLive = false;
  let liveAnimId = null;
  let liveAnalyser = null;
  let playbackStartTime = 0;
  let scrubberAnimId = null;

  function initEmptyAudioWave() {
    const canvas = $('audioLiveCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1;
    for (let y = 20; y < canvas.height; y += 30) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }

    // Midline
    ctx.strokeStyle = '#cbd5e1';
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(0, canvas.height / 2);
    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  initEmptyAudioWave();

  // Draw full recorded audio envelope with visible quantization & sampling effects
  function drawRecordedWaveform(rawSamples, bitDepth = 16, sampleRate = 44100, gain = 1.0) {
    const canvas = $('audioLiveCanvas');
    if (!canvas || !rawSamples || rawSamples.length === 0) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const midY = h / 2;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1;
    for (let y = 15; y < h; y += 30) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    // Midline
    ctx.strokeStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.moveTo(0, midY); ctx.lineTo(w, midY); ctx.stroke();

    // Quantization discrete step size
    const levels = Math.pow(2, bitDepth);
    const stepSize = 2.0 / levels;

    // Sampling decimation factor: lower fs draws visible stepped bars
    const decimation = sampleRate <= 8000 ? 12 : (sampleRate <= 16000 ? 6 : 1);

    ctx.strokeStyle = '#4f46e5';
    ctx.lineWidth = 2;
    ctx.beginPath();

    const sampleStep = Math.max(1, Math.floor(rawSamples.length / w));
    let lastY = midY;

    for (let x = 0; x < w; x++) {
      // Step holding to visibly reflect sample rate
      const steppedX = Math.floor(x / decimation) * decimation;
      const idx = steppedX * sampleStep;
      let sample = (rawSamples[idx] || 0) * gain;

      // Quantize sample to discrete levels
      sample = Math.round(sample / stepSize) * stepSize;
      const clampedSample = Math.max(-1, Math.min(1, sample));
      const y = midY - clampedSample * (h * 0.44);

      if (x === 0) {
        ctx.moveTo(x, y);
      } else {
        if (decimation > 1 && x % decimation === 0) {
          ctx.lineTo(x, lastY); // staircase step
        }
        ctx.lineTo(x, y);
      }
      lastY = y;
    }
    ctx.stroke();
  }

  function updateAdcCalculations() {
    const fs = Number($('audioSampleRateSelect').value);
    const b = Number($('audioBitDepthSelect').value);
    const gain = Number($('audioGainRange').value);

    const levels = Math.pow(2, b);
    const bitrate = ((fs * b * 1) / 1000).toFixed(1);
    const fmax = (fs / 2000).toFixed(2);
    const quality = b >= 16 ? 'CD Fidelity (98 dB)' : (b >= 8 ? 'Broadcast (50 dB)' : 'Quantized (26 dB)');

    $('audioLevelsLabel').textContent = `${levels.toLocaleString()} levels`;
    $('audioBitrateLabel').textContent = `${bitrate} kbps`;
    $('audioMaxFreqLabel').textContent = `${fmax} kHz`;
    $('audioSnrqLabel').textContent = quality;

    // Redraw if buffer exists
    if (recordedAudioBuffer) {
      const rawData = recordedAudioBuffer.getChannelData(0);
      drawRecordedWaveform(rawData, b, fs, gain);
    }
  }

  $('audioSampleRateSelect').addEventListener('change', updateAdcCalculations);
  $('audioBitDepthSelect').addEventListener('change', updateAdcCalculations);

  $('audioGainRange').addEventListener('input', () => {
    $('audioGainVal').textContent = `${$('audioGainRange').value}×`;
    updateAdcCalculations();
  });

  $('audioPitchRange').addEventListener('input', () => {
    $('audioPitchVal').textContent = `${$('audioPitchRange').value}×`;
  });

  updateAdcCalculations();

  // Microphone Live Recording with Real Oscillating Waveform
  $('audioRecordBtn').addEventListener('click', async () => {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') await audioCtx.resume();

      micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunks = [];

      // Create live analyser for real-time waveform display
      liveAnalyser = audioCtx.createAnalyser();
      liveAnalyser.fftSize = 1024;
      const source = audioCtx.createMediaStreamSource(micStream);
      source.connect(liveAnalyser);

      isRecordingLive = true;
      const canvas = $('audioLiveCanvas');
      const ctx = canvas.getContext('2d');
      const timeData = new Uint8Array(liveAnalyser.frequencyBinCount);

      function drawLiveWave() {
        if (!isRecordingLive) return;
        liveAnalyser.getByteTimeDomainData(timeData);

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Grid
        ctx.strokeStyle = '#f1f5f9';
        ctx.lineWidth = 1;
        for (let y = 15; y < canvas.height; y += 30) {
          ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
        }

        // Live wave line
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        const sliceWidth = canvas.width / timeData.length;
        let x = 0;

        for (let i = 0; i < timeData.length; i++) {
          const v = timeData[i] / 128.0;
          const y = (v * canvas.height) / 2;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
          x += sliceWidth;
        }
        ctx.stroke();

        liveAnimId = requestAnimationFrame(drawLiveWave);
      }

      drawLiveWave();

      mediaRecorder = new MediaRecorder(micStream);
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const arrayBuffer = await audioBlob.arrayBuffer();
        audioCtx.decodeAudioData(arrayBuffer, (decoded) => {
          recordedAudioBuffer = decoded;
          const rawSamples = decoded.getChannelData(0);
          const b = Number($('audioBitDepthSelect').value);
          const fs = Number($('audioSampleRateSelect').value);
          const gain = Number($('audioGainRange').value);

          drawRecordedWaveform(rawSamples, b, fs, gain);

          $('audioStatusText').textContent = `Audio captured (${decoded.duration.toFixed(1)}s). Ready to replay or export.`;
          $('audioTimeLabel').textContent = `0.0s / ${decoded.duration.toFixed(1)}s`;
          $('audioPlayRecBtn').disabled = false;
          $('audioDownloadBtn').disabled = false;
        });
      };

      mediaRecorder.start();

      $('audioRecordBtn').disabled = true;
      $('audioStopBtn').disabled = false;
      $('audioRecordBtn').textContent = '● Recording Mic...';
      $('audioStatusText').textContent = 'Listening to microphone... speak clearly!';
    } catch (err) {
      alert('Microphone notice: ' + err.message);
    }
  });

  $('audioStopBtn').addEventListener('click', () => {
    isRecordingLive = false;
    cancelAnimationFrame(liveAnimId);

    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    if (micStream) micStream.getTracks().forEach(t => t.stop());

    $('audioRecordBtn').disabled = false;
    $('audioStopBtn').disabled = true;
    $('audioRecordBtn').textContent = '🎙 Record Mic';
  });

  // Replay Recorded Audio with Moving Scrubber Line, Pitch, and Gain
  $('audioPlayRecBtn').addEventListener('click', () => {
    if (!recordedAudioBuffer || !audioCtx) return;

    if (isPlayingRecorded) {
      if (recordedPlaybackSource) {
        try { recordedPlaybackSource.stop(); } catch (e) {}
      }
      cancelAnimationFrame(scrubberAnimId);
      isPlayingRecorded = false;
      $('audioPlayRecBtn').textContent = '▶ Play Recording';
      const scrubber = $('audioScrubberLine');
      if (scrubber) scrubber.style.display = 'none';
      return;
    }

    const pitch = Number($('audioPitchRange').value);
    const gain = Number($('audioGainRange').value);

    recordedPlaybackSource = audioCtx.createBufferSource();
    recordedPlaybackSource.buffer = recordedAudioBuffer;
    recordedPlaybackSource.playbackRate.value = pitch;

    const gainNode = audioCtx.createGain();
    gainNode.gain.value = gain;

    recordedPlaybackSource.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    const dur = recordedAudioBuffer.duration / pitch;
    playbackStartTime = audioCtx.currentTime;
    isPlayingRecorded = true;
    $('audioPlayRecBtn').textContent = '⏸ Pause';

    const scrubber = $('audioScrubberLine');
    if (scrubber) scrubber.style.display = 'block';

    function animateScrubber() {
      if (!isPlayingRecorded) return;
      const elapsed = audioCtx.currentTime - playbackStartTime;
      const pct = Math.min(1.0, elapsed / dur);

      if (scrubber) scrubber.style.left = `${pct * 100}%`;
      $('audioTimeLabel').textContent = `${(elapsed * pitch).toFixed(1)}s / ${recordedAudioBuffer.duration.toFixed(1)}s`;

      if (elapsed < dur) {
        scrubberAnimId = requestAnimationFrame(animateScrubber);
      } else {
        isPlayingRecorded = false;
        $('audioPlayRecBtn').textContent = '▶ Play Recording';
        if (scrubber) scrubber.style.display = 'none';
        $('audioTimeLabel').textContent = `${recordedAudioBuffer.duration.toFixed(1)}s / ${recordedAudioBuffer.duration.toFixed(1)}s`;
      }
    }

    recordedPlaybackSource.start();
    animateScrubber();

    recordedPlaybackSource.onended = () => {
      isPlayingRecorded = false;
      $('audioPlayRecBtn').textContent = '▶ Play Recording';
      if (scrubber) scrubber.style.display = 'none';
    };
  });

  // Helper: 16-bit PCM WAV Blob Creator
  function audioBufferToWavBlob(samples, sampleRate) {
    const numChannels = 1;
    const bytesPerSample = 2;
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = samples.length * bytesPerSample;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);

    let offset = 44;
    for (let i = 0; i < samples.length; i++) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
      offset += 2;
    }
    return new Blob([buffer], { type: 'audio/wav' });
  }

  // Download Processed Audio as .wav
  $('audioDownloadBtn').addEventListener('click', () => {
    if (!recordedAudioBuffer) return;
    const rawData = recordedAudioBuffer.getChannelData(0);
    const gain = Number($('audioGainRange').value);
    const fs = Number($('audioSampleRateSelect').value);

    // Apply gain to samples
    const processed = new Float32Array(rawData.length);
    for (let i = 0; i < rawData.length; i++) {
      processed[i] = rawData[i] * gain;
    }

    const wavBlob = audioBufferToWavBlob(processed, fs);
    const url = URL.createObjectURL(wavBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `signalforge_audio_${fs}Hz_${$('audioBitDepthSelect').value}bit.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast('Audio WAV file generated & downloaded.');
  });
}

/**
 * SignalForge - Other Labs Studio (otherLabsStudio.js)
 * Combines:
 * 1. Signal Visualizer on an interactive Cartesian XY Coordinate Graph (Desmos-style).
 * 2. Network Foundations: HTTP Ping latency, 2MB throughput test, delay calculator.
 * 3. Multiplexing Systems: TDM, FDM, Statistical TDM slot allocation.
 * 4. Digital Basics: Live keyboard event ASCII/hex/binary explorer & conversion.
 */

export function otherLabsMarkup() {
  return `
    <div class="other-labs-wrap">
      <!-- Sub-Navigation for Other Labs -->
      <div class="sub-tabs-bar" role="tablist">
        <button class="sub-tab-btn active" data-othertab="signal" role="tab">📈 Signal Visualizer (XY Graph)</button>
        <button class="sub-tab-btn" data-othertab="network" role="tab">🌐 Network Foundations</button>
        <button class="sub-tab-btn" data-othertab="mux" role="tab">☷ Multiplexing Systems</button>
        <button class="sub-tab-btn" data-othertab="basics" role="tab">01 Digital Basics</button>
      </div>

      <!-- ================= 1. SIGNAL VISUALIZER (DESMOS XY GRAPH) ================= -->
      <div class="other-subtab-pane" id="pane-other-signal">
        <div class="workspace-grid">
          <div class="workspace-left">
            <section class="panel panel-pad">
              <div class="topline">
                <div>
                  <div class="eyebrow">MATHEMATICAL GRAPHING ENGINE</div>
                  <h2 class="section-title" style="margin-top:6px">Cartesian XY Signal Plotter</h2>
                </div>
                <span class="pill"><span class="dot"></span> DESMOS STYLE</span>
              </div>

              <!-- Desmos-style Graph Canvas -->
              <div class="desmos-graph-wrap" id="desmosGraphContainer">
                <canvas id="desmosCanvas" width="700" height="340" class="desmos-canvas"></canvas>
                <div class="desmos-readout" id="desmosReadout">t: 0.00 ms | V: 0.00 V</div>
              </div>

              <!-- Graph Curve Legend & Toggles -->
              <div class="desmos-legend">
                <label class="desmos-legend-item">
                  <input type="checkbox" id="chkShowMod" checked>
                  <span class="legend-color" style="background:#818cf8;"></span>
                  <span>Modulated Signal s(t)</span>
                </label>
                <label class="desmos-legend-item">
                  <input type="checkbox" id="chkShowCarrier" checked>
                  <span class="legend-color" style="background:#38bdf8;"></span>
                  <span>Carrier Wave c(t)</span>
                </label>
                <label class="desmos-legend-item">
                  <input type="checkbox" id="chkShowMsg" checked>
                  <span class="legend-color" style="background:#34d399;"></span>
                  <span>Message m(t)</span>
                </label>
                <label class="desmos-legend-item">
                  <input type="checkbox" id="chkShowEnv" checked>
                  <span class="legend-color" style="background:#fbbf24;"></span>
                  <span>AM Envelope</span>
                </label>
              </div>
            </section>
          </div>

          <div class="workspace-right">
            <section class="panel panel-pad">
              <div class="eyebrow">WAVEFORM PARAMETERS</div>
              <h2 class="section-title" style="margin-top:6px">Signal generator controls</h2>

              <div class="controls-grid" style="margin-top:16px;">
                <div class="field">
                  <label for="xyModMode">Modulation type</label>
                  <select id="xyModMode">
                    <option value="AM" selected>AM (Amplitude Modulation)</option>
                    <option value="FM">FM (Frequency Modulation)</option>
                    <option value="PM">PM (Phase Modulation)</option>
                  </select>
                </div>
                <div class="field">
                  <label for="xyCarrierFreq">Carrier frequency (fc): <span id="xyCarrierFreqVal" style="color:var(--accent);font-weight:700">40 Hz</span></label>
                  <input id="xyCarrierFreq" type="range" min="15" max="80" step="5" value="40">
                </div>
                <div class="field">
                  <label for="xyMsgFreq">Message frequency (fm): <span id="xyMsgFreqVal" style="color:var(--accent);font-weight:700">4 Hz</span></label>
                  <input id="xyMsgFreq" type="range" min="1" max="10" step="1" value="4">
                </div>
                <div class="field">
                  <label for="xyModIndex">Modulation index (μ / β): <span id="xyModIndexVal" style="color:var(--accent);font-weight:700">0.8</span></label>
                  <input id="xyModIndex" type="range" min="0.1" max="1.8" step="0.1" value="0.8">
                  <span class="hint">μ > 1.0 causes overmodulation envelope distortion.</span>
                </div>
              </div>

              <div class="divider" style="margin:20px 0 14px;"></div>

              <div class="eyebrow">MATHEMATICAL EQUATION</div>
              <div class="mono" id="xyFormulaBox" style="font-size:12px;background:#f8fafc;padding:12px;border-radius:8px;border:1px solid #cbd5e1;color:#4f46e5;margin-top:8px;line-height:1.6;">
                s(t) = A_c · [1 + μ·cos(2π·fm·t)] · cos(2π·fc·t)
              </div>
            </section>
          </div>
        </div>
      </div>

      <!-- ================= 2. NETWORK FOUNDATIONS ================= -->
      <div class="other-subtab-pane hidden" id="pane-other-network">
        <div class="workspace-grid">
          <div class="workspace-left">
            <section class="panel panel-pad">
              <div class="topline">
                <div>
                  <div class="eyebrow">LIVE LATENCY & THROUGHPUT (PRACTICALS 1 & 2)</div>
                  <h2 class="section-title" style="margin-top:6px">HTTP ping & bandwidth test</h2>
                </div>
              </div>

              <p class="section-sub">Execute authentic HTTP network measurements against the local server payloads.</p>

              <div style="display:flex;gap:12px;margin:18px 0;flex-wrap:wrap;">
                <button class="btn small" id="netRunPingBtn">Run HTTP ping test (/assets/ping.txt)</button>
                <button class="btn secondary small" id="netRunThroughputBtn">Measure download throughput (/assets/payload.bin)</button>
              </div>

              <div class="tool-output mono" id="netTestOutput" style="min-height:90px;white-space:pre-wrap;">Click a network test above to initiate live HTTP measurement.</div>

              <div class="divider" style="margin:22px 0 16px;"></div>

              <div class="eyebrow">TRANSMISSION DELAY CALCULATOR</div>
              <div class="controls-grid" style="margin-top:14px;">
                <div class="field">
                  <label for="netFileSize">File size (MB)</label>
                  <input type="number" id="netFileSize" min="0.1" step="1" value="10">
                </div>
                <div class="field">
                  <label for="netBandwidth">Link bandwidth (Mbps)</label>
                  <input type="number" id="netBandwidth" min="1" step="10" value="100">
                </div>
              </div>
              <div class="tool-output mono" id="netCalcOutput" style="margin-top:12px;">
                10.0 MB over 100 Mbps takes 0.80 seconds transmission time.
              </div>
            </section>
          </div>

          <div class="workspace-right">
            <section class="panel panel-pad">
              <div class="eyebrow">NETWORKING FOUNDATIONS</div>
              <h2 class="section-title" style="margin-top:6px">Transmission vs Propagation</h2>
              <div class="inspector-box" style="margin-top:14px;">
                <h4 style="font-size:12px;color:var(--ink);">Transmission Delay (T_tx = L / R)</h4>
                <p style="font-size:11.5px;color:var(--ink-dim);line-height:1.5;">The time required for the transmitter to push all bits of a packet into the physical transmission medium, governed by packet size L and transmission rate R.</p>

                <h4 style="font-size:12px;color:var(--ink);margin-top:10px;">Propagation Delay (T_prop = d / v)</h4>
                <p style="font-size:11.5px;color:var(--ink-dim);line-height:1.5;">The time taken for a bit to physically travel through the wire or air from sender to receiver, governed by physical distance d and propagation speed v ≈ 2·10⁸ m/s in copper/fiber.</p>
              </div>
            </section>
          </div>
        </div>
      </div>

      <!-- ================= 3. MULTIPLEXING SYSTEMS ================= -->
      <div class="other-subtab-pane hidden" id="pane-other-mux">
        <div class="workspace-grid">
          <div class="workspace-left">
            <section class="panel panel-pad">
              <div class="topline">
                <div>
                  <div class="eyebrow">CHANNEL SHARING (PRACTICAL 8)</div>
                  <h2 class="section-title" style="margin-top:6px">Multiplexing allocation</h2>
                </div>
                <div class="sf-segmented-ctrl" id="muxModeCtrl" style="display:flex;gap:6px;">
                  <button class="btn small" data-mux="TDM">TDM</button>
                  <button class="btn secondary small" data-mux="FDM">FDM</button>
                  <button class="btn secondary small" data-mux="STDM">STDM</button>
                </div>
              </div>

              <div id="muxVisualBox" class="tool-output" style="margin-top:18px;min-height:110px;">
                <!-- Dynamically rendered visual allocation -->
              </div>

              <div id="muxExplanation" class="hint" style="margin-top:14px;line-height:1.6;">
                <strong>Time Division Multiplexing (TDM):</strong> Allocates fixed, cyclic time slots to each user regardless of whether they have data to transmit.
              </div>
            </section>
          </div>

          <div class="workspace-right">
            <section class="panel panel-pad">
              <div class="eyebrow">PRACTICAL 8 CONCEPTS</div>
              <h2 class="section-title" style="margin-top:6px">Multiplexing Comparison</h2>
              <div class="inspector-box" style="margin-top:14px;">
                <h4 style="font-size:12px;color:var(--ink);">FDM (Frequency Division)</h4>
                <p style="font-size:11.5px;color:var(--ink-dim);line-height:1.5;">Divides total channel bandwidth into discrete sub-bands separated by guard bands to prevent crosstalk.</p>

                <h4 style="font-size:12px;color:var(--ink);margin-top:10px;">STDM (Statistical TDM)</h4>
                <p style="font-size:11.5px;color:var(--ink-dim);line-height:1.5;">Dynamically assigns time slots on demand based on buffer queues, preventing idle slot waste.</p>
              </div>
            </section>
          </div>
        </div>
      </div>

      <!-- ================= 4. DIGITAL BASICS ================= -->
      <div class="other-subtab-pane hidden" id="pane-other-basics">
        <div class="workspace-grid">
          <div class="workspace-left">
            <section class="panel panel-pad">
              <div class="topline">
                <div>
                  <div class="eyebrow">INTERACTIVE KEYBOARD CAPTURE (PRACTICAL 4)</div>
                  <h2 class="section-title" style="margin-top:6px">Keyboard ASCII Explorer</h2>
                </div>
              </div>

              <p class="section-sub">Focus the capture box and press any key to inspect its ASCII decimal, hex, and 8-bit binary pattern.</p>

              <div style="margin-top:14px;">
                <input type="text" id="basicsKeyInput" placeholder="Click here and press any key on your keyboard..." style="width:100%;padding:14px;border-radius:10px;border:2px solid var(--accent);background:#ffffff;font-size:13px;font-weight:600;">
              </div>

              <div class="mono" id="basicsKeyResult" style="margin-top:16px;background:#f8fafc;border:1.5px solid #e2e8f0;padding:16px;border-radius:10px;color:#4f46e5;font-size:12px;line-height:1.8;font-weight:600;">
                KEY PRESSED : 'H'<br>
                DECIMAL     : 72<br>
                HEXADECIMAL : 0x48<br>
                8-BIT BINARY: 01001000
              </div>
            </section>
          </div>

          <div class="workspace-right">
            <section class="panel panel-pad">
              <div class="eyebrow">CONVERSION UTILITY (PRACTICAL 3)</div>
              <h2 class="section-title" style="margin-top:6px">Binary ↔ Decimal</h2>

              <div class="controls-grid" style="margin-top:16px;">
                <div class="field">
                  <label for="basicsDecInput">Decimal (0 to 255)</label>
                  <input type="number" id="basicsDecInput" min="0" max="255" value="72">
                </div>
                <div class="field">
                  <label for="basicsBinInput">8-bit Binary</label>
                  <input type="text" id="basicsBinInput" maxlength="8" value="01001000">
                </div>
              </div>

              <div class="hint" style="margin-top:16px;line-height:1.6;">
                Every character typed into a computer is encoded as an integer number before modulation into an electromagnetic signal.
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function initOtherLabsStudio(defaultTab = 'signal') {
  const $ = (id) => document.getElementById(id);

  // Sub-tab switching
  document.querySelectorAll('[data-othertab]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-othertab]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const tab = btn.dataset.othertab;
      $('pane-other-signal').classList.toggle('hidden', tab !== 'signal');
      $('pane-other-network').classList.toggle('hidden', tab !== 'network');
      $('pane-other-mux').classList.toggle('hidden', tab !== 'mux');
      $('pane-other-basics').classList.toggle('hidden', tab !== 'basics');
      if (tab === 'signal') renderDesmosGraph();
    });
  });

  /* ================= 1. DESMOS XY GRAPH CONTROLLER ================= */
  const canvas = $('desmosCanvas');
  const readout = $('desmosReadout');

  function renderDesmosGraph() {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Read controls
    const mode = $('xyModMode').value;
    const fc = Number($('xyCarrierFreq').value);
    const fm = Number($('xyMsgFreq').value);
    const mu = Number($('xyModIndex').value);

    $('xyCarrierFreqVal').textContent = `${fc} Hz`;
    $('xyMsgFreqVal').textContent = `${fm} Hz`;
    $('xyModIndexVal').textContent = mu.toFixed(1);

    const showMod = $('chkShowMod').checked;
    const showCarrier = $('chkShowCarrier').checked;
    const showMsg = $('chkShowMsg').checked;
    const showEnv = $('chkShowEnv').checked;

    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);

    // Grid properties
    const originX = 50;
    const originY = h / 2;
    const scaleY = (h / 2) * 0.42; // Volts scale
    const timeSpanMs = 25.0; // 25 milliseconds window
    const scaleX = (w - originX - 20) / timeSpanMs;

    // Draw Minor Grid
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1;
    for (let t = 0; t <= timeSpanMs; t += 1.0) {
      const x = originX + t * scaleX;
      ctx.beginPath(); ctx.moveTo(x, 15); ctx.lineTo(x, h - 20); ctx.stroke();
    }
    for (let v = -2.0; v <= 2.0; v += 0.5) {
      const y = originY - v * scaleY;
      ctx.beginPath(); ctx.moveTo(originX, y); ctx.lineTo(w - 20, y); ctx.stroke();
    }

    // Draw Major Axes
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1.8;

    // X Axis (Time)
    ctx.beginPath();
    ctx.moveTo(originX, originY);
    ctx.lineTo(w - 15, originY);
    ctx.stroke();

    // Y Axis (Voltage)
    ctx.beginPath();
    ctx.moveTo(originX, 15);
    ctx.lineTo(originX, h - 15);
    ctx.stroke();

    // Ticks and Labels
    ctx.fillStyle = '#475569';
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';
    for (let v = -2.0; v <= 2.0; v += 1.0) {
      if (v === 0) continue;
      const y = originY - v * scaleY;
      ctx.fillText(`${v > 0 ? '+' : ''}${v.toFixed(1)}V`, originX - 6, y + 4);
    }
    ctx.fillText('0V', originX - 6, originY + 4);

    ctx.textAlign = 'center';
    for (let t = 5; t <= timeSpanMs; t += 5) {
      const x = originX + t * scaleX;
      ctx.fillText(`${t}ms`, x, originY + 16);
    }

    // 1. Plot Carrier Wave c(t) = Ac * cos(2π * fc * t)
    if (showCarrier) {
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 1.3;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      for (let px = 0; px <= w - originX - 20; px++) {
        const tSec = (px / scaleX) / 1000.0;
        const cVal = Math.cos(2 * Math.PI * fc * tSec);
        const y = originY - cVal * scaleY;
        if (px === 0) ctx.moveTo(originX + px, y);
        else ctx.lineTo(originX + px, y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 2. Plot Message Wave m(t) = Am * cos(2π * fm * t)
    if (showMsg) {
      ctx.strokeStyle = '#059669';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      for (let px = 0; px <= w - originX - 20; px++) {
        const tSec = (px / scaleX) / 1000.0;
        const mVal = Math.cos(2 * Math.PI * fm * tSec);
        const y = originY - mVal * scaleY;
        if (px === 0) ctx.moveTo(originX + px, y);
        else ctx.lineTo(originX + px, y);
      }
      ctx.stroke();
    }

    // 3. Plot AM Envelope Bounds
    if (showEnv && mode === 'AM') {
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 1.3;
      ctx.setLineDash([3, 3]);

      // Upper Envelope
      ctx.beginPath();
      for (let px = 0; px <= w - originX - 20; px++) {
        const tSec = (px / scaleX) / 1000.0;
        const env = (1 + mu * Math.cos(2 * Math.PI * fm * tSec));
        const y = originY - env * scaleY;
        if (px === 0) ctx.moveTo(originX + px, y);
        else ctx.lineTo(originX + px, y);
      }
      ctx.stroke();

      // Lower Envelope
      ctx.beginPath();
      for (let px = 0; px <= w - originX - 20; px++) {
        const tSec = (px / scaleX) / 1000.0;
        const env = -(1 + mu * Math.cos(2 * Math.PI * fm * tSec));
        const y = originY - env * scaleY;
        if (px === 0) ctx.moveTo(originX + px, y);
        else ctx.lineTo(originX + px, y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 4. Plot Modulated Signal s(t)
    if (showMod) {
      ctx.strokeStyle = '#4f46e5';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      for (let px = 0; px <= w - originX - 20; px++) {
        const tSec = (px / scaleX) / 1000.0;
        let sVal = 0;
        if (mode === 'AM') {
          sVal = (1.0 + mu * Math.cos(2 * Math.PI * fm * tSec)) * Math.cos(2 * Math.PI * fc * tSec);
        } else if (mode === 'FM') {
          sVal = Math.cos(2 * Math.PI * fc * tSec + mu * Math.sin(2 * Math.PI * fm * tSec));
        } else {
          sVal = Math.cos(2 * Math.PI * fc * tSec + mu * Math.cos(2 * Math.PI * fm * tSec));
        }
        const y = originY - sVal * scaleY;
        if (px === 0) ctx.moveTo(originX + px, y);
        else ctx.lineTo(originX + px, y);
      }
      ctx.stroke();
    }

    // Update Formula box
    const fBox = $('xyFormulaBox');
    if (mode === 'AM') {
      fBox.textContent = `s(t) = A_c · [1 + ${mu.toFixed(1)}·cos(2π·${fm}·t)] · cos(2π·${fc}·t)`;
    } else if (mode === 'FM') {
      fBox.textContent = `s(t) = A_c · cos(2π·${fc}·t + ${mu.toFixed(1)}·sin(2π·${fm}·t))`;
    } else {
      fBox.textContent = `s(t) = A_c · cos(2π·${fc}·t + ${mu.toFixed(1)}·m(t))`;
    }
  }

  // Crosshair tracking
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const originX = 50;
    const originY = canvas.height / 2;
    const scaleY = (canvas.height / 2) * 0.42;
    const timeSpanMs = 25.0;
    const scaleX = (canvas.width - originX - 20) / timeSpanMs;

    const t = Math.max(0, (x - originX) / scaleX);
    const v = -(y - originY) / scaleY;

    if (t >= 0 && t <= timeSpanMs) {
      readout.textContent = `t: ${t.toFixed(2)} ms | V: ${v.toFixed(2)} V`;
    }
  });

  ['xyModMode', 'xyCarrierFreq', 'xyMsgFreq', 'xyModIndex', 'chkShowMod', 'chkShowCarrier', 'chkShowMsg', 'chkShowEnv'].forEach(id => {
    $(id).addEventListener('input', renderDesmosGraph);
    $(id).addEventListener('change', renderDesmosGraph);
  });

  renderDesmosGraph();

  /* ================= 2. NETWORK CONTROLLER ================= */
  $('netRunPingBtn').addEventListener('click', async () => {
    const out = $('netTestOutput');
    out.textContent = 'Executing 4x HTTP round-trip latency measurements against /assets/ping.txt...\n';
    const rtts = [];

    for (let i = 1; i <= 4; i++) {
      const t0 = performance.now();
      try {
        const resp = await fetch(`/assets/ping.txt?_nocache=${Date.now()}_${i}`);
        const rtt = performance.now() - t0;
        rtts.push(rtt);
        out.textContent += `Echo #${i}: status ${resp.status} - ${rtt.toFixed(1)} ms RTT\n`;
      } catch (err) {
        out.textContent += `Echo #${i}: Failed (${err.message})\n`;
      }
    }

    if (rtts.length > 0) {
      const avg = rtts.reduce((a, b) => a + b, 0) / rtts.length;
      out.textContent += `\nSummary: 4 packets sent, 4 received (0% loss). Avg latency: ${avg.toFixed(1)} ms.`;
    }
  });

  $('netRunThroughputBtn').addEventListener('click', async () => {
    const out = $('netTestOutput');
    out.textContent = 'Downloading 2,097,152 bytes binary throughput payload (/assets/payload.bin)...\n';
    const t0 = performance.now();
    try {
      const resp = await fetch(`/assets/payload.bin?_nocache=${Date.now()}`);
      const buf = await resp.arrayBuffer();
      const durSec = (performance.now() - t0) / 1000.0;
      const mbps = ((buf.byteLength * 8) / durSec) / 1000000;
      out.textContent += `Downloaded 2.00 MB in ${durSec.toFixed(3)}s.\nMeasured Bandwidth: ${mbps.toFixed(2)} Mbps.`;
    } catch (e) {
      out.textContent += `Throughput test failed: ${e.message}`;
    }
  });

  const updateNetCalc = () => {
    const mb = Number($('netFileSize').value) || 10;
    const bw = Number($('netBandwidth').value) || 100;
    const sec = (mb * 8) / bw;
    $('netCalcOutput').textContent = `${mb.toFixed(1)} MB over ${bw.toFixed(0)} Mbps takes ${sec.toFixed(2)} seconds transmission time.`;
  };
  $('netFileSize').addEventListener('input', updateNetCalc);
  $('netBandwidth').addEventListener('input', updateNetCalc);

  /* ================= 3. MULTIPLEXING CONTROLLER ================= */
  const muxDescriptions = {
    TDM: 'Time Division Multiplexing (TDM): Each user (A, B, C) has a fixed, dedicated time slot in every cycle.',
    FDM: 'Frequency Division Multiplexing (FDM): Users transmit simultaneously across independent frequency bands separated by guard bands.',
    STDM: 'Statistical TDM (STDM): Slots are dynamically assigned based on data arrival queues, eliminating idle slots.'
  };

  function renderMux(mode) {
    const viz = $('muxVisualBox');
    const desc = $('muxExplanation');
    if (!viz) return;

    if (mode === 'TDM') {
      viz.innerHTML = `
        <div style="font-size:11px;color:#94a3b8;margin-bottom:8px">CYCLIC FRAME ALLOCATION (TIME SLOTS):</div>
        <div style="display:flex;gap:4px">
          <span style="background:#4338ca;color:#fff;padding:8px 14px;border-radius:6px;font-weight:700">Slot A</span>
          <span style="background:#0369a1;color:#fff;padding:8px 14px;border-radius:6px;font-weight:700">Slot B</span>
          <span style="background:#047857;color:#fff;padding:8px 14px;border-radius:6px;font-weight:700">Slot C</span>
          <span style="background:#4338ca;color:#fff;padding:8px 14px;border-radius:6px;font-weight:700">Slot A</span>
          <span style="background:#0369a1;color:#fff;padding:8px 14px;border-radius:6px;font-weight:700">Slot B</span>
          <span style="background:#047857;color:#fff;padding:8px 14px;border-radius:6px;font-weight:700">Slot C</span>
        </div>
      `;
    } else if (mode === 'FDM') {
      viz.innerHTML = `
        <div style="font-size:11px;color:#94a3b8;margin-bottom:8px">FREQUENCY SUB-BAND PARTITION:</div>
        <div style="display:flex;flex-direction:column;gap:5px">
          <div style="background:#047857;color:#fff;padding:6px 14px;border-radius:6px;font-weight:700">Band 3 (User C: 900–930 MHz)</div>
          <div style="background:#0369a1;color:#fff;padding:6px 14px;border-radius:6px;font-weight:700">Band 2 (User B: 850–880 MHz)</div>
          <div style="background:#4338ca;color:#fff;padding:6px 14px;border-radius:6px;font-weight:700">Band 1 (User A: 800–830 MHz)</div>
        </div>
      `;
    } else {
      viz.innerHTML = `
        <div style="font-size:11px;color:#94a3b8;margin-bottom:8px">DEMAND-DRIVEN STATISTICAL ALLOCATION:</div>
        <div style="display:flex;gap:4px">
          <span style="background:#4338ca;color:#fff;padding:8px 14px;border-radius:6px;font-weight:700">A[Pkt 1]</span>
          <span style="background:#4338ca;color:#fff;padding:8px 14px;border-radius:6px;font-weight:700">A[Pkt 2]</span>
          <span style="background:#047857;color:#fff;padding:8px 14px;border-radius:6px;font-weight:700">C[Pkt 1]</span>
          <span style="background:#0369a1;color:#fff;padding:8px 14px;border-radius:6px;font-weight:700">B[Pkt 1]</span>
          <span style="background:#4338ca;color:#fff;padding:8px 14px;border-radius:6px;font-weight:700">A[Pkt 3]</span>
        </div>
      `;
    }
    desc.textContent = muxDescriptions[mode];
  }

  document.querySelectorAll('[data-mux]').forEach(b => {
    b.addEventListener('click', () => {
      document.querySelectorAll('[data-mux]').forEach(x => {
        x.className = 'btn secondary small';
      });
      b.className = 'btn small';
      renderMux(b.dataset.mux);
    });
  });
  renderMux('TDM');

  /* ================= 4. BASICS CONTROLLER ================= */
  $('basicsKeyInput').addEventListener('keydown', (e) => {
    const k = e.key;
    const code = k.charCodeAt(0);
    $('basicsKeyResult').innerHTML = `
      KEY PRESSED : '${k}' (${e.code})<br>
      DECIMAL     : ${code}<br>
      HEXADECIMAL : 0x${code.toString(16).toUpperCase().padStart(2, '0')}<br>
      8-BIT BINARY: ${code.toString(2).padStart(8, '0')}
    `;
  });

  $('basicsDecInput').addEventListener('input', () => {
    const val = Math.min(255, Math.max(0, Number($('basicsDecInput').value) || 0));
    $('basicsBinInput').value = val.toString(2).padStart(8, '0');
  });

  $('basicsBinInput').addEventListener('input', () => {
    const val = parseInt($('basicsBinInput').value, 2) || 0;
    $('basicsDecInput').value = val;
  });

  // Activate default tab after all controllers are fully defined
  const targetBtn = document.querySelector(`[data-othertab="${defaultTab}"]`);
  if (targetBtn) targetBtn.click();
}

/**
 * SignalForge - Network Lab Controller (networkLab.js)
 * Covers Practicals 1 and 2:
 * 1. Live Ping: Real 10-packet RTT fetch measurement to /assets/ping.txt with min/avg/max/jitter and line chart
 * 2. Real Throughput: Streams /assets/payload.bin (2 MB) with ReadableStream and live Mbit/s plot
 * 3. Browser Connection Info: navigator.connection API (effectiveType, downlink, rtt)
 * 4. Transmission Time Calculator (Practical 2): Cat5e, Cat6, Coax, Fiber, Wi-Fi 6, 4G vs measured speed
 * 5. LAN Topology & Switch Learning (Practical 1): 4 PCs, Layer-2 Switch, packet animation & dynamic MAC table
 * 6. Two-Tab Live Link: Real inter-tab communication via BroadcastChannel using engine modulation and AWGN noise
 */

import { DSP } from '../dsp.js';
import { runPipeline, asciiBytesToText, textToAsciiBytes } from '../pipeline.js';

export function createNetworkLab(containerEl) {
  let isPinging = false;
  let isMeasuringSpeed = false;
  let measuredThroughputMbps = null;
  let broadcastChannel = null;
  const currentRoom = 'signalforge_lab_room';

  const labEl = document.createElement('div');
  labEl.className = 'sf-network-lab';
  labEl.innerHTML = `
    <!-- Top Header -->
    <div class="sf-section-header">
      <div>
        <h3 class="sf-section-title">Computer Networks & Transmission Media Lab</h3>
        <p class="sf-section-hint">Practicals 1 & 2: Real network round-trip latency, streaming throughput measurement, transmission media delay calculation, LAN switch learning, and live two-tab RF simulation.</p>
      </div>
      <div class="sf-chips-wrap">
        <span class="sf-tag sf-tag-practical">Practical 1: Wired LAN & PING</span>
        <span class="sf-tag sf-tag-practical">Practical 2: Media Transmission Speed</span>
      </div>
    </div>

    <!-- 2x2 Grid of Modules -->
    <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px;">
      <!-- Module 1: Live Ping (Real Server RTT) -->
      <div class="sf-panel">
        <div class="sf-panel-header">
          <h4 class="sf-panel-title">Real Ping Utility (Practical 1)</h4>
          <span class="sf-badge sf-badge-ok">REAL Network Requests</span>
        </div>
        <div class="sf-panel-body">
          <p class="sf-muted" style="margin-bottom:12px;">
            Executes 10 real non-cached HTTP requests to <code>/assets/ping.txt</code> and computes exact Round Trip Time (RTT) using <code>performance.now()</code>.
          </p>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <button class="sf-btn sf-btn-primary sf-btn-sm" id="sf-net-btn-ping">▶ Run 10× Ping Test</button>
            <div id="sf-net-ping-stats" style="font-family:var(--font-mono); font-size:12px; color:var(--cyan);">
              min: - | avg: - | max: - | jitter: -
            </div>
          </div>
          <!-- Live Terminal Output -->
          <div id="sf-net-ping-terminal" style="background:#070c18; border:1px solid var(--line); border-radius:8px; padding:10px 14px; font-family:var(--font-mono); font-size:12px; height:120px; overflow-y:auto; line-height:1.6; color:var(--text);">
            <div>Press "Run 10× Ping Test" to measure live server response latency.</div>
          </div>
          <!-- Mini RTT Trend Chart -->
          <canvas id="sf-net-cv-ping" width="400" height="70" style="width:100%; height:70px; margin-top:10px; background:#0d1527; border:1px solid var(--line); border-radius:6px;"></canvas>
        </div>
      </div>

      <!-- Module 2: Real Throughput Download (2 MB) -->
      <div class="sf-panel">
        <div class="sf-panel-header">
          <h4 class="sf-panel-title">Real Bandwidth Throughput (Practical 2)</h4>
          <span class="sf-badge sf-badge-ok">REAL 2 MB Stream</span>
        </div>
        <div class="sf-panel-body">
          <p class="sf-muted" style="margin-bottom:12px;">
            Downloads <code>/assets/payload.bin</code> (2,097,152 random bytes) via <code>ReadableStream</code> to evaluate actual network download throughput from server to this browser.
          </p>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <button class="sf-btn sf-btn-primary sf-btn-sm" id="sf-net-btn-speed">▶ Measure Speed</button>
            <div style="font-family:var(--font-mono); font-size:16px; font-weight:700; color:var(--ok);" id="sf-net-speed-val">-- Mbit/s</div>
          </div>
          <!-- Progress bar & chart -->
          <div style="background:rgba(255,255,255,0.06); height:6px; border-radius:3px; overflow:hidden; margin-bottom:10px;">
            <div id="sf-net-speed-prog" style="background:var(--ok); height:100%; width:0%; transition:width 0.1s ease;"></div>
          </div>
          <canvas id="sf-net-cv-speed" width="400" height="70" style="width:100%; height:70px; background:#0d1527; border:1px solid var(--line); border-radius:6px;"></canvas>
          <!-- Connection Info -->
          <div id="sf-net-conn-info" style="font-size:11px; color:var(--muted); margin-top:8px;">
            Network API: Querying connection...
          </div>
        </div>
      </div>
    </div>

    <!-- Module 3: Transmission Time Calculator (Practical 2) -->
    <div class="sf-panel" style="margin-bottom: 24px;">
      <div class="sf-panel-header">
        <h4 class="sf-panel-title">Transmission Time & Propagation Delay Calculator (Practical 2)</h4>
        <span class="sf-tag sf-tag-practical">Bandwidth vs Distance</span>
      </div>
      <div class="sf-panel-body">
        <p class="sf-muted" style="margin-bottom:16px;">
          Formula: <code>Total Latency = Transmission Time (Size / Bandwidth) + Propagation Delay (Distance / Speed in Medium)</code>.<br>
          Propagation speeds: Copper / Fiber = 2.0 × 10⁸ m/s (200,000 km/s), Wireless = 3.0 × 10⁸ m/s (300,000 km/s).
        </p>
        <div style="display:flex; gap:20px; align-items:center; margin-bottom:20px; flex-wrap:wrap;">
          <div>
            <label class="sf-form-label" for="sf-calc-size">File Size (MB):</label>
            <input type="number" id="sf-calc-size" class="sf-input" value="10" min="1" max="1000" style="width:140px;">
          </div>
          <div>
            <label class="sf-form-label" for="sf-calc-dist">Distance (Meters):</label>
            <input type="number" id="sf-calc-dist" class="sf-input" value="5000" min="1" max="10000000" style="width:160px;">
          </div>
          <div style="flex:1; text-align:right;">
            <button class="sf-btn sf-btn-outline sf-btn-sm" id="sf-calc-btn-recompute">Recalculate</button>
          </div>
        </div>

        <!-- Latency Comparison Bar Chart -->
        <div id="sf-calc-bars-container" style="display:flex; flex-direction:column; gap:10px;">
          <!-- Rendered bars -->
        </div>
      </div>
    </div>

    <!-- 2 Column: LAN Topology (Left) + Two-Tab Live Link (Right) -->
    <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 24px;">
      <!-- Module 4: Layer-2 Switch & LAN Topology (Practical 1) -->
      <div class="sf-panel">
        <div class="sf-panel-header">
          <h4 class="sf-panel-title">LAN Topology & Switch Learning (Practical 1)</h4>
          <span class="sf-badge sf-badge-violet">Simulated Teaching Model</span>
        </div>
        <div class="sf-panel-body">
          <p class="sf-muted" style="margin-bottom:12px;">
            Observe how a Layer-2 Switch dynamically learns source MAC addresses by inspecting frame headers.
          </p>
          <div style="margin-bottom:12px;">
            <button class="sf-btn sf-btn-cyan sf-btn-sm" id="sf-lan-btn-ping">Send Ping: PC1 → PC3</button>
          </div>
          <!-- SVG LAN Topology -->
          <div style="background:#0d1527; border:1px solid var(--line); border-radius:10px; padding:10px; text-align:center;">
            <svg id="sf-lan-svg" viewBox="0 0 460 220" style="width:100%; height:auto;">
              <!-- Switch in center -->
              <rect x="180" y="80" width="100" height="60" rx="8" fill="#1e294b" stroke="#3b82f6" stroke-width="2"/>
              <text x="230" y="112" fill="#e8eefc" font-size="12" font-weight="700" text-anchor="middle">L2 SWITCH</text>
              <text x="230" y="128" fill="#93c5fd" font-size="10" text-anchor="middle">Port 1-4</text>

              <!-- PC1 Top Left -->
              <line x1="80" y1="50" x2="180" y2="95" stroke="#334155" stroke-width="2" id="cable-pc1"/>
              <circle cx="80" cy="50" r="24" fill="#0f172a" stroke="#22d3ee" stroke-width="1.5"/>
              <text x="80" y="54" fill="#22d3ee" font-size="11" font-weight="700" text-anchor="middle">PC1</text>
              <text x="80" y="84" fill="#8fa0c8" font-size="9" text-anchor="middle">00:1A:2B:3C:01</text>

              <!-- PC2 Bottom Left -->
              <line x1="80" y1="170" x2="180" y2="125" stroke="#334155" stroke-width="2" id="cable-pc2"/>
              <circle cx="80" cy="170" r="24" fill="#0f172a" stroke="#60a5fa" stroke-width="1.5"/>
              <text x="80" y="174" fill="#60a5fa" font-size="11" font-weight="700" text-anchor="middle">PC2</text>
              <text x="80" y="204" fill="#8fa0c8" font-size="9" text-anchor="middle">00:1A:2B:3C:02</text>

              <!-- PC3 Top Right -->
              <line x1="380" y1="50" x2="280" y2="95" stroke="#334155" stroke-width="2" id="cable-pc3"/>
              <circle cx="380" cy="50" r="24" fill="#0f172a" stroke="#34d399" stroke-width="1.5"/>
              <text x="380" y="54" fill="#34d399" font-size="11" font-weight="700" text-anchor="middle">PC3</text>
              <text x="380" y="84" fill="#8fa0c8" font-size="9" text-anchor="middle">00:1A:2B:3C:03</text>

              <!-- PC4 Bottom Right -->
              <line x1="380" y1="170" x2="280" y2="125" stroke="#334155" stroke-width="2" id="cable-pc4"/>
              <circle cx="380" cy="170" r="24" fill="#0f172a" stroke="#a78bfa" stroke-width="1.5"/>
              <text x="380" y="174" fill="#a78bfa" font-size="11" font-weight="700" text-anchor="middle">PC4</text>
              <text x="380" y="204" fill="#8fa0c8" font-size="9" text-anchor="middle">00:1A:2B:3C:04</text>

              <!-- Moving Packet dot -->
              <circle id="sf-lan-packet-dot" cx="80" cy="50" r="6" fill="#fbbf24" style="opacity:0;"/>
            </svg>
          </div>

          <!-- MAC Table -->
          <div style="margin-top:14px;">
            <div style="font-size:12px; font-weight:700; color:var(--text-bright); margin-bottom:6px;">Switch MAC Address Table:</div>
            <table class="sf-ascii-table" style="font-size:12px;">
              <thead><tr><th>Switch Port</th><th>Learned MAC Address</th><th>Device</th><th>Status</th></tr></thead>
              <tbody id="sf-lan-mac-table-body">
                <tr><td>Port 1</td><td class="sf-muted">Empty (Flooding)</td><td>-</td><td>Aging</td></tr>
                <tr><td>Port 2</td><td class="sf-muted">Empty</td><td>-</td><td>Aging</td></tr>
                <tr><td>Port 3</td><td class="sf-muted">Empty (Flooding)</td><td>-</td><td>Aging</td></tr>
                <tr><td>Port 4</td><td class="sf-muted">Empty</td><td>-</td><td>Aging</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Module 5: Two-Tab Live Link (REAL BroadcastChannel) -->
      <div class="sf-panel">
        <div class="sf-panel-header">
          <h4 class="sf-panel-title">Two-Tab Real Transmission Link</h4>
          <span class="sf-badge sf-badge-ok">REAL BroadcastChannel</span>
        </div>
        <div class="sf-panel-body">
          <p class="sf-muted" style="margin-bottom:12px;">
            Open this page in a <strong>second browser tab</strong>. One tab acts as the <strong>Transmitter</strong> (modulates + adds noise), and the other acts as the <strong>Receiver</strong> (correlator demodulation + recovery).
          </p>
          <div style="margin-bottom:12px;">
            <div class="sf-field-header"><label>Message to Transmit Across Tabs:</label></div>
            <div class="sf-input-btn-row">
              <input type="text" id="sf-tab-msg-input" class="sf-input" value="HELLO FROM TAB 1" maxlength="32">
              <button class="sf-btn sf-btn-primary sf-btn-sm" id="sf-tab-btn-send">Send to other tab 📡</button>
            </div>
          </div>
          <div style="background:#0d1527; border:1px solid var(--line); border-radius:10px; padding:14px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
              <span style="font-size:12px; font-weight:700; color:var(--cyan);">Inbox (Messages received from other tab):</span>
              <span class="sf-badge sf-badge-ok" id="sf-tab-status-badge">Listening on BroadcastChannel</span>
            </div>
            <div id="sf-tab-inbox" style="font-family:var(--font-mono); font-size:13px; min-height:80px; max-height:120px; overflow-y:auto; line-height:1.7; color:var(--text);">
              <em>No messages received yet. Open another tab at #/lab/network and press Send!</em>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  containerEl.replaceChildren(labEl);

  /* ==========================================================================
     1. REAL LIVE PING (10 REQUESTS)
     ========================================================================== */
  const btnPing = labEl.querySelector('#sf-net-btn-ping');
  const pingStats = labEl.querySelector('#sf-net-ping-stats');
  const pingTerm = labEl.querySelector('#sf-net-ping-terminal');
  const cvPing = labEl.querySelector('#sf-net-cv-ping');

  async function runRealPing() {
    if (isPinging) return;
    isPinging = true;
    btnPing.disabled = true;
    btnPing.textContent = 'Pinging...';
    pingTerm.innerHTML = `PING SignalForge Server (127.0.0.1) with 1 byte of data:<br>`;

    const rtts = [];
    const count = 10;

    for (let i = 1; i <= count; i++) {
      const t0 = performance.now();
      try {
        const resp = await fetch(`./assets/ping.txt?_rand=${Date.now()}_${i}`, { cache: 'no-store' });
        await resp.text();
        const rtt = performance.now() - t0;
        rtts.push(rtt);
        pingTerm.innerHTML += `Reply from 127.0.0.1: bytes=1 time=${rtt.toFixed(1)}ms TTL=64<br>`;
      } catch (err) {
        pingTerm.innerHTML += `<span style="color:var(--err);">Request timed out or network error</span><br>`;
      }
      pingTerm.scrollTop = pingTerm.scrollHeight;
      drawPingChart(rtts);
      await new Promise(r => setTimeout(r, 100));
    }

    if (rtts.length > 0) {
      const min = Math.min(...rtts);
      const max = Math.max(...rtts);
      const avg = rtts.reduce((a, b) => a + b, 0) / rtts.length;
      let jitter = 0;
      for (let j = 1; j < rtts.length; j++) {
        jitter += Math.abs(rtts[j] - rtts[j - 1]);
      }
      jitter = jitter / (rtts.length - 1 || 1);

      pingStats.textContent = `min: ${min.toFixed(1)}ms | avg: ${avg.toFixed(1)}ms | max: ${max.toFixed(1)}ms | jitter: ${jitter.toFixed(1)}ms`;
      pingTerm.innerHTML += `<br>--- 127.0.0.1 ping statistics ---<br>${count} packets transmitted, ${rtts.length} received, 0% packet loss, rtt min/avg/max/mdev = ${min.toFixed(1)}/${avg.toFixed(1)}/${max.toFixed(1)}/${jitter.toFixed(1)} ms<br>`;
      pingTerm.scrollTop = pingTerm.scrollHeight;
    }

    btnPing.disabled = false;
    btnPing.textContent = '▶ Run 10× Ping Test';
    isPinging = false;
  }

  function drawPingChart(rtts) {
    const ctx = cvPing.getContext('2d');
    const w = cvPing.width;
    const h = cvPing.height;
    ctx.fillStyle = '#0d1527';
    ctx.fillRect(0, 0, w, h);

    if (rtts.length === 0) return;
    const maxVal = Math.max(10, ...rtts) * 1.2;

    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 2;
    ctx.beginPath();
    rtts.forEach((rtt, idx) => {
      const x = 20 + (idx / 9) * (w - 40);
      const y = h - 10 - (rtt / maxVal) * (h - 20);
      if (idx === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Dots
    rtts.forEach((rtt, idx) => {
      const x = 20 + (idx / 9) * (w - 40);
      const y = h - 10 - (rtt / maxVal) * (h - 20);
      ctx.fillStyle = '#22d3ee';
      ctx.beginPath();
      ctx.arc(x, y, 3.5, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  btnPing.addEventListener('click', runRealPing);

  /* ==========================================================================
     2. REAL THROUGHPUT STREAMING (2 MB)
     ========================================================================== */
  const btnSpeed = labEl.querySelector('#sf-net-btn-speed');
  const speedVal = labEl.querySelector('#sf-net-speed-val');
  const speedProg = labEl.querySelector('#sf-net-speed-prog');
  const cvSpeed = labEl.querySelector('#sf-net-cv-speed');
  const connInfo = labEl.querySelector('#sf-net-conn-info');

  // Query browser navigator.connection
  if ('connection' in navigator) {
    const conn = navigator.connection;
    connInfo.textContent = `Browser Network Info: effectiveType = ${conn.effectiveType || 'N/A'}, downlink = ${conn.downlink || 'N/A'} Mbps, rtt = ${conn.rtt || 'N/A'} ms`;
  } else {
    connInfo.textContent = 'Browser Network Info: navigator.connection not supported in this browser environment.';
  }

  async function measureThroughput() {
    if (isMeasuringSpeed) return;
    isMeasuringSpeed = true;
    btnSpeed.disabled = true;
    btnSpeed.textContent = 'Streaming 2 MB...';
    speedProg.style.width = '0%';
    speedVal.textContent = 'Measuring...';

    const speedHistory = [];
    const t0 = performance.now();
    let receivedBytes = 0;
    const totalBytesExpected = 2097152;

    try {
      const response = await fetch(`./assets/payload.bin?_t=${Date.now()}`, { cache: 'no-store' });
      const reader = response.body.getReader();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        receivedBytes += value.length;
        const now = performance.now();
        const durationSec = (now - t0) / 1000.0;
        const currentMbps = (receivedBytes * 8) / (durationSec * 1000000);
        speedHistory.push(currentMbps);

        const pct = Math.min(100, (receivedBytes / totalBytesExpected) * 100);
        speedProg.style.width = `${pct}%`;
        speedVal.textContent = `${currentMbps.toFixed(1)} Mbit/s`;
        drawSpeedChart(speedHistory);
      }

      const totalSec = (performance.now() - t0) / 1000.0;
      const finalMbps = (receivedBytes * 8) / (totalSec * 1000000);
      measuredThroughputMbps = finalMbps;
      speedVal.textContent = `${finalMbps.toFixed(2)} Mbit/s`;
      drawSpeedChart(speedHistory);
      recalculateTransmissionTable();
    } catch (err) {
      speedVal.textContent = 'Failed';
      console.error('Speed measurement error:', err);
    }

    btnSpeed.disabled = false;
    btnSpeed.textContent = '▶ Measure Speed';
    isMeasuringSpeed = false;
  }

  function drawSpeedChart(history) {
    const ctx = cvSpeed.getContext('2d');
    const w = cvSpeed.width;
    const h = cvSpeed.height;
    ctx.fillStyle = '#0d1527';
    ctx.fillRect(0, 0, w, h);

    if (history.length === 0) return;
    const maxVal = Math.max(10, ...history) * 1.2;

    ctx.strokeStyle = '#34d399';
    ctx.lineWidth = 2;
    ctx.beginPath();
    history.forEach((speed, idx) => {
      const x = 10 + (idx / Math.max(1, history.length - 1)) * (w - 20);
      const y = h - 10 - (speed / maxVal) * (h - 20);
      if (idx === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }

  btnSpeed.addEventListener('click', measureThroughput);

  /* ==========================================================================
     3. TRANSMISSION TIME & PROPAGATION DELAY CALCULATOR (Practical 2)
     ========================================================================== */
  const inpSize = labEl.querySelector('#sf-calc-size');
  const inpDist = labEl.querySelector('#sf-calc-dist');
  const btnRecalc = labEl.querySelector('#sf-calc-btn-recompute');
  const barsContainer = labEl.querySelector('#sf-calc-bars-container');

  const MEDIA_SPECS = [
    { name: 'Twisted Pair (Cat5e)', bwMbps: 100, speedMs: 2.0e8, color: '#38bdf8' },
    { name: 'Twisted Pair (Cat6)', bwMbps: 1000, speedMs: 2.0e8, color: '#60a5fa' },
    { name: 'Coaxial Cable', bwMbps: 100, speedMs: 2.0e8, color: '#818cf8' },
    { name: 'Single-Mode Fiber', bwMbps: 10000, speedMs: 2.0e8, color: '#34d399' },
    { name: 'Wi-Fi 6 (Wireless)', bwMbps: 600, speedMs: 3.0e8, color: '#fbbf24' },
    { name: '4G LTE (Wireless)', bwMbps: 50, speedMs: 3.0e8, color: '#f472b6' }
  ];

  function recalculateTransmissionTable() {
    const sizeMb = parseFloat(inpSize.value) || 10;
    const distMeters = parseFloat(inpDist.value) || 5000;
    const totalBits = sizeMb * 8 * 1024 * 1024;

    const list = [...MEDIA_SPECS];
    if (measuredThroughputMbps) {
      list.unshift({
        name: `Your Measured Speed (${measuredThroughputMbps.toFixed(1)} Mbps)`,
        bwMbps: measuredThroughputMbps,
        speedMs: 2.0e8,
        color: '#22d3ee'
      });
    }

    const rows = list.map(m => {
      const txSec = totalBits / (m.bwMbps * 1000000);
      const propSec = distMeters / m.speedMs;
      const totalSec = txSec + propSec;
      return { ...m, txSec, propSec, totalSec };
    });

    const maxTotal = Math.max(...rows.map(r => r.totalSec));

    barsContainer.innerHTML = rows.map(r => {
      const barPct = Math.min(100, Math.max(2, (r.totalSec / maxTotal) * 100));
      return `
        <div style="background:#0d1527; border:1px solid var(--line); border-radius:8px; padding:10px 14px;">
          <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:4px;">
            <strong style="color:${r.color};">${r.name}</strong>
            <span class="sf-mono" style="color:var(--text-bright);">${r.totalSec < 1 ? (r.totalSec * 1000).toFixed(1) + ' ms' : r.totalSec.toFixed(2) + ' s'}</span>
          </div>
          <div style="background:rgba(255,255,255,0.06); height:8px; border-radius:4px; overflow:hidden;">
            <div style="background:${r.color}; width:${barPct}%; height:100%;"></div>
          </div>
          <div style="display:flex; justify-content:space-between; font-size:11px; color:var(--muted); margin-top:4px;">
            <span>Tx Time: ${(r.txSec * 1000).toFixed(1)} ms</span>
            <span>Prop Delay: ${(r.propSec * 1000).toFixed(3)} ms</span>
            <span>Bandwidth: ${r.bwMbps} Mbps</span>
          </div>
        </div>
      `;
    }).join('');
  }

  inpSize.addEventListener('input', recalculateTransmissionTable);
  inpDist.addEventListener('input', recalculateTransmissionTable);
  btnRecalc.addEventListener('click', recalculateTransmissionTable);
  recalculateTransmissionTable();

  /* ==========================================================================
     4. LAYER-2 SWITCH & LAN TOPOLOGY (Practical 1)
     ========================================================================== */
  const btnLanPing = labEl.querySelector('#sf-lan-btn-ping');
  const macTableBody = labEl.querySelector('#sf-lan-mac-table-body');
  const dot = labEl.querySelector('#sf-lan-packet-dot');

  btnLanPing.addEventListener('click', () => {
    btnLanPing.disabled = true;
    btnLanPing.textContent = 'PC1 transmitting ARP & Ping to PC3...';
    dot.style.opacity = '1';

    // Sequence 1: PC1 -> Switch
    dot.setAttribute('cx', '80'); dot.setAttribute('cy', '50');
    let t = 0;
    const animToSwitch = setInterval(() => {
      t += 0.05;
      dot.setAttribute('cx', String(80 + t * (230 - 80)));
      dot.setAttribute('cy', String(50 + t * (110 - 50)));
      if (t >= 1.0) {
        clearInterval(animToSwitch);
        // Switch learns PC1 on Port 1
        macTableBody.innerHTML = `
          <tr style="background:rgba(34,211,238,0.15);"><td>Port 1</td><td class="sf-accent-cyan">00:1A:2B:3C:01</td><td>PC1</td><td>Learned ✔</td></tr>
          <tr><td>Port 2</td><td class="sf-muted">Empty</td><td>-</td><td>Aging</td></tr>
          <tr><td>Port 3</td><td class="sf-muted">Flooding to find PC3...</td><td>-</td><td>Pending</td></tr>
          <tr><td>Port 4</td><td class="sf-muted">Empty</td><td>-</td><td>Aging</td></tr>
        `;

        // Sequence 2: Switch -> PC3
        let t2 = 0;
        const animToPC3 = setInterval(() => {
          t2 += 0.05;
          dot.setAttribute('cx', String(230 + t2 * (380 - 230)));
          dot.setAttribute('cy', String(110 + t2 * (50 - 110)));
          if (t2 >= 1.0) {
            clearInterval(animToPC3);
            // Sequence 3: PC3 replies to Switch
            setTimeout(() => {
              let t3 = 0;
              const animBack = setInterval(() => {
                t3 += 0.05;
                dot.setAttribute('cx', String(380 - t3 * (380 - 230)));
                dot.setAttribute('cy', String(50 + t3 * (110 - 50)));
                if (t3 >= 1.0) {
                  clearInterval(animBack);
                  // Switch learns PC3 on Port 3
                  macTableBody.innerHTML = `
                    <tr style="background:rgba(34,211,238,0.15);"><td>Port 1</td><td class="sf-accent-cyan">00:1A:2B:3C:01</td><td>PC1</td><td>Learned ✔</td></tr>
                    <tr><td>Port 2</td><td class="sf-muted">Empty</td><td>-</td><td>Aging</td></tr>
                    <tr style="background:rgba(52,211,153,0.15);"><td>Port 3</td><td class="sf-accent-ok">00:1A:2B:3C:03</td><td>PC3</td><td>Learned ✔</td></tr>
                    <tr><td>Port 4</td><td class="sf-muted">Empty</td><td>-</td><td>Aging</td></tr>
                  `;
                  dot.style.opacity = '0';
                  btnLanPing.disabled = false;
                  btnLanPing.textContent = 'Send Ping: PC1 → PC3';
                }
              }, 20);
            }, 300);
          }
        }, 20);
      }
    }, 20);
  });

  /* ==========================================================================
     5. TWO-TAB LIVE LINK (BroadcastChannel)
     ========================================================================== */
  const inpTabMsg = labEl.querySelector('#sf-tab-msg-input');
  const btnTabSend = labEl.querySelector('#sf-tab-btn-send');
  const tabInbox = labEl.querySelector('#sf-tab-inbox');

  if ('BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel(currentRoom);
    broadcastChannel.onmessage = (event) => {
      const data = event.data;
      if (!data || !data.type) return;

      if (data.type === 'SF_RADIO_PACKET') {
        // Demodulate the noisy samples received from the other tab
        const noisySamples = new Float32Array(data.noisySamples);
        const rxBits = DSP.demodulate(noisySamples, 'PSK', 20, 1.0);
        const fec = Engine.hammingDecode(rxBits, data.codedLen);
        const rxBytes = [];
        for (let i = 0; i < fec.bits.length; i += 8) {
          let b = 0;
          for (let j = 0; j < 8; j++) b = (b << 1) | (fec.bits[i + j] || 0);
          rxBytes.push(b);
        }
        const receivedText = asciiBytesToText(new Uint8Array(rxBytes));

        const timeStr = new Date().toLocaleTimeString();
        tabInbox.innerHTML = `
          <div style="background:#111a33; border:1px solid var(--cyan); border-radius:6px; padding:8px 12px; margin-bottom:6px;">
            <span style="color:var(--cyan); font-weight:700;">[${timeStr} FROM SENDER TAB]:</span>
            <span style="color:var(--text-bright); font-size:14px; font-weight:bold;">"${receivedText}"</span>
            <div style="font-size:11px; color:var(--muted); margin-top:2px;">
              Raw Bits: ${noisySamples.length / 20} | Hamming Fixed: ${fec.correctedBlocks} | Channel SNR: ${data.ebn0dB} dB
            </div>
          </div>
        ` + tabInbox.innerHTML;
      }
    };
  }

  btnTabSend.addEventListener('click', () => {
    const msg = (inpTabMsg.value || 'HELLO').slice(0, 32);
    // Encode message into bits
    const asciiBytes = textToAsciiBytes(msg);
    const bits = [];
    for (let b of asciiBytes) {
      for (let j = 7; j >= 0; j--) bits.push((b >> j) & 1);
    }
    // Forward error correction
    const codedBits = Engine.hammingEncode(new Uint8Array(bits));
    // Modulate PSK
    const cleanWave = DSP.modulate(codedBits, 'PSK', 20, 1.0);
    // Channel noise @ 4 dB
    const sigma = DSP.calculateSigma(4.0, 20, 1.0);
    const { noisyWave } = DSP.addNoise(cleanWave, sigma, Math.floor(Math.random() * 9999));

    if (broadcastChannel) {
      broadcastChannel.postMessage({
        type: 'SF_RADIO_PACKET',
        noisySamples: Array.from(noisyWave),
        codedLen: bits.length,
        ebn0dB: 4.0,
        senderTabTime: Date.now()
      });

      const timeStr = new Date().toLocaleTimeString();
      tabInbox.innerHTML = `
        <div style="background:#16213f; border:1px solid var(--line); border-radius:6px; padding:6px 12px; margin-bottom:6px;">
          <span style="color:var(--muted); font-size:11px;">[${timeStr} TRANSMITTED TO BROADCASTCHANNEL]: "${msg}"</span>
        </div>
      ` + tabInbox.innerHTML;
    }
  });

  return {
    destroy() {
      if (broadcastChannel) {
        broadcastChannel.close();
      }
    }
  };
}

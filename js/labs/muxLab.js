/**
 * SignalForge - Multiplexing Lab Controller (muxLab.js)
 * Covers Practical 8:
 * 1. Time-Division Multiplexing (TDM): Synchronous frame interleaving [A B C | A B C], slot duration control, animated timeline.
 * 2. Frequency-Division Multiplexing (FDM): Frequency spectrum allocation, guard bands, composite waveform, bandpass filtering.
 * 3. Statistical TDM (STDM): Dynamic demand-based slot allocation with silence probability, header tagging, and bandwidth efficiency calculation.
 */

export const USER_COLORS = {
  A: '#22d3ee', // Cyan
  B: '#a78bfa', // Violet
  C: '#34d399'  // Green
};

export function createMuxLab(containerEl) {
  let activeTab = 'tdm'; // 'tdm' | 'fdm' | 'stdm'
  let isPlaying = true;
  let animTimer = null;

  // State
  let userTexts = { A: 'AAA', B: 'BBB', C: 'CCC' };
  let slotDurationMs = 400;
  let guardBandHz = 4.0;
  let silenceProb = 0.5; // 50% idle chance

  const labEl = document.createElement('div');
  labEl.className = 'sf-mux-lab';
  labEl.innerHTML = `
    <!-- Top Header & Sub-lab Switcher -->
    <div class="sf-section-header">
      <div>
        <h3 class="sf-section-title">Channel Multiplexing Laboratory</h3>
        <p class="sf-section-hint">Practical 8: Compare how multiple users share one physical channel: Time-Division (TDM), Frequency-Division (FDM), and Statistical Time-Division (STDM).</p>
      </div>
      <div class="sf-segmented-ctrl" id="sf-mux-tab-ctrl">
        <button class="sf-seg-btn active" data-tab="tdm">⏱ TDM (Synchronous)</button>
        <button class="sf-seg-btn" data-tab="fdm">📻 FDM (Frequency Bands)</button>
        <button class="sf-seg-btn" data-tab="stdm">⚡ STDM (Statistical On-Demand)</button>
      </div>
    </div>

    <!-- User Data Inputs Header (Common across all tabs) -->
    <div class="sf-panel" style="margin-bottom:20px;">
      <div class="sf-panel-header">
        <h4 class="sf-panel-title">Active Transmitting Channels (3 Users)</h4>
        <span class="sf-tag sf-tag-practical">Practical 8: Multiplexing</span>
      </div>
      <div class="sf-panel-body" style="display:grid; grid-template-columns: repeat(3, 1fr); gap:16px;">
        <div>
          <label class="sf-form-label" style="color:var(--cyan);">User A (Port 1)</label>
          <input type="text" id="sf-mux-inp-a" class="sf-input" value="AAA" maxlength="8">
        </div>
        <div>
          <label class="sf-form-label" style="color:var(--violet);">User B (Port 2)</label>
          <input type="text" id="sf-mux-inp-b" class="sf-input" value="BBB" maxlength="8">
        </div>
        <div>
          <label class="sf-form-label" style="color:var(--ok);">User C (Port 3)</label>
          <input type="text" id="sf-mux-inp-c" class="sf-input" value="CCC" maxlength="8">
        </div>
      </div>
    </div>

    <!-- ================= 1. TDM TAB ================= -->
    <div class="sf-mux-content" id="sf-mux-tdm-tab">
      <div class="sf-lab-grid">
        <!-- Controls -->
        <aside class="sf-panel sf-lab-controls">
          <div class="sf-panel-header"><h4 class="sf-panel-title">TDM Parameters</h4></div>
          <div class="sf-panel-body">
            <p class="sf-muted" style="margin-bottom:14px;">
              Synchronous TDM divides time into repetitive frames. Each user is guaranteed a fixed, equal time slot in every frame cycle.
            </p>
            <div class="sf-ctrl-group">
              <div class="sf-slider-header">
                <label for="sf-sl-tdm-speed">Slot Dwell Duration</label>
                <span id="sf-val-tdm-speed" class="sf-mono sf-accent-cyan">400 ms</span>
              </div>
              <input type="range" id="sf-sl-tdm-speed" class="sf-slider" min="150" max="1000" step="50" value="400">
            </div>
            <div class="sf-actions-stack" style="margin-top:20px;">
              <button class="sf-btn sf-btn-outline sf-btn-sm" id="sf-tdm-btn-toggle">⏸ Pause Animation</button>
            </div>
          </div>
        </aside>

        <!-- Timeline Display -->
        <main class="sf-lab-inspect-col">
          <div class="sf-panel">
            <div class="sf-panel-header">
              <h4 class="sf-panel-title">TDM Frame Sequence Timeline [A B C | A B C]</h4>
              <span class="sf-badge sf-badge-ok" id="sf-tdm-active-slot">Active Slot: User A</span>
            </div>
            <div class="sf-panel-body">
              <div style="font-size:12px; color:var(--muted); margin-bottom:12px;">Physical Channel Time Stream (Frames travel right to left):</div>
              <div id="sf-tdm-timeline-box" style="display:flex; gap:8px; background:#070c18; padding:18px; border:1px solid var(--line); border-radius:12px; overflow-x:hidden; min-height:80px; align-items:center;">
                <!-- Dynamic moving slot cards -->
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>

    <!-- ================= 2. FDM TAB ================= -->
    <div class="sf-mux-content" id="sf-mux-fdm-tab" style="display:none;">
      <div class="sf-lab-grid">
        <!-- Controls -->
        <aside class="sf-panel sf-lab-controls">
          <div class="sf-panel-header"><h4 class="sf-panel-title">FDM Parameters</h4></div>
          <div class="sf-panel-body">
            <p class="sf-muted" style="margin-bottom:14px;">
              FDM assigns each user a distinct carrier frequency band. Guard bands prevent adjacent-channel interference.
            </p>
            <div class="sf-ctrl-group">
              <div class="sf-slider-header">
                <label for="sf-sl-fdm-gb">Guard Band Width</label>
                <span id="sf-val-fdm-gb" class="sf-mono sf-accent-cyan">4.0 Hz</span>
              </div>
              <input type="range" id="sf-sl-fdm-gb" class="sf-slider" min="1" max="10" step="0.5" value="4.0">
            </div>
            <div class="sf-actions-stack" style="margin-top:20px;">
              <button class="sf-btn sf-btn-primary sf-btn-sm" id="sf-fdm-btn-filter">🔍 Filter & Demux User B (Violet)</button>
            </div>
          </div>
        </aside>

        <!-- Spectrum and Composite Waveform -->
        <main class="sf-lab-inspect-col">
          <div class="sf-panel">
            <div class="sf-panel-header">
              <h4 class="sf-panel-title">Frequency Spectrum & Composite Channel Waveform</h4>
              <div id="sf-fdm-status" style="font-family:var(--font-mono); font-size:12px; color:var(--cyan);">Total Channel BW: 36 Hz</div>
            </div>
            <div class="sf-panel-body" style="display:flex; flex-direction:column; gap:16px;">
              <!-- 1. Frequency Spectrum Axis -->
              <div>
                <div style="font-size:12px; font-weight:700; color:var(--cyan); margin-bottom:6px;">1. Frequency Spectrum Allocation (fA = 10Hz, fB = 20Hz, fC = 30Hz)</div>
                <canvas id="sf-cv-fdm-spec" width="600" height="90" style="width:100%; height:90px; background:#0d1527; border:1px solid var(--line); border-radius:8px;"></canvas>
              </div>

              <!-- 2. Composite Waveform -->
              <div>
                <div style="font-size:12px; font-weight:700; color:var(--ok); margin-bottom:6px;">2. Transmitted Composite Waveform s_total(t) = sA(t) + sB(t) + sC(t)</div>
                <canvas id="sf-cv-fdm-comp" width="600" height="90" style="width:100%; height:90px; background:#0d1527; border:1px solid var(--line); border-radius:8px;"></canvas>
              </div>

              <!-- 3. Demux Filtered Waveform -->
              <div>
                <div style="font-size:12px; font-weight:700; color:var(--violet); margin-bottom:6px;" id="sf-lbl-fdm-demux">3. Bandpass Filter Output (Filtered User B Channel)</div>
                <canvas id="sf-cv-fdm-demux" width="600" height="80" style="width:100%; height:80px; background:#0d1527; border:1px solid var(--line); border-radius:8px;"></canvas>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>

    <!-- ================= 3. STDM TAB ================= -->
    <div class="sf-mux-content" id="sf-mux-stdm-tab" style="display:none;">
      <div class="sf-lab-grid">
        <!-- Controls -->
        <aside class="sf-panel sf-lab-controls">
          <div class="sf-panel-header"><h4 class="sf-panel-title">Statistical TDM Parameters</h4></div>
          <div class="sf-panel-body">
            <p class="sf-muted" style="margin-bottom:14px;">
              In Statistical TDM, slots are not reserved for idle users. Each transmission slot carries an address tag identifying the sending station.
            </p>
            <div class="sf-ctrl-group">
              <div class="sf-slider-header">
                <label for="sf-sl-stdm-silence">User Silence Probability</label>
                <span id="sf-val-stdm-silence" class="sf-mono sf-accent-cyan">50% Idle</span>
              </div>
              <input type="range" id="sf-sl-stdm-silence" class="sf-slider" min="0" max="0.9" step="0.1" value="0.5">
            </div>
            <div class="sf-actions-stack" style="margin-top:20px;">
              <button class="sf-btn sf-btn-outline sf-btn-sm" id="sf-stdm-btn-generate">🎲 Generate New Demand Traffic</button>
            </div>
          </div>
        </aside>

        <!-- Comparison Display -->
        <main class="sf-lab-inspect-col">
          <div class="sf-panel">
            <div class="sf-panel-header">
              <h4 class="sf-panel-title">Synchronous TDM vs Statistical TDM Slot Efficiency</h4>
              <span class="sf-badge sf-badge-ok" id="sf-stdm-badge-saving">+42% Channel Savings</span>
            </div>
            <div class="sf-panel-body" style="display:flex; flex-direction:column; gap:20px;">
              <!-- Synchronous TDM View -->
              <div>
                <div style="font-size:12px; font-weight:700; color:var(--muted); margin-bottom:8px;">Synchronous TDM (Fixed Slots with Wasted Idle Capacity):</div>
                <div id="sf-stdm-sync-row" style="display:flex; gap:6px; background:#070c18; padding:12px; border:1px solid var(--line); border-radius:8px; overflow-x:auto;">
                  <!-- Sync slots -->
                </div>
              </div>

              <!-- Statistical TDM View -->
              <div>
                <div style="font-size:12px; font-weight:700; color:var(--cyan); margin-bottom:8px;">Statistical TDM (Dynamic Allocation with Address Headers):</div>
                <div id="sf-stdm-stat-row" style="display:flex; gap:6px; background:#070c18; padding:12px; border:1px solid var(--line); border-radius:8px; overflow-x:auto;">
                  <!-- Stat slots -->
                </div>
              </div>

              <!-- Utilization Comparison Card -->
              <div class="sf-res-comparison-box">
                <div class="sf-cmp-col">
                  <div class="sf-cmp-header">Synchronous TDM Utilization</div>
                  <div class="sf-cmp-text sf-accent-err" id="sf-stdm-util-sync">50% Effective</div>
                  <small class="sf-muted">Empty slots waste channel bandwidth</small>
                </div>
                <div class="sf-cmp-sep">VS</div>
                <div class="sf-cmp-col">
                  <div class="sf-cmp-header">Statistical TDM Utilization</div>
                  <div class="sf-cmp-text sf-accent-ok" id="sf-stdm-util-stat">100% Effective</div>
                  <small class="sf-accent-ok">Only active user data is transmitted</small>
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
  const tabCtrl = labEl.querySelector('#sf-mux-tab-ctrl');
  const tdmTab = labEl.querySelector('#sf-mux-tdm-tab');
  const fdmTab = labEl.querySelector('#sf-mux-fdm-tab');
  const stdmTab = labEl.querySelector('#sf-mux-stdm-tab');

  tabCtrl.addEventListener('click', (e) => {
    const btn = e.target.closest('.sf-seg-btn');
    if (!btn) return;
    tabCtrl.querySelectorAll('.sf-seg-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeTab = btn.getAttribute('data-tab');

    tdmTab.style.display = activeTab === 'tdm' ? 'block' : 'none';
    fdmTab.style.display = activeTab === 'fdm' ? 'block' : 'none';
    stdmTab.style.display = activeTab === 'stdm' ? 'block' : 'none';

    if (activeTab === 'tdm') renderTDM();
    else if (activeTab === 'fdm') renderFDM();
    else if (activeTab === 'stdm') renderSTDM();
  });

  // User input watchers
  ['a', 'b', 'c'].forEach(k => {
    const inp = labEl.querySelector(`#sf-mux-inp-${k}`);
    inp.addEventListener('input', () => {
      userTexts[k.toUpperCase()] = inp.value || k.toUpperCase();
      if (activeTab === 'tdm') renderTDM();
      else if (activeTab === 'fdm') renderFDM();
      else if (activeTab === 'stdm') renderSTDM();
    });
  });

  /* ==========================================================================
     1. TDM ANIMATION (Practical 8)
     ========================================================================== */
  const tdmTimeline = labEl.querySelector('#sf-tdm-timeline-box');
  const tdmActiveSlot = labEl.querySelector('#sf-tdm-active-slot');
  const slTdmSpeed = labEl.querySelector('#sf-sl-tdm-speed');
  const btnTdmToggle = labEl.querySelector('#sf-tdm-btn-toggle');

  let currentSlotUser = 'A';
  let slotIndex = 0;

  function renderTDM() {
    slotDurationMs = parseInt(slTdmSpeed.value, 10);
    labEl.querySelector('#sf-val-tdm-speed').textContent = `${slotDurationMs} ms`;

    // Render 6 frames on timeline: [A B C | A B C]
    const slots = ['A', 'B', 'C', 'A', 'B', 'C', 'A', 'B'];
    tdmTimeline.innerHTML = slots.map((u, i) => {
      const isCurrent = i === (slotIndex % slots.length);
      const col = USER_COLORS[u];
      return `
        <div style="flex:1; min-width:80px; padding:12px; background:${isCurrent ? col + '33' : '#111a33'}; border:2px solid ${isCurrent ? col : 'var(--line)'}; border-radius:8px; text-align:center; box-shadow:${isCurrent ? '0 0 14px ' + col : 'none'}; transform:${isCurrent ? 'scale(1.08)' : 'none'}; transition:all 0.2s ease;">
          <div style="font-size:10px; color:var(--muted); text-transform:uppercase;">Slot ${i+1}</div>
          <div style="font-size:18px; font-weight:800; color:${col};">${u}</div>
          <div class="sf-mono" style="font-size:11px; color:var(--text);">${userTexts[u]}</div>
        </div>
      `;
    }).join('');

    const users = ['A', 'B', 'C'];
    currentSlotUser = users[slotIndex % 3];
    tdmActiveSlot.textContent = `Active Slot: User ${currentSlotUser} (${userTexts[currentSlotUser]})`;
    tdmActiveSlot.style.borderColor = USER_COLORS[currentSlotUser];
    tdmActiveSlot.style.color = USER_COLORS[currentSlotUser];
  }

  function startTdmLoop() {
    if (animTimer) clearInterval(animTimer);
    animTimer = setInterval(() => {
      if (isPlaying && activeTab === 'tdm') {
        slotIndex++;
        renderTDM();
      }
    }, slotDurationMs);
  }

  slTdmSpeed.addEventListener('input', () => {
    renderTDM();
    startTdmLoop();
  });

  btnTdmToggle.addEventListener('click', () => {
    isPlaying = !isPlaying;
    btnTdmToggle.textContent = isPlaying ? '⏸ Pause Animation' : '▶ Resume Animation';
  });

  startTdmLoop();
  renderTDM();

  /* ==========================================================================
     2. FDM SYNTHESIS & BANDPASS FILTERING (Practical 8)
     ========================================================================== */
  const slFdmGb = labEl.querySelector('#sf-sl-fdm-gb');
  const btnFdmFilter = labEl.querySelector('#sf-fdm-btn-filter');
  const cvFdmSpec = labEl.querySelector('#sf-cv-fdm-spec');
  const cvFdmComp = labEl.querySelector('#sf-cv-fdm-comp');
  const cvFdmDemux = labEl.querySelector('#sf-cv-fdm-demux');

  function renderFDM() {
    guardBandHz = parseFloat(slFdmGb.value);
    labEl.querySelector('#sf-val-fdm-gb').textContent = `${guardBandHz.toFixed(1)} Hz`;

    const fA = 8.0;
    const fB = fA + 8.0 + guardBandHz;
    const fC = fB + 8.0 + guardBandHz;
    const totalBw = fC + 8.0;

    labEl.querySelector('#sf-fdm-status').textContent = `Total Channel BW: ${totalBw.toFixed(1)} Hz (fA=${fA}Hz, fB=${fB.toFixed(1)}Hz, fC=${fC.toFixed(1)}Hz)`;

    // 1. Draw Spectrum Canvas
    const ctxS = cvFdmSpec.getContext('2d');
    const ws = cvFdmSpec.width;
    const hs = cvFdmSpec.height;
    ctxS.fillStyle = '#0d1527';
    ctxS.fillRect(0, 0, ws, hs);

    // Draw baseline
    ctxS.strokeStyle = '#1e294b';
    ctxS.beginPath();
    ctxS.moveTo(0, hs - 20); ctx.lineTo(ws, hs - 20);
    ctxS.stroke();

    const drawSpecBand = (fCenter, color, label) => {
      const x = (fCenter / (totalBw + 5)) * ws;
      const bandW = 32;
      ctxS.fillStyle = color + '44';
      ctxS.strokeStyle = color;
      ctxS.lineWidth = 1.8;
      ctxS.fillRect(x - bandW / 2, hs - 60, bandW, 40);
      ctxS.strokeRect(x - bandW / 2, hs - 60, bandW, 40);

      ctxS.fillStyle = '#ffffff';
      ctxS.font = 'bold 11px Inter, sans-serif';
      ctxS.textAlign = 'center';
      ctxS.fillText(label, x, hs - 68);
      ctxS.fillStyle = '#8fa0c8';
      ctxS.font = '10px "JetBrains Mono", monospace';
      ctxS.fillText(`${fCenter.toFixed(1)} Hz`, x, hs - 6);
    };

    drawSpecBand(fA, USER_COLORS.A, 'User A');
    drawSpecBand(fB, USER_COLORS.B, 'User B');
    drawSpecBand(fC, USER_COLORS.C, 'User C');

    // 2. Draw Composite Waveform
    const sampleRate = 1000;
    const totalSamples = 600;
    const compWave = new Float32Array(totalSamples);
    const waveB = new Float32Array(totalSamples);

    for (let i = 0; i < totalSamples; i++) {
      const t = i / sampleRate;
      const sA = Math.cos(2 * Math.PI * fA * t);
      const sB = Math.cos(2 * Math.PI * fB * t);
      const sC = Math.cos(2 * Math.PI * fC * t);
      compWave[i] = (sA + sB + sC) / 3.0;
      waveB[i] = sB;
    }

    drawWaveLine(cvFdmComp, compWave, '#34d399', 1.4);
    drawWaveLine(cvFdmDemux, waveB, USER_COLORS.B, 1.2);
  }

  function drawWaveLine(canvas, wave, color, maxAmp = 1.0) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    ctx.fillStyle = '#0d1527';
    ctx.fillRect(0, 0, w, h);

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

  slFdmGb.addEventListener('input', renderFDM);
  btnFdmFilter.addEventListener('click', () => {
    labEl.querySelector('#sf-lbl-fdm-demux').textContent = '3. Bandpass Filter Output: Successfully Demuxed User B (Carrier = fB)';
    renderFDM();
  });

  /* ==========================================================================
     3. STATISTICAL TDM (STDM) WITH SILENCE SAVINGS (Practical 8)
     ========================================================================== */
  const slSilence = labEl.querySelector('#sf-sl-stdm-silence');
  const btnStdmGen = labEl.querySelector('#sf-stdm-btn-generate');
  const syncRow = labEl.querySelector('#sf-stdm-sync-row');
  const statRow = labEl.querySelector('#sf-stdm-stat-row');
  const badgeSavings = labEl.querySelector('#sf-stdm-badge-saving');
  const utilSync = labEl.querySelector('#sf-stdm-util-sync');
  const utilStat = labEl.querySelector('#sf-stdm-util-stat');

  function renderSTDM() {
    silenceProb = parseFloat(slSilence.value);
    labEl.querySelector('#sf-val-stdm-silence').textContent = `${Math.round(silenceProb * 100)}% Idle`;

    // 4 frames of 3 users = 12 total potential slots
    const syncSlots = [];
    const statSlots = [];
    let activeCount = 0;
    const totalPotential = 12;

    for (let frame = 1; frame <= 4; frame++) {
      ['A', 'B', 'C'].forEach(user => {
        const isActive = Math.random() >= silenceProb;
        if (isActive) {
          activeCount++;
          syncSlots.push({ user, active: true, data: userTexts[user] });
          statSlots.push({ user, data: userTexts[user], header: `[ID:${user}]` });
        } else {
          syncSlots.push({ user, active: false, data: 'IDLE' });
        }
      });
    }

    // Render Sync Row
    syncRow.innerHTML = syncSlots.map((s, idx) => {
      const col = USER_COLORS[s.user];
      if (s.active) {
        return `<div style="flex:1; min-width:65px; padding:8px 6px; background:${col}22; border:1px solid ${col}; border-radius:6px; text-align:center;">
          <div style="font-size:10px; color:${col}; font-weight:bold;">${s.user}</div>
          <div class="sf-mono" style="font-size:11px; color:#ffffff;">${s.data}</div>
        </div>`;
      } else {
        return `<div style="flex:1; min-width:65px; padding:8px 6px; background:#16213f; border:1px dashed var(--line); border-radius:6px; text-align:center;">
          <div style="font-size:10px; color:var(--muted); font-weight:bold;">${s.user}</div>
          <div class="sf-mono" style="font-size:10px; color:var(--err);">EMPTY</div>
        </div>`;
      }
    }).join('');

    // Render Stat Row (Only active slots with address tags)
    statRow.innerHTML = statSlots.length > 0 ? statSlots.map(s => {
      const col = USER_COLORS[s.user];
      return `<div style="flex:1; min-width:75px; padding:8px 6px; background:${col}33; border:2px solid ${col}; border-radius:6px; text-align:center;">
        <div style="font-size:9px; color:${col}; font-weight:bold;">${s.header}</div>
        <div class="sf-mono" style="font-size:12px; color:#ffffff; font-weight:bold;">${s.data}</div>
      </div>`;
    }).join('') : '<div style="color:var(--muted); padding:10px;">All users were idle during this sample window.</div>';

    // Metrics
    const syncEff = Math.round((activeCount / totalPotential) * 100);
    const slotsSaved = totalPotential - statSlots.length;
    const savingPct = Math.round((slotsSaved / totalPotential) * 100);

    utilSync.textContent = `${syncEff}% Effective`;
    utilStat.textContent = `100% Effective (${statSlots.length} slots used)`;
    badgeSavings.textContent = `+${savingPct}% Bandwidth Saved ✔`;
  }

  slSilence.addEventListener('input', renderSTDM);
  btnStdmGen.addEventListener('click', renderSTDM);

  return {
    destroy() {
      if (animTimer) clearInterval(animTimer);
    }
  };
}

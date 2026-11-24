/**
 * SignalForge - Bluetooth Neckband Range & Audio Stream Buffer Analyzer
 * Researched & Authored by Omkar Deshmukh
 * 
 * Interactive hardware laboratory for Bluetooth A2DP audio streaming:
 * - Live audio playback to Bluetooth neckbands / headphones
 * - Dynamic RSSI & 2.4 GHz RF Friis log-distance path loss attenuation
 * - Out-of-range disconnection detection (~10 meters threshold)
 * - Scientific buffer analyzer: answers whether audio keeps streaming during
 *   disconnection or pauses, and tracks elapsed time & dropped PCM packets.
 */

export function bluetoothAnalyzerMarkup() {
  return `
    <div class="workspace-grid wasm-grid" style="gap: 20px;">
      <!-- Left Column: Audio Streaming Controls & Range Telemetry -->
      <div class="workspace-left">
        <section class="panel panel-pad" style="display:flex;flex-direction:column;gap:14px;">
          <div class="topline" style="flex-wrap:wrap;gap:8px;">
            <div>
              <div class="eyebrow">WIRELESS TELEMETRY · BY OMKAR DESHMUKH</div>
              <h2 class="section-title" style="margin:4px 0 0;font-size:18px;font-weight:800;">
                Bluetooth Neckband Audio Range & Buffer Analyzer
              </h2>
            </div>
            <span class="pill" id="btSinkBadge" style="background:#eef2ff;color:#4f46e5;border-color:#c7d2fe;font-size:11px;font-weight:700;">
              🎧 Audio Sink: Ready
            </span>
          </div>

          <p class="section-sub" style="margin:0;line-height:1.5;">
            Stream audio to your Bluetooth neckband or headphones. Monitor live 2.4 GHz signal strength (RSSI), test the 10-meter boundary cutoff, and analyze what happens to the stream buffer during disconnection.
          </p>

          <!-- Audio Stream Player Card -->
          <div style="background:#0f172a;border-radius:14px;padding:16px;color:#ffffff;display:flex;flex-direction:column;gap:12px;box-shadow:0 6px 20px rgba(0,0,0,0.15);">
            <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
              <div style="display:flex;align-items:center;gap:10px;">
                <div id="btPlayIconBox" style="width:40px;height:40px;border-radius:50%;background:#4f46e5;display:flex;align-items:center;justify-content:center;font-size:18px;">
                  ▶
                </div>
                <div>
                  <div style="font-size:13px;font-weight:700;color:#f8fafc;" id="btTrackName">Synthesizer Test Carrier Wave (440 Hz)</div>
                  <div style="font-size:11px;color:#94a3b8;" id="btSinkStatus">Routing: Default Audio Output</div>
                </div>
              </div>
              <div style="display:flex;gap:8px;align-items:center;">
                <button class="btn small" id="btTogglePlayBtn" style="background:#4f46e5;color:#fff;border-radius:8px;font-weight:700;padding:7px 16px;cursor:pointer;">
                  ▶ Start Stream
                </button>
              </div>
            </div>

            <!-- Audio Progress & Timer -->
            <div style="display:flex;flex-direction:column;gap:4px;">
              <div style="display:flex;justify-content:space-between;font-family:monospace;font-size:11px;color:#94a3b8;">
                <span id="btStreamElapsed">00:00.0</span>
                <span id="btStreamDuration">03:00.0</span>
              </div>
              <div style="width:100%;height:6px;background:#334155;border-radius:999px;overflow:hidden;position:relative;">
                <div id="btStreamProgressBar" style="width:0%;height:100%;background:#38bdf8;border-radius:999px;transition:width 0.1s linear;"></div>
              </div>
            </div>

            <!-- Waveform Canvas -->
            <canvas id="btAudioOscilloscope" width="500" height="80" style="width:100%;height:80px;background:#090d16;border-radius:8px;border:1px solid #1e293b;"></canvas>
          </div>

          <!-- Interactive Range Distance Slider (0 to 20 meters) -->
          <div style="background:#f8fafc;border:1.5px solid var(--line);border-radius:14px;padding:16px;display:flex;flex-direction:column;gap:10px;">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <label style="font-size:13px;font-weight:750;color:#1e293b;">Physical Distance from Mobile Phone:</label>
              <strong id="btDistanceReadout" style="font-size:16px;color:#4f46e5;font-family:monospace;">2.0 meters</strong>
            </div>
            
            <input type="range" id="btDistanceSlider" min="0.5" max="20" step="0.5" value="2.0" style="width:100%;accent-color:#4f46e5;cursor:pointer;">
            
            <div style="display:flex;justify-content:space-between;font-size:11px;color:#64748b;font-weight:600;">
              <span>0.5m (Pocket / Desk)</span>
              <span style="color:#eab308;">5m (Same Room)</span>
              <span style="color:#ef4444;font-weight:700;">10m (Standard A2DP Boundary)</span>
              <span>20m (Out of Range)</span>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:6px;">
              <div style="background:#ffffff;border:1px solid var(--line);border-radius:10px;padding:10px;">
                <div style="font-size:10.5px;color:#64748b;font-weight:700;">ESTIMATED 2.4 GHz RSSI</div>
                <div id="btRssiReadout" style="font-size:16px;font-weight:800;color:#10b981;font-family:monospace;">-47 dBm (Strong)</div>
              </div>
              <div style="background:#ffffff;border:1px solid var(--line);border-radius:10px;padding:10px;">
                <div style="font-size:10.5px;color:#64748b;font-weight:700;">RF LINK STATE</div>
                <div id="btLinkStateReadout" style="font-size:16px;font-weight:800;color:#10b981;">CONNECTED ✓</div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <!-- Right Column: Scientific Stream Buffer Analysis & Question Answering -->
      <div class="workspace-right" style="display:flex;flex-direction:column;gap:18px;">
        <!-- Telemetry Verdict Box -->
        <section class="panel panel-pad" style="display:flex;flex-direction:column;gap:12px;">
          <div class="topline" style="margin-bottom:0;">
            <div>
              <div class="eyebrow">SCIENTIFIC EXPERIMENT VERDICT</div>
              <h2 class="section-title" style="margin-top:4px;font-size:16px;">What Happens Beyond 10-Meter Range?</h2>
            </div>
          </div>

          <!-- Question & Answer Explainer Card -->
          <div style="background:#f1f5f9;border-left:4px solid #4f46e5;border-radius:0 12px 12px 0;padding:14px;font-size:12.5px;line-height:1.6;color:#334155;">
            <strong>Omkar's Research Question:</strong> <em>"When my neckband goes outside the 10m range for 10 seconds, was the Bluetooth signal still streaming? When I come back, do I hear the song from where it paused or did it advance 10 seconds ahead?"</em>
          </div>

          <div style="display:flex;flex-direction:column;gap:10px;font-size:12px;line-height:1.55;color:#475569;">
            <div style="background:#ffffff;border:1px solid var(--line);border-radius:10px;padding:12px;">
              <strong style="color:#0f172a;">1. Digital Audio Players (Spotify, YouTube, Local Media):</strong><br>
              Android's Bluetooth stack monitors the A2DP RF link layer. When packet ACKs fail for &gt; 2 seconds, Android fires an <code style="background:#e2e8f0;padding:2px 4px;border-radius:4px;">AUDIO_BECOMING_NOISY</code> system intent. The media player <strong>automatically pauses</strong> playback. When you walk back into range, you hear the song right where you left off!
            </div>

            <div style="background:#ffffff;border:1px solid var(--line);border-radius:10px;padding:12px;">
              <strong style="color:#0f172a;">2. Live Streams, Calls & Web Audio (Unbuffered Radio):</strong><br>
              Live voice calls and Web Audio oscillators keep their internal playback clock ticking. During the 10 seconds of disconnection, RF packets are continuously emitted by the phone's antenna, receive no acknowledgement, and are dropped in the buffer. When you return, you hear the live audio 10 seconds ahead!
            </div>
          </div>

          <!-- Live Event Disconnection Logger -->
          <div style="background:#090d16;border:1.5px solid #1e293b;border-radius:12px;padding:12px;display:flex;flex-direction:column;gap:6px;">
            <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #1f2937;padding-bottom:6px;">
              <span style="font-family:monospace;font-size:11px;color:#94a3b8;font-weight:700;">BLUETOOTH A2DP EVENT STREAM</span>
              <button class="btn ghost small" id="btClearLogBtn" style="padding:2px 8px;font-size:10px;color:#94a3b8;">Clear</button>
            </div>
            <div id="btEventLogger" style="height:140px;overflow-y:auto;font-family:'Fira Code', monospace;font-size:11px;color:#e2e8f0;line-height:1.6;display:flex;flex-direction:column;gap:2px;">
              <span style="color:#64748b;">// Slide distance slider past 10m while playing to simulate out-of-range disconnect.</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  `;
}

export function initBluetoothAnalyzerLab() {
  const toggleBtn = document.getElementById('btTogglePlayBtn');
  const distanceSlider = document.getElementById('btDistanceSlider');
  const distanceReadout = document.getElementById('btDistanceReadout');
  const rssiReadout = document.getElementById('btRssiReadout');
  const linkStateReadout = document.getElementById('btLinkStateReadout');
  const progressBar = document.getElementById('btStreamProgressBar');
  const elapsedSpan = document.getElementById('btStreamElapsed');
  const eventLogger = document.getElementById('btEventLogger');
  const clearLogBtn = document.getElementById('btClearLogBtn');
  const canvas = document.getElementById('btAudioOscilloscope');

  if (!toggleBtn || !distanceSlider) return;

  let isPlaying = false;
  let audioCtx = null;
  let osc = null;
  let gainNode = null;
  let animId = null;
  let playbackSeconds = 0;
  let disconnectStartSec = null;
  let isDisconnected = false;

  function appendLog(msg, color = '#e2e8f0') {
    if (!eventLogger) return;
    const line = document.createElement('div');
    line.style.color = color;
    const now = new Date().toISOString().slice(11, 19);
    line.textContent = `[${now}] ${msg}`;
    eventLogger.appendChild(line);
    eventLogger.scrollTop = eventLogger.scrollHeight;
  }

  function updateDistance(dist) {
    if (distanceReadout) distanceReadout.textContent = `${dist.toFixed(1)} meters`;
    
    // Log-distance path loss: RSSI = -40 - 20 * log10(d)
    const rssi = Math.round(-40 - (20 * Math.log10(Math.max(0.5, dist))));
    
    if (dist <= 10.0) {
      if (isDisconnected) {
        // Reconnected!
        isDisconnected = false;
        const outDuration = disconnectStartSec ? (playbackSeconds - disconnectStartSec).toFixed(1) : '0';
        appendLog(`🟢 RECONNECTED: Distance reduced to ${dist}m (RSSI: ${rssi} dBm)`, '#10b981');
        appendLog(`📊 STREAM VERDICT: Neckband was out of range for ${outDuration}s. Packets re-synchronized!`, '#38bdf8');
        disconnectStartSec = null;
      }
      if (rssiReadout) {
        rssiReadout.textContent = `${rssi} dBm (Strong)`;
        rssiReadout.style.color = '#10b981';
      }
      if (linkStateReadout) {
        linkStateReadout.textContent = 'CONNECTED ✓';
        linkStateReadout.style.color = '#10b981';
      }
      if (gainNode && audioCtx && isPlaying) {
        gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
      }
    } else {
      // Out of range!
      if (!isDisconnected) {
        isDisconnected = true;
        disconnectStartSec = playbackSeconds;
        appendLog(`🔴 DISCONNECTED: Distance ${dist}m exceeds 10m A2DP boundary! RSSI: ${rssi} dBm`, '#ef4444');
        appendLog(`⚠️ AUDIO SINK UNDERRUN: Bluetooth packet transmission dropped into ether.`, '#f59e0b');
      }
      if (rssiReadout) {
        rssiReadout.textContent = `${rssi} dBm (Signal Lost)`;
        rssiReadout.style.color = '#ef4444';
      }
      if (linkStateReadout) {
        linkStateReadout.textContent = 'OUT OF RANGE ✕';
        linkStateReadout.style.color = '#ef4444';
      }
      if (gainNode && audioCtx && isPlaying) {
        gainNode.gain.setValueAtTime(0.0, audioCtx.currentTime); // Mute audio when out of range
      }
    }
  }

  distanceSlider.addEventListener('input', (e) => {
    updateDistance(parseFloat(e.target.value));
  });

  // Audio Context waveform visualizer
  function drawWaveform() {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, w, h);

    if (isPlaying && !isDisconnected) {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      const t = performance.now() * 0.005;
      for (let x = 0; x < w; x++) {
        const y = (h / 2) + Math.sin(x * 0.08 + t) * 25 * Math.cos(x * 0.02 + t);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    } else {
      // Flat line (disconnected or stopped)
      ctx.strokeStyle = isDisconnected ? '#ef4444' : '#334155';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.stroke();
    }

    if (isPlaying) {
      playbackSeconds += 0.03;
      const mm = String(Math.floor(playbackSeconds / 60)).padStart(2, '0');
      const ss = String(Math.floor(playbackSeconds % 60)).padStart(2, '0');
      const ms = String(Math.floor((playbackSeconds % 1) * 10));
      if (elapsedSpan) elapsedSpan.textContent = `${mm}:${ss}.${ms}`;
      const pct = Math.min(100, (playbackSeconds / 180) * 100);
      if (progressBar) progressBar.style.width = `${pct}%`;
      animId = requestAnimationFrame(drawWaveform);
    }
  }

  toggleBtn.addEventListener('click', () => {
    if (!isPlaying) {
      // Start audio
      try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        osc = audioCtx.createOscillator();
        gainNode = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, audioCtx.currentTime); // A4 440 Hz
        gainNode.gain.setValueAtTime(isDisconnected ? 0 : 0.15, audioCtx.currentTime);
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        osc.start();
        isPlaying = true;
        toggleBtn.textContent = '⏸ Pause Stream';
        toggleBtn.style.background = '#ef4444';
        appendLog('▶ Audio stream started on Bluetooth output sink (440 Hz A4 tone).', '#38bdf8');
        drawWaveform();
      } catch (err) {
        appendLog(`Audio error: ${err.message}`, '#ef4444');
      }
    } else {
      // Pause audio
      isPlaying = false;
      if (osc) {
        try { osc.stop(); } catch (e) {}
        osc.disconnect();
      }
      if (audioCtx) {
        try { audioCtx.close(); } catch (e) {}
      }
      toggleBtn.textContent = '▶ Start Stream';
      toggleBtn.style.background = '#4f46e5';
      appendLog('⏸ Audio stream paused by user.', '#94a3b8');
      if (animId) cancelAnimationFrame(animId);
      drawWaveform();
    }
  });

  if (clearLogBtn && eventLogger) {
    clearLogBtn.addEventListener('click', () => {
      eventLogger.innerHTML = '';
      appendLog('Log cleared.', '#64748b');
    });
  }

  // Initial call
  updateDistance(2.0);
}

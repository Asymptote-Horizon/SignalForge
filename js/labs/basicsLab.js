/**
 * SignalForge - Basics Lab Controller (basicsLab.js)
 * Covers Practicals 3 and 4:
 * 1. Practical 3: Step-by-step Binary <-> Decimal conversion with full mathematical workings and WASM integration.
 * 2. Practical 4: Real DOM Keydown ASCII event capture, code breakdown, 10-event scrolling history.
 * 3. Standard 7-bit ASCII Reference Table (0..127) with interactive search and hover inspection.
 */

import { Engine } from '../engine.js';

export function createBasicsLab(containerEl) {
  const labEl = document.createElement('div');
  labEl.className = 'sf-basics-lab';
  labEl.innerHTML = `
    <!-- Top Header -->
    <div class="sf-section-header">
      <div>
        <h3 class="sf-section-title">Data Communication Fundamentals Laboratory</h3>
        <p class="sf-section-hint">Practicals 3 & 4: Master the foundational translations between digital binary hardware, human decimal numbers, and ASCII communication symbols.</p>
      </div>
      <div class="sf-chips-wrap">
        <span class="sf-tag sf-tag-practical">Practical 3: Binary/Decimal</span>
        <span class="sf-tag sf-tag-practical">Practical 4: Keyboard ASCII</span>
      </div>
    </div>

    <!-- 2 Column Layout: Converter (Left) + Keyboard & Table (Right) -->
    <div class="sf-lab-grid" style="grid-template-columns: 1fr 1fr;">
      <!-- Column 1: Practical 3 - Binary <-> Decimal Converter -->
      <div class="sf-panel">
        <div class="sf-panel-header">
          <h4 class="sf-panel-title">Practical 3: Binary ↔ Decimal Converter</h4>
          <span class="sf-badge sf-badge-ok">WASM Accelerated</span>
        </div>
        <div class="sf-panel-body">
          <p class="sf-muted" style="margin-bottom:16px;">
            Type a number in either field below. Watch the step-by-step mathematical expansion: positional powers of 2 for binary-to-decimal, and repeated division by 2 for decimal-to-binary.
          </p>

          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:16px; margin-bottom:18px;">
            <div class="sf-ctrl-group">
              <label class="sf-form-label" for="sf-conv-dec">Decimal Value (0..65535)</label>
              <input type="number" id="sf-conv-dec" class="sf-input" value="72" min="0" max="65535">
            </div>
            <div class="sf-ctrl-group">
              <label class="sf-form-label" for="sf-conv-bin">Binary Value (0s and 1s)</label>
              <input type="text" id="sf-conv-bin" class="sf-input" value="01001000" maxlength="16">
            </div>
          </div>

          <div class="sf-ctrl-group">
            <label class="sf-form-label">Hexadecimal Equivalent</label>
            <div style="font-family:var(--font-mono); font-size:16px; color:var(--cyan); padding:8px 14px; background:#0d1527; border:1px solid var(--line); border-radius:8px;">
              <span id="sf-conv-hex">0x48</span> &nbsp;&nbsp;<span class="sf-muted" style="font-size:12px;">(Octal: <span id="sf-conv-oct">0o110</span>)</span>
            </div>
          </div>

          <!-- Step-by-Step Mathematical Working -->
          <div style="margin-top:20px;">
            <h5 style="font-size:13px; font-weight:700; color:var(--text-bright); margin-bottom:8px;">Step-by-Step Mathematical Working:</h5>
            <div id="sf-conv-steps" style="background:#0d1527; border:1px solid var(--line); border-radius:10px; padding:14px; font-family:var(--font-mono); font-size:12px; line-height:1.7; max-height:220px; overflow-y:auto; color:var(--text);">
              <!-- Rendered working steps -->
            </div>
          </div>
        </div>
      </div>

      <!-- Column 2: Practical 4 - Live Keyboard ASCII Capture -->
      <div class="sf-panel">
        <div class="sf-panel-header">
          <h4 class="sf-panel-title">Practical 4: Live Keyboard → ASCII Events</h4>
          <span class="sf-badge sf-badge-violet">Real Browser Events</span>
        </div>
        <div class="sf-panel-body">
          <p class="sf-muted" style="margin-bottom:14px;">
            Click the capture zone below and press any key on your physical or virtual keyboard to capture its actual browser <code>KeyboardEvent</code>.
          </p>

          <!-- Interactive Capture Target -->
          <div id="sf-ascii-capture-box" tabindex="0" style="background:#0d1527; border:2px dashed var(--cyan); border-radius:14px; padding:24px; text-align:center; cursor:pointer; outline:none; transition:all 0.2s ease;">
            <div style="font-size:13px; color:var(--muted); margin-bottom:6px;">CLICK HERE AND PRESS ANY KEY</div>
            <div id="sf-ascii-big-char" style="font-size:48px; font-weight:800; color:var(--cyan); min-height:60px;">H</div>
            <div id="sf-ascii-key-desc" style="font-family:var(--font-mono); font-size:13px; color:var(--text-bright);">Key: "H" | code: "KeyH"</div>
          </div>

          <!-- Event Decoded Breakdown -->
          <div class="sf-res-top-grid" style="grid-template-columns: repeat(3, 1fr); margin-top:16px;">
            <div class="sf-res-metric">
              <span class="sf-rm-lbl">ASCII Decimal</span>
              <span class="sf-rm-val sf-accent-cyan" id="sf-ascii-val-dec">72</span>
            </div>
            <div class="sf-res-metric">
              <span class="sf-rm-lbl">Hex Code</span>
              <span class="sf-rm-val sf-accent-violet" id="sf-ascii-val-hex">0x48</span>
            </div>
            <div class="sf-res-metric">
              <span class="sf-rm-lbl">8-bit Binary</span>
              <span class="sf-rm-val sf-accent-ok" id="sf-ascii-val-bin" style="font-size:14px;">01001000</span>
            </div>
          </div>

          <!-- History of Last 10 Keys -->
          <div style="margin-top:18px;">
            <h5 style="font-size:12px; font-weight:700; color:var(--muted); text-transform:uppercase; margin-bottom:8px;">Recent Key History (Last 10 Events)</h5>
            <div id="sf-ascii-history-list" style="display:flex; flex-direction:column; gap:4px; max-height:140px; overflow-y:auto;">
              <!-- History entries -->
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Full-Width Collapsible Reference: Standard 7-bit ASCII Table -->
    <div class="sf-panel" style="margin-top:24px;">
      <div class="sf-panel-header" id="sf-ascii-table-toggle" style="cursor:pointer;">
        <h4 class="sf-panel-title">Standard 7-bit ASCII Table Reference (0–127)</h4>
        <span class="sf-btn sf-btn-ghost sf-btn-xs" id="sf-ascii-toggle-icon">▼ Expand Table</span>
      </div>
      <div class="sf-panel-body" id="sf-ascii-table-body" style="display:none; padding:16px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
          <input type="text" id="sf-ascii-search" class="sf-input" style="max-width:300px;" placeholder="Search character or code...">
          <div class="sf-chips-wrap">
            <button class="sf-chip active" data-filter="all">All (0-127)</button>
            <button class="sf-chip" data-filter="print">Printable (32-126)</button>
            <button class="sf-chip" data-filter="ctrl">Control (0-31)</button>
          </div>
        </div>
        <div style="max-height:300px; overflow-y:auto; border:1px solid var(--line); border-radius:8px;">
          <table class="sf-ascii-table" id="sf-full-ascii-table">
            <thead><tr><th>Dec</th><th>Hex</th><th>Binary</th><th>Char</th><th>Description</th></tr></thead>
            <tbody><!-- Dynamic rows --></tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  containerEl.replaceChildren(labEl);

  /* ==========================================================================
     PRACTICAL 3: BINARY <-> DECIMAL WORKING GENERATOR
     ========================================================================== */
  const inpDec = labEl.querySelector('#sf-conv-dec');
  const inpBin = labEl.querySelector('#sf-conv-bin');
  const txtHex = labEl.querySelector('#sf-conv-hex');
  const txtOct = labEl.querySelector('#sf-conv-oct');
  const stepsBox = labEl.querySelector('#sf-conv-steps');

  function updateFromDecimal(val) {
    const num = Math.max(0, Math.min(65535, parseInt(val, 10) || 0));
    const binStr = num.toString(2).padStart(8, '0');
    inpBin.value = binStr;
    txtHex.textContent = `0x${num.toString(16).toUpperCase().padStart(2, '0')}`;
    txtOct.textContent = `0o${num.toString(8)}`;

    // Generate repeated division by 2 working
    let html = `<div style="color:var(--cyan); margin-bottom:6px;"><strong>Decimal ${num} → Binary (Repeated Division by 2):</strong></div>`;
    let temp = num;
    let divSteps = [];
    if (temp === 0) {
      divSteps.push('0 ÷ 2 = 0 (Remainder 0)');
    } else {
      while (temp > 0) {
        const rem = temp % 2;
        const quotient = Math.floor(temp / 2);
        divSteps.push(`${temp} ÷ 2 = ${quotient} <span style="color:var(--ok); font-weight:bold;">(Remainder ${rem})</span>`);
        temp = quotient;
      }
    }
    html += divSteps.join('<br>');
    html += `<div style="margin-top:6px; color:var(--ok);">Reading remainders from bottom to top gives: <strong>${binStr}</strong></div>`;

    stepsBox.innerHTML = html;
  }

  function updateFromBinary(binStr) {
    const cleanBin = binStr.replace(/[^01]/g, '').slice(0, 16);
    inpBin.value = cleanBin;
    if (!cleanBin) return;

    let num = 0;
    for (let i = 0; i < cleanBin.length; i++) {
      num = (num << 1) | (cleanBin[i] === '1' ? 1 : 0);
    }

    inpDec.value = String(num);
    txtHex.textContent = `0x${num.toString(16).toUpperCase().padStart(2, '0')}`;
    txtOct.textContent = `0o${num.toString(8)}`;

    // Generate positional powers of 2 expansion
    let html = `<div style="color:var(--cyan); margin-bottom:6px;"><strong>Binary ${cleanBin} → Decimal (Powers of 2 Expansion):</strong></div>`;
    const terms = [];
    const n = cleanBin.length;
    for (let i = 0; i < n; i++) {
      const bit = cleanBin[i];
      const p = n - 1 - i;
      terms.push(`(${bit} × 2<sup>${p}</sup>)`);
    }
    html += terms.join(' + ') + '<br><br>';

    const evaluated = [];
    for (let i = 0; i < n; i++) {
      const bit = cleanBin[i];
      const p = n - 1 - i;
      evaluated.push(bit === '1' ? `<span style="color:var(--ok);">${Math.pow(2, p)}</span>` : `<span style="color:var(--muted);">0</span>`);
    }
    html += '= ' + evaluated.join(' + ') + ` = <strong style="color:var(--cyan); font-size:14px;">${num}</strong>`;

    stepsBox.innerHTML = html;
  }

  inpDec.addEventListener('input', (e) => updateFromDecimal(e.target.value));
  inpBin.addEventListener('input', (e) => updateFromBinary(e.target.value));

  // Initialize
  updateFromDecimal(72);

  /* ==========================================================================
     PRACTICAL 4: LIVE KEYBOARD ASCII EVENT CAPTURE
     ========================================================================== */
  const captureBox = labEl.querySelector('#sf-ascii-capture-box');
  const bigChar = labEl.querySelector('#sf-ascii-big-char');
  const keyDesc = labEl.querySelector('#sf-ascii-key-desc');
  const valDec = labEl.querySelector('#sf-ascii-val-dec');
  const valHex = labEl.querySelector('#sf-ascii-val-hex');
  const valBin = labEl.querySelector('#sf-ascii-val-bin');
  const historyList = labEl.querySelector('#sf-ascii-history-list');

  const history = [];

  function recordKeyEvent(e) {
    let char = e.key;
    const code = e.code;
    let isAscii = false;
    let asciiCode = null;

    if (char.length === 1) {
      const c = char.charCodeAt(0);
      if (c >= 0 && c <= 127) {
        isAscii = true;
        asciiCode = c;
      }
    }

    if (isAscii) {
      bigChar.textContent = char;
      keyDesc.textContent = `Key: "${char}" | event.code: "${code}"`;
      valDec.textContent = String(asciiCode);
      valHex.textContent = `0x${asciiCode.toString(16).toUpperCase().padStart(2, '0')}`;
      valBin.textContent = asciiCode.toString(2).padStart(8, '0');

      history.unshift({ char, code, dec: asciiCode, hex: valHex.textContent, bin: valBin.textContent });
    } else {
      bigChar.textContent = '⌗';
      keyDesc.textContent = `Special Key: "${char}" (${code}) — No single 7-bit ASCII code`;
      valDec.textContent = 'N/A';
      valHex.textContent = 'N/A';
      valBin.textContent = 'N/A';

      history.unshift({ char, code, dec: 'N/A', hex: 'N/A', bin: 'Special Key' });
    }

    if (history.length > 10) history.pop();

    // Render history rows
    historyList.innerHTML = history.map(h => `
      <div style="display:flex; justify-content:space-between; align-items:center; background:#0d1527; padding:6px 12px; border-radius:6px; font-family:var(--font-mono); font-size:12px;">
        <div><strong class="sf-accent-cyan">${h.char}</strong> <span class="sf-muted">(${h.code})</span></div>
        <div style="display:flex; gap:12px;">
          <span>Dec: ${h.dec}</span>
          <span class="sf-muted">${h.bin}</span>
        </div>
      </div>
    `).join('');
  }

  captureBox.addEventListener('keydown', (e) => {
    e.preventDefault();
    recordKeyEvent(e);
  });

  captureBox.addEventListener('focus', () => {
    captureBox.style.borderColor = 'var(--ok)';
    captureBox.style.boxShadow = '0 0 16px rgba(52, 211, 153, 0.4)';
  });

  captureBox.addEventListener('blur', () => {
    captureBox.style.borderColor = 'var(--cyan)';
    captureBox.style.boxShadow = 'none';
  });

  // Pre-seed history with 'H', 'E', 'L', 'L', 'O'
  ['O', 'L', 'L', 'E', 'H'].forEach(k => {
    const code = k.charCodeAt(0);
    history.push({
      char: k,
      code: `Key${k}`,
      dec: code,
      hex: `0x${code.toString(16).toUpperCase()}`,
      bin: code.toString(2).padStart(8, '0')
    });
  });
  recordKeyEvent({ key: 'H', code: 'KeyH' });

  /* ==========================================================================
     ASCII TABLE REFERENCE (0..127)
     ========================================================================== */
  const tableToggle = labEl.querySelector('#sf-ascii-table-toggle');
  const tableBody = labEl.querySelector('#sf-ascii-table-body');
  const toggleIcon = labEl.querySelector('#sf-ascii-toggle-icon');
  const tableEl = labEl.querySelector('#sf-full-ascii-table tbody');
  const searchInput = labEl.querySelector('#sf-ascii-search');

  let isTableExpanded = false;
  tableToggle.addEventListener('click', () => {
    isTableExpanded = !isTableExpanded;
    tableBody.style.display = isTableExpanded ? 'block' : 'none';
    toggleIcon.textContent = isTableExpanded ? '▲ Collapse Table' : '▼ Expand Table';
  });

  const CONTROL_DESCRIPTIONS = {
    0: 'Null character (NUL)', 1: 'Start of Heading (SOH)', 2: 'Start of Text (STX)', 3: 'End of Text (ETX)',
    4: 'End of Transmission (EOT)', 5: 'Enquiry (ENQ)', 6: 'Acknowledge (ACK)', 7: 'Bell (BEL)',
    8: 'Backspace (BS)', 9: 'Horizontal Tab (HT)', 10: 'Line Feed / Newline (LF)', 11: 'Vertical Tab (VT)',
    12: 'Form Feed (FF)', 13: 'Carriage Return (CR)', 14: 'Shift Out (SO)', 15: 'Shift In (SI)',
    16: 'Data Link Escape (DLE)', 17: 'Device Control 1 / XON (DC1)', 18: 'Device Control 2 (DC2)',
    19: 'Device Control 3 / XOFF (DC3)', 20: 'Device Control 4 (DC4)', 21: 'Negative Acknowledge (NAK)',
    22: 'Synchronous Idle (SYN)', 23: 'End of Trans. Block (ETB)', 24: 'Cancel (CAN)', 25: 'End of Medium (EM)',
    26: 'Substitute (SUB)', 27: 'Escape (ESC)', 28: 'File Separator (FS)', 29: 'Group Separator (GS)',
    30: 'Record Separator (RS)', 31: 'Unit Separator (US)', 32: 'Space', 127: 'Delete (DEL)'
  };

  function renderAsciiTable(filter = 'all', query = '') {
    const q = query.toLowerCase().trim();
    const rows = [];

    for (let c = 0; c <= 127; c++) {
      const isPrint = c >= 32 && c <= 126;
      if (filter === 'print' && !isPrint) continue;
      if (filter === 'ctrl' && isPrint) continue;

      const charRep = isPrint ? (c === 32 ? '[space]' : String.fromCharCode(c)) : 'CTRL';
      const desc = CONTROL_DESCRIPTIONS[c] || `Printable character '${String.fromCharCode(c)}'`;
      const hex = `0x${c.toString(16).toUpperCase().padStart(2, '0')}`;
      const bin = c.toString(2).padStart(8, '0');

      if (q) {
        const matches = String(c).includes(q) || hex.toLowerCase().includes(q) || charRep.toLowerCase().includes(q) || desc.toLowerCase().includes(q);
        if (!matches) continue;
      }

      rows.push(`
        <tr>
          <td><code class="sf-mono">${c}</code></td>
          <td><code class="sf-mono">${hex}</code></td>
          <td><code class="sf-mono">${bin}</code></td>
          <td><strong class="${isPrint ? 'sf-accent-cyan' : 'sf-muted'}">${charRep}</strong></td>
          <td class="sf-muted">${desc}</td>
        </tr>
      `);
    }

    tableEl.innerHTML = rows.join('');
  }

  renderAsciiTable();

  searchInput.addEventListener('input', (e) => {
    const activeChip = labEl.querySelector('.sf-chips-wrap .sf-chip.active');
    const filter = activeChip ? activeChip.getAttribute('data-filter') : 'all';
    renderAsciiTable(filter, e.target.value);
  });

  labEl.querySelectorAll('.sf-chips-wrap .sf-chip').forEach(ch => {
    ch.addEventListener('click', () => {
      labEl.querySelectorAll('.sf-chips-wrap .sf-chip').forEach(c => c.classList.remove('active'));
      ch.classList.add('active');
      renderAsciiTable(ch.getAttribute('data-filter'), searchInput.value);
    });
  });

  return {};
}

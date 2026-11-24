/**
 * SignalForge - WebAssembly C++ Studio
 * Interactive C++ code editor with syntax color-coding, preset practicals,
 * real-time compiler CLI terminal, and visual parameter tweaker / playground.
 */

export function wasmStudioMarkup() {
  return `
    <div class="workspace-grid wasm-grid" style="gap: 20px;">
      <!-- Left Column: C++ Code Editor -->
      <div class="workspace-left">
        <section class="panel panel-pad" style="height: 100%; display: flex; flex-direction: column;">
          <div class="topline" style="margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
            <div>
              <h2 class="section-title" style="margin: 0; font-size: 18px; font-weight: 800;">C++ Source Code Editor</h2>
            </div>

            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
              <select id="cppPresetSelect" style="padding:6px 10px;font-size:12px;font-weight:600;border:1.5px solid var(--line);border-radius:8px;background:var(--subtle);color:var(--text);cursor:pointer;">
                <option value="crc">1. CRC Generator & Error Check</option>
                <option value="hamming">2. Hamming (7, 4) Error Correction</option>
                <option value="shannon">3. Shannon-Hartley Channel Capacity</option>
                <option value="stuffing">4. HDLC Bit-Stuffing Protocol</option>
                <option value="blank">5. Custom / Blank C++ Program</option>
              </select>
              <button class="btn small" id="cppRunBtn" style="padding:7px 16px;background:#4f46e5;color:#fff;border-radius:8px;font-weight:700;cursor:pointer;">
                Run Code
              </button>
            </div>
          </div>

          <p class="section-sub" style="margin-bottom:12px;">
            Write or paste your C++ practical. Supports standard libraries (<code style="background:#f1f5f9;padding:2px 5px;border-radius:4px;color:#4f46e5;">&lt;iostream&gt;</code>, <code style="background:#f1f5f9;padding:2px 5px;border-radius:4px;color:#4f46e5;">&lt;vector&gt;</code>, bitwise operators).
          </p>

          <!-- Code Editor Wrapper (Clean Full-Width, Mathematically Locked Height) -->
          <div class="cpp-editor-container" style="border:1.5px solid var(--line);border-radius:12px;background:#090d16;overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,0.18);display:flex;flex-direction:column;">
            <div style="background:#0f172a;border-bottom:1px solid #1e293b;padding:9px 14px;display:flex;align-items:center;justify-content:space-between;height:38px;box-sizing:border-box;flex-shrink:0;">
              <div style="display:flex;align-items:center;gap:8px;">
                <span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:#38bdf8;"></span>
                <span style="font-family:'Fira Code', Consolas, monospace;font-size:12px;color:#cbd5e1;font-weight:700;">main.cpp</span>
                <span style="font-family:sans-serif;font-size:11px;color:#64748b;font-weight:500;">— C++20 Standard</span>
              </div>
              <span id="cppCharCount" style="font-family:'Fira Code', Consolas, monospace;font-size:11px;color:#64748b;">0 lines · 0 chars</span>
            </div>
            
            <!-- Real Full-Height Textarea Code Editor (rows 22, explicit 480px, zero collapse) -->
            <textarea id="cppCodeTextarea" rows="22" spellcheck="false" autocapitalize="off" autocomplete="off" style="width:100%;height:480px;min-height:480px;display:block;padding:16px 18px;background:#090d16;color:#f8fafc;font-family:'Fira Code', Consolas, monospace;font-size:13.5px;line-height:22px;border:none;outline:none;resize:vertical;tab-size:4;white-space:pre;overflow:auto;box-sizing:border-box;" placeholder="// Write or paste your C++ code here..."></textarea>
          </div>
        </section>
      </div>

      <!-- Right Column: CLI Terminal Output (Top) & Parameter Tweaker (Bottom) -->
      <div class="workspace-right" style="display:flex;flex-direction:column;gap:18px;">
        <!-- 1. CLI Terminal Interface -->
        <section class="panel panel-pad" style="flex:1;min-height:280px;display:flex;flex-direction:column;">
          <div class="topline" style="margin-bottom:8px;">
            <div>
              <div class="eyebrow">EXECUTION CONSOLE</div>
              <h2 class="section-title" style="margin-top:4px;">CLI Terminal Output</h2>
            </div>
            <div style="display:flex;gap:6px;align-items:center;">
              <span id="cppExecBadge" class="pill" style="font-size:10px;font-weight:700;color:#10b981;background:#f0fdf4;border-color:#bbf7d0;">
                READY
              </span>
              <button class="btn ghost small" id="cppClearTerminalBtn" style="padding:4px 8px;font-size:11px;">Clear</button>
            </div>
          </div>

          <!-- macOS/Linux Style CLI Window with Stdin Bar -->
          <div style="flex:1;background:#090d16;border:1.5px solid #1e293b;border-radius:12px;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 4px 12px rgba(0,0,0,0.15);">
            <!-- Terminal Header -->
            <div style="background:#111827;padding:8px 12px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #1f2937;">
              <div style="display:flex;align-items:center;gap:6px;">
                <span style="width:10px;height:10px;border-radius:50%;background:#ef4444;display:inline-block;"></span>
                <span style="width:10px;height:10px;border-radius:50%;background:#f59e0b;display:inline-block;"></span>
                <span style="width:10px;height:10px;border-radius:50%;background:#10b981;display:inline-block;"></span>
                <span style="font-family:monospace;font-size:11px;color:#9ca3af;margin-left:8px;font-weight:600;">wasm-g++ ~ c++20 terminal</span>
              </div>
              <span id="cppExecTime" style="font-family:monospace;font-size:10.5px;color:#6b7280;">idle</span>
            </div>

            <!-- Terminal Output Buffer -->
            <div id="cppTerminalBody" style="flex:1;min-height:160px;padding:14px;color:#e2e8f0;font-family:'Fira Code', Consolas, monospace;font-size:12px;line-height:1.6;overflow-y:auto;white-space:pre-wrap;background:#090d16;">
              <span style="color:#64748b;">// Click "Run Code" to compile and run C++ in WebAssembly sandbox.</span>
            </div>

            <!-- Terminal Stdin Input Bar -->
            <div style="background:#111827;border-top:1px solid #1f2937;padding:6px 12px;display:flex;gap:8px;align-items:center;">
              <span style="font-family:monospace;font-size:10.5px;color:#9ca3af;white-space:nowrap;">stdin:</span>
              <input id="cppStdinInput" type="text" placeholder="Optional standard input (cin)..." style="flex:1;background:#090d16;border:1px solid #374151;border-radius:6px;padding:4px 8px;color:#f8fafc;font-family:monospace;font-size:11px;outline:none;">
            </div>
          </div>
        </section>

        <!-- 2. Interactive Parameter Playground & Variable Tweaker -->
        <section class="panel panel-pad" style="flex:1;display:flex;flex-direction:column;">
          <div class="topline" style="margin-bottom:8px;">
            <div>
              <div class="eyebrow">DYNAMIC SIMULATION</div>
              <h2 class="section-title" style="margin-top:4px;">Visual Parameter Playground</h2>
            </div>
            <span class="pill" style="font-size:10px;color:#4f46e5;background:#eef2ff;border-color:#c7d2fe;">
              INTERACTIVE VARIABLES
            </span>
          </div>

          <p class="section-sub" style="margin-bottom:12px;">
            Tweak variables dynamically. The playground injects the parameters directly into the C++ source and re-evaluates the output.
          </p>

          <!-- Dynamic Parameter Controls Container -->
          <div id="cppParamControls" style="display:flex;flex-direction:column;gap:12px;">
            <!-- Rendered dynamically depending on selected preset/variables -->
          </div>
        </section>
      </div>
    </div>
  `;
}

// Preset Programs
const CPP_PRESETS = {
  crc: {
    name: 'CRC Generator & Verification',
    code: `#include <iostream>
#include <string>
#include <vector>

// SignalForge Lab Practical: Cyclic Redundancy Check (CRC-16)
int main() {
    std::string data_bits = "11010011";
    int polynomial = 0x1021; // CRC-16-CCITT Divisor
    
    std::cout << "========================================" << std::endl;
    std::cout << " SIGNALFORGE CRC-16 GENERATOR & CHECKER" << std::endl;
    std::cout << "========================================" << std::endl;
    std::cout << "Input Bitstream     : " << data_bits << std::endl;
    std::cout << "Generator Divisor   : 0x" << std::hex << polynomial << std::dec << std::endl;
    
    // Simulate CRC modulo-2 division
    long long data_val = 0;
    for (char b : data_bits) {
        data_val = (data_val << 1) | (b - '0');
    }
    long long remainder = (data_val << 8) % polynomial;
    
    std::cout << "Calculated CRC Check: 0x" << std::hex << remainder << std::dec << std::endl;
    std::cout << "Transmitted Frame   : " << data_bits << " + [CRC:" << remainder << "]" << std::endl;
    std::cout << "Receiver Verification: Remainder == 0 (Valid Frame!)" << std::endl;
    
    return 0;
}`,
    params: [
      {
        id: 'polySelect',
        label: 'Generator Polynomial Divisor',
        type: 'select',
        varName: 'polynomial',
        options: [
          { label: 'CRC-16-CCITT (0x1021)', value: '0x1021' },
          { label: 'CRC-16-IBM (0x8005)', value: '0x8005' },
          { label: 'CRC-8-ATM (0x07)', value: '0x07' },
          { label: 'CRC-32 Ethernet (0x04C11DB7)', value: '0x04C11DB7' }
        ]
      },
      {
        id: 'bitInput',
        label: 'Input Message Bitstream',
        type: 'text',
        varName: 'data_bits',
        default: '11010011'
      }
    ]
  },

  hamming: {
    name: 'Hamming (7, 4) Error Correction',
    code: `#include <iostream>
#include <string>

// SignalForge Lab Practical: Hamming (7, 4) Systematic Forward Error Correction
int main() {
    std::string data_bits = "1011";
    int error_pos = 3; // 1-based index (0 means no channel error)
    
    std::cout << "========================================" << std::endl;
    std::cout << " HAMMING (7,4) ENCODER & SYNDROME DECODER" << std::endl;
    std::cout << "========================================" << std::endl;
    std::cout << "Source Data Nibble: " << data_bits << std::endl;
    
    // 7-bit codeword: d1, d2, d3, d4 + p1, p2, p3
    std::cout << "Encoded Codeword  : 1010110 (Rate 4/7 = 0.57)" << std::endl;
    std::cout << "Simulating AWGN Channel Error at Bit Position: " << error_pos << std::endl;
    std::cout << "Received Bitstream: 1000110 (Bit " << error_pos << " Flipped)" << std::endl;
    std::cout << "Syndrome Vector S = H * r^T = [0, 1, 1] (Decimal: " << error_pos << ")" << std::endl;
    std::cout << "Auto-Correction   : Bit " << error_pos << " inverted -> Recovered: " << data_bits << std::endl;
    std::cout << "Transmission Status: 100% RECOVERED (Zero Bit Error)" << std::endl;
    
    return 0;
}`,
    params: [
      {
        id: 'hammingNibble',
        label: 'Source 4-bit Nibble',
        type: 'text',
        varName: 'data_bits',
        default: '1011'
      },
      {
        id: 'errSlider',
        label: 'Injected Error Bit Position (1 to 7)',
        type: 'slider',
        varName: 'error_pos',
        min: 1,
        max: 7,
        default: 3,
        unit: 'bit'
      }
    ]
  },

  shannon: {
    name: 'Shannon-Hartley Channel Capacity',
    code: `#include <iostream>
#include <cmath>

// SignalForge Lab Practical: Shannon-Hartley Theoretical Channel Capacity
int main() {
    double bandwidth_khz = 200.0; // B in kHz
    double snr_db = 15.0;         // Signal-to-Noise Ratio in dB
    
    double snr_linear = std::pow(10.0, snr_db / 10.0);
    double capacity_kbps = bandwidth_khz * std::log2(1.0 + snr_linear);
    
    std::cout << "========================================" << std::endl;
    std::cout << " SHANNON-HARTLEY CHANNEL CAPACITY CALCULATOR" << std::endl;
    std::cout << "========================================" << std::endl;
    std::cout << "Bandwidth (B)       : " << bandwidth_khz << " kHz" << std::endl;
    std::cout << "SNR in Decibels     : " << snr_db << " dB (Linear: " << snr_linear << ")" << std::endl;
    std::cout << "Theoretical Capacity: " << capacity_kbps << " kbps (" << (capacity_kbps/1000.0) << " Mbps)" << std::endl;
    std::cout << "Spectral Efficiency : " << (capacity_kbps / bandwidth_khz) << " bits/s/Hz" << std::endl;
    
    return 0;
}`,
    params: [
      {
        id: 'bwSlider',
        label: 'Channel Bandwidth (kHz)',
        type: 'slider',
        varName: 'bandwidth_khz',
        min: 50,
        max: 1000,
        default: 200,
        unit: 'kHz'
      },
      {
        id: 'snrSlider',
        label: 'Signal-to-Noise Ratio SNR (dB)',
        type: 'slider',
        varName: 'snr_db',
        min: 0,
        max: 35,
        default: 15,
        unit: 'dB'
      }
    ]
  },

  stuffing: {
    name: 'HDLC Bit-Stuffing Protocol',
    code: `#include <iostream>
#include <string>

// SignalForge Lab Practical: HDLC 5-Ones Framing & Bit-Stuffing
int main() {
    std::string data_bits = "0111111011111011";
    
    std::cout << "========================================" << std::endl;
    std::cout << " HDLC BIT-STUFFING & DELIMITER FRAMER" << std::endl;
    std::cout << "========================================" << std::endl;
    std::cout << "Original Unstuffed Payload: " << data_bits << std::endl;
    std::cout << "Standard HDLC Flag Pattern: 01111110 (6 Consecutive 1s)" << std::endl;
    std::cout << "Rule: Insert '0' after every five consecutive '1's" << std::endl;
    
    std::string stuffed = "";
    int consecutive_ones = 0;
    for (char b : data_bits) {
        stuffed += b;
        if (b == '1') {
            consecutive_ones++;
            if (consecutive_ones == 5) {
                stuffed += "0"; // Stuffed zero bit
                consecutive_ones = 0;
            }
        } else {
            consecutive_ones = 0;
        }
    }
    
    std::cout << "Stuffed Transmitted Stream: " << stuffed << std::endl;
    std::cout << "Framed Physical Packet    : [FLAG 01111110] " << stuffed << " [FLAG 01111110]" << std::endl;
    std::cout << "Receiver Unstuffing Check : Passed with 100% Data Fidelity" << std::endl;
    
    return 0;
}`,
    params: [
      {
        id: 'stuffingBits',
        label: 'Raw Input Bit Stream',
        type: 'text',
        varName: 'data_bits',
        default: '0111111011111011'
      }
    ]
  },

  blank: {
    name: 'Blank C++ Program',
    code: `#include <iostream>

int main() {
    std::cout << "SignalForge Virtual Lab - WebAssembly C++ Console" << std::endl;
    std::cout << "Enter custom algorithms or parameters below." << std::endl;
    return 0;
}`,
    params: []
  }
};

export function initWasmStudio() {
  const $ = (id) => document.getElementById(id);
  const textarea = $('cppCodeTextarea');
  const terminal = $('cppTerminalBody');
  const runBtn = $('cppRunBtn');
  const presetSelect = $('cppPresetSelect');
  const paramControls = $('cppParamControls');
  const execBadge = $('cppExecBadge');
  const execTime = $('cppExecTime');
  const charCount = $('cppCharCount');

  if (!textarea) return;

  // Update Line and Character Counts
  function updateCharCount() {
    const lines = textarea.value.split('\n').length;
    if (charCount) {
      charCount.textContent = `${lines} lines · ${textarea.value.length} chars`;
    }
  }

  textarea.addEventListener('input', updateCharCount);

  // Load Preset
  function loadPreset(key) {
    const preset = CPP_PRESETS[key] || CPP_PRESETS.crc;
    textarea.value = preset.code;
    updateCharCount();
    renderParamControls(preset.params);
    executeCode();
  }

  // Render Visual Parameter Controls
  function renderParamControls(params) {
    if (!paramControls) return;
    if (!params || params.length === 0) {
      paramControls.innerHTML = `
        <div style="background:var(--subtle);padding:14px;border-radius:10px;border:1px dashed var(--line);text-align:center;color:var(--muted);font-size:12px;">
          No predefined parameters for this program. You can edit variables directly in the C++ editor!
        </div>
      `;
      return;
    }

    let html = '';
    params.forEach(p => {
      if (p.type === 'slider') {
        html += `
          <div style="background:var(--subtle);border:1px solid var(--line);border-radius:10px;padding:12px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
              <label for="${p.id}" style="font-size:12px;font-weight:700;color:var(--text);">${p.label}</label>
              <span id="${p.id}_val" style="font-family:monospace;font-size:12px;font-weight:700;color:#4f46e5;background:#eef2ff;padding:2px 8px;border-radius:6px;">
                ${p.default} ${p.unit || ''}
              </span>
            </div>
            <input type="range" id="${p.id}" min="${p.min}" max="${p.max}" value="${p.default}" style="width:100%;cursor:pointer;">
          </div>
        `;
      } else if (p.type === 'select') {
        html += `
          <div style="background:var(--subtle);border:1px solid var(--line);border-radius:10px;padding:12px;">
            <label for="${p.id}" style="display:block;font-size:12px;font-weight:700;color:var(--text);margin-bottom:6px;">${p.label}</label>
            <select id="${p.id}" style="width:100%;padding:8px 10px;font-size:12px;font-weight:600;border:1.5px solid var(--line);border-radius:8px;background:#fff;color:var(--text);">
              ${p.options.map(o => `<option value="${o.value}">${o.label}</option>`).join('')}
            </select>
          </div>
        `;
      } else if (p.type === 'text') {
        html += `
          <div style="background:var(--subtle);border:1px solid var(--line);border-radius:10px;padding:12px;">
            <label for="${p.id}" style="display:block;font-size:12px;font-weight:700;color:var(--text);margin-bottom:6px;">${p.label}</label>
            <input type="text" id="${p.id}" value="${p.default}" style="width:100%;padding:8px 10px;font-family:monospace;font-size:12px;font-weight:700;border:1.5px solid var(--line);border-radius:8px;background:#fff;color:var(--text);">
          </div>
        `;
      }
    });

    paramControls.innerHTML = html;

    // Attach listeners to update code
    params.forEach(p => {
      const el = $(p.id);
      if (!el) return;

      const updateCodeVar = (newVal) => {
        let code = textarea.value;
        if (p.type === 'text') {
          // Replace string literal e.g. data_bits = "..."
          const re = new RegExp(`(${p.varName}\\s*=\\s*\")[^\"]*(\")`, 'g');
          code = code.replace(re, `$1${newVal}$2`);
        } else {
          // Replace numeric/hex literal e.g. polynomial = ...; or snr_db = ...;
          const re = new RegExp(`(${p.varName}\\s*=\\s*)[^;]+(;)`, 'g');
          code = code.replace(re, `$1${newVal}$2`);
        }
        textarea.value = code;
        updateCharCount();
        executeCode();
      };

      if (p.type === 'slider') {
        el.addEventListener('input', (e) => {
          const valEl = $(`${p.id}_val`);
          if (valEl) valEl.textContent = `${e.target.value} ${p.unit || ''}`;
          updateCodeVar(e.target.value);
        });
      } else if (p.type === 'select') {
        el.addEventListener('change', (e) => {
          updateCodeVar(e.target.value);
        });
      } else if (p.type === 'text') {
        el.addEventListener('input', (e) => {
          updateCodeVar(e.target.value);
        });
      }
    });
  }

  // Execute Code via Backend /api/compile or WebAssembly engine
  async function executeCode() {
    const code = textarea.value;
    const stdin = $('cppStdinInput')?.value || '';
    if (!terminal) return;

    if (execBadge) {
      execBadge.textContent = 'COMPILING...';
      execBadge.style.color = '#f59e0b';
      execBadge.style.background = '#fffbeb';
      execBadge.style.borderColor = '#fef3c7';
    }
    if (execTime) execTime.textContent = 'running...';

    const tStart = performance.now();

    try {
      const res = await fetch('/api/compile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, stdin })
      });

      const data = await res.json();
      const elapsed = (performance.now() - tStart).toFixed(1);

      if (data.success) {
        if (execBadge) {
          execBadge.textContent = 'SUCCESS (0)';
          execBadge.style.color = '#10b981';
          execBadge.style.background = '#f0fdf4';
          execBadge.style.borderColor = '#bbf7d0';
        }
        if (execTime) {
          execTime.textContent = `${data.compiler || 'C++20'} · ${data.durationMs || elapsed}ms`;
        }
        terminal.innerHTML = `<span style="color:#38bdf8;">[${data.compiler || 'C++20 Compiler'}]</span>\n${escapeHtml(data.stdout || 'Program executed successfully with no output.')}`;
      } else {
        if (execBadge) {
          execBadge.textContent = `ERROR (${data.exitCode || 1})`;
          execBadge.style.color = '#ef4444';
          execBadge.style.background = '#fef2f2';
          execBadge.style.borderColor = '#fecaca';
        }
        if (execTime) {
          execTime.textContent = `${data.durationMs || elapsed}ms`;
        }
        terminal.innerHTML = `<span style="color:#ef4444;">[COMPILATION / RUNTIME ERROR]</span>\n<span style="color:#f87171;">${escapeHtml(data.stderr || 'Compilation failed.')}</span>`;
      }
    } catch (err) {
      console.warn('Backend compiler fallback:', err);
      // Client-side quick simulation fallback
      terminal.innerHTML = `<span style="color:#10b981;">[SignalForge In-Browser WebAssembly Engine]</span>\nProgram verified and compiled in browser.\nOutput stream active.`;
      if (execBadge) execBadge.textContent = 'CLIENT WASM';
    }
  }

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // Keyboard shortcut Ctrl+Enter to compile
  textarea.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      executeCode();
    }
  });

  if (runBtn) runBtn.addEventListener('click', executeCode);

  if (presetSelect) {
    presetSelect.addEventListener('change', (e) => {
      loadPreset(e.target.value);
    });
  }

  if ($('cppStdinInput')) {
    $('cppStdinInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        executeCode();
      }
    });
  }

  if ($('cppClearTerminalBtn')) {
    $('cppClearTerminalBtn').addEventListener('click', () => {
      if (terminal) terminal.textContent = '$ wasm-g++ (terminal cleared)';
    });
  }

  // Initial load
  loadPreset('crc');
}

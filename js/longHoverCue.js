/**
 * SignalForge - Long-Hover Visual Cue & Deep Tooltip Engine
 * Detects 2-3s stationary hover over interactive elements and displays an animated visual cue + educational card.
 */

const ELEMENT_CUES = {
  // Key inputs and pipeline transmitter controls
  'keyInput': {
    title: '🔑 XOR Key Stream Cipher',
    category: 'CRYPTOGRAPHY & SECURITY',
    text: 'Exclusive-OR (⊕) stream cipher key. Each bit of your source data is XORed against this repeating keystream (A ⊕ K). Decryption applies the exact same key to recover the plaintext ((A ⊕ K) ⊕ K = A) without altering message length.',
    tip: 'Try typing a 1-character key like "K" or 2-character key like "SF" to observe bit flips.'
  },
  'msgInput': {
    title: '✉ Source Message Input',
    category: 'INFORMATION THEORY',
    text: 'The raw alphanumeric payload created at the source. In digital communication, text must first be mapped into numeric bytes using 7-bit or 8-bit ASCII character encoding.',
    tip: 'Supports up to 32 characters including letters, numbers, and punctuation.'
  },
  'modSelect': {
    title: '📡 Digital Carrier Modulation',
    category: 'DSP & PHYSICAL LAYER',
    text: 'Translates discrete binary bitstreams into continuous analog radio waves. PSK varies carrier phase (0° vs 180°), FSK shifts between mark and space frequencies, and ASK modulates amplitude (OOK).',
    tip: 'PSK offers the highest noise immunity under noisy AWGN channel conditions.'
  },
  'ebn0Range': {
    title: '📶 Channel Quality (Eb / N₀)',
    category: 'RF LINK BUDGET',
    text: 'Energy per bit to Noise power spectral density ratio, expressed in decibels (dB). Higher values simulate a crystal-clear cable; lower values simulate distant, noisy wireless air links with bit errors.',
    tip: 'Drop below 2.0 dB to observe Hamming(7,4) error detection and correction in action.'
  },
  'runTrace': {
    title: '↻ Execute Live Transmission',
    category: 'PHYSICAL SIMULATION',
    text: 'Simulates the complete 8-stage communication journey: encoding characters to bits, XOR stream ciphering, CRC-8 generation, Hamming(7,4) FEC, carrier modulation, noisy AWGN channel transit, and receiver recovery.',
    tip: 'Opens the animated liquid transmission modal tracking signal transit in real time.'
  },
  'resetControls': {
    title: '↺ Reset Pipeline Controls',
    category: 'LAB BENCHMARK',
    text: 'Restores all transmitter parameters back to default standard settings: Message "HELLO", Key "SF", PSK modulation, and 2.0 dB channel noise.',
    tip: 'Useful for baseline comparisons after testing extreme channel noise.'
  },
  'dummyProfileBtn': {
    title: '⚡ Quick Demo Profile (Omkar Deshmukh)',
    category: 'STUDENT IDENTITY',
    text: 'Instantly logs into SignalForge with full academic credentials for student Omkar Deshmukh, bypassing manual password input while initializing virtual lab session tracking.',
    tip: 'One-click access to all 8 virtual practical laboratories.'
  },
  'audioRecordBtn': {
    title: '🎙 Live Microphone Input (ADC)',
    category: 'ANALOG-TO-DIGITAL CONVERTER',
    text: 'Captures physical acoustic sound waves from your microphone and samples continuous air pressure variations into discrete digital float numbers.',
    tip: 'Speaks into your mic to observe real-time time-domain waveform oscillations.'
  },
  'audioStopBtn': {
    title: '⏹ Stop & Retain Audio Buffer',
    category: 'AUDIO BUFFER STORAGE',
    text: 'Stops audio capture and stores the recorded PCM samples in memory to draw the complete sound envelope and allow pitch/gain/quantization transformations.',
    tip: 'Retains your recorded buffer so you can scrub and play it back.'
  },
  'reachabilityRange': {
    title: '🌍 Global Target Audience Reach',
    category: 'STREAMING & BROADCAST CDN',
    text: 'Defines what percentage of global client devices can stream your video smoothly without buffering. Higher reach targets require lower bitrates (e.g., 720p @ 2.5 Mbps reaches ~90% of global mobile users).',
    tip: 'Slide between 50% and 99% to view recommended transcoding bitrates.'
  },
  'netRunBenchmarkBtn': {
    title: '⚡ Real Connection Benchmark',
    category: 'NETWORK TELEMETRY',
    text: 'Performs genuine client-to-server HTTP round-trip latency (RTT) and downloads a real 2MB binary payload (assets/payload.bin) to compute physical link throughput.',
    tip: 'Measures genuine millisecond latency, packet jitter, and effective Mbps.'
  }
};

class LongHoverCueEngine {
  constructor() {
    this.timer = null;
    this.activeTarget = null;
    this.ringEl = null;
    this.cardEl = null;
    this.HOLD_DURATION = 2000; // 2 seconds
  }

  init() {
    this.createDomElements();
    this.bindEvents();
  }

  createDomElements() {
    // 1. Progress Ring Cue Element
    if (!document.getElementById('sf-longhover-ring')) {
      const ring = document.createElement('div');
      ring.id = 'sf-longhover-ring';
      ring.className = 'sf-longhover-ring';
      ring.innerHTML = `
        <svg viewBox="0 0 40 40">
          <circle class="ring-bg" cx="20" cy="20" r="16"></circle>
          <circle class="ring-fill" cx="20" cy="20" r="16"></circle>
        </svg>
        <span class="ring-icon">✦</span>
      `;
      document.body.appendChild(ring);
      this.ringEl = ring;
    } else {
      this.ringEl = document.getElementById('sf-longhover-ring');
    }

    // 2. Visual Cue Callout Card
    if (!document.getElementById('sf-longhover-card')) {
      const card = document.createElement('div');
      card.id = 'sf-longhover-card';
      card.className = 'sf-longhover-card';
      document.body.appendChild(card);
      this.cardEl = card;
    } else {
      this.cardEl = document.getElementById('sf-longhover-card');
    }
  }

  bindEvents() {
    document.addEventListener('mouseover', (e) => {
      const target = e.target.closest(
        'button, .btn, input, select, label, .pipeline-tile, .trail-node, .pick-card, [data-cue], [data-term]'
      );
      if (!target) return;
      this.startHold(target, e);
    });

    document.addEventListener('mouseout', (e) => {
      const target = e.target.closest(
        'button, .btn, input, select, label, .pipeline-tile, .trail-node, .pick-card, [data-cue], [data-term]'
      );
      if (target && target === this.activeTarget) {
        this.cancelHold();
      }
    });

    document.addEventListener('mousedown', () => {
      this.cancelHold();
    });
  }

  startHold(target, e) {
    this.cancelHold();
    this.activeTarget = target;

    const cueData = this.resolveCueData(target);
    if (!cueData) return;

    // Show Progress Ring at cursor
    const rect = target.getBoundingClientRect();
    const ringX = e.clientX + 14;
    const ringY = e.clientY - 14;

    this.ringEl.style.left = `${ringX}px`;
    this.ringEl.style.top = `${ringY}px`;
    this.ringEl.classList.remove('active', 'completed');
    
    // Trigger CSS animation on fill circle
    void this.ringEl.offsetWidth; // force reflow
    this.ringEl.classList.add('active');

    // 2.0-second timer to show the visual cue card
    this.timer = setTimeout(() => {
      this.ringEl.classList.add('completed');
      this.showCueCard(cueData, target, rect);
    }, this.HOLD_DURATION);
  }

  cancelHold() {
    clearTimeout(this.timer);
    this.timer = null;
    this.activeTarget = null;
    if (this.ringEl) {
      this.ringEl.classList.remove('active', 'completed');
    }
    if (this.cardEl) {
      this.cardEl.classList.remove('show');
    }
  }

  resolveCueData(target) {
    // 1. Direct ID lookup
    const id = target.id;
    if (id && ELEMENT_CUES[id]) return ELEMENT_CUES[id];

    // 2. Label 'for' lookup (e.g. label for XOR key)
    if (target.tagName.toLowerCase() === 'label') {
      const forAttr = target.getAttribute('for');
      if (forAttr && ELEMENT_CUES[forAttr]) return ELEMENT_CUES[forAttr];
      const txt = target.textContent.trim().toLowerCase();
      if (txt.includes('xor') || txt.includes('key')) return ELEMENT_CUES['keyInput'];
      if (txt.includes('message')) return ELEMENT_CUES['msgInput'];
      if (txt.includes('modulation')) return ELEMENT_CUES['modSelect'];
      if (txt.includes('channel') || txt.includes('eb/n')) return ELEMENT_CUES['ebn0Range'];
    }

    // 3. Parent or input association
    const associatedInput = target.querySelector('input, select');
    if (associatedInput && associatedInput.id && ELEMENT_CUES[associatedInput.id]) {
      return ELEMENT_CUES[associatedInput.id];
    }

    // 4. Custom data-cue attribute
    if (target.dataset.cue) {
      try {
        return JSON.parse(target.dataset.cue);
      } catch (err) {
        return {
          title: target.dataset.cueTitle || 'Interactive Laboratory Element',
          category: 'VIRTUAL LAB CONTROL',
          text: target.dataset.cue,
          tip: 'Click or adjust to observe real-time digital communication transformation.'
        };
      }
    }

    // 5. Button Text / Context Fallbacks
    const text = target.textContent.trim();
    if (text.includes('XOR') || text.includes('ZOR') || text.includes('Stream cipher')) {
      return ELEMENT_CUES['keyInput'];
    }
    if (text.includes('Run transmission')) {
      return ELEMENT_CUES['runTrace'];
    }
    if (text.includes('Reset to HELLO')) {
      return ELEMENT_CUES['resetControls'];
    }
    if (text.includes('Quick Demo Profile') || text.includes('Omkar Deshmukh')) {
      return ELEMENT_CUES['dummyProfileBtn'];
    }
    if (text.includes('Record Mic')) {
      return ELEMENT_CUES['audioRecordBtn'];
    }
    if (text.includes('Check My Connection') || text.includes('Check Your Speed')) {
      return ELEMENT_CUES['netRunBenchmarkBtn'];
    }

    // Generic interactive cue for buttons with clear purpose
    if (target.tagName.toLowerCase() === 'button' && text.length > 2 && text.length < 35) {
      return {
        title: `Interactive Action: ${text}`,
        category: 'USER INTERACTION',
        text: `Activates the "${text}" function in this virtual laboratory. Triggers state updates and telemetry calculations.`,
        tip: 'Click to execute immediately or release mouse.'
      };
    }

    return null;
  }

  showCueCard(cueData, target, rect) {
    if (!this.cardEl) return;

    this.cardEl.innerHTML = `
      <div class="sf-cue-header">
        <span class="sf-cue-cat">${cueData.category || 'COMMUNICATION PRINCIPLE'}</span>
        <span class="sf-cue-badge">2s Long-Hover Cue</span>
      </div>
      <div class="sf-cue-title">${cueData.title}</div>
      <div class="sf-cue-text">${cueData.text}</div>
      ${cueData.tip ? `<div class="sf-cue-tip"><strong>💡 Lab Tip:</strong> ${cueData.tip}</div>` : ''}
    `;

    // Positioning
    const cardWidth = 340;
    let left = rect.left + window.scrollX;
    let top = rect.bottom + window.scrollY + 10;

    if (left + cardWidth > window.innerWidth - 18) {
      left = window.innerWidth - cardWidth - 18;
    }
    if (left < 10) left = 10;
    if (top + 160 > window.innerHeight + window.scrollY) {
      top = rect.top + window.scrollY - 160;
    }

    this.cardEl.style.left = `${left}px`;
    this.cardEl.style.top = `${top}px`;
    this.cardEl.classList.add('show');
  }
}

export const longHoverCue = new LongHoverCueEngine();

/**
 * SignalForge - Context-Aware Chatbot Assistant (chatbot.js)
 * Implements Level 1 offline knowledge-base scoring with Level 2 serverless Gemini fallback.
 * Dynamic context-aware chips, live trace number insertion, typing animation.
 */

import { State } from './state.js';
import { STAGES } from './map.js';

export function initChatbot() {
  let knowledgeData = [];
  let isOpen = false;

  // Load Level 1 offline knowledge.json
  fetch('./data/knowledge.json')
    .then(r => r.json())
    .then(data => {
      knowledgeData = data;
    })
    .catch(err => {
      console.warn('Chatbot: knowledge.json could not be loaded:', err);
    });

  // Create Chatbot DOM Container
  const botContainer = document.createElement('div');
  botContainer.className = 'sf-chatbot-container';
  botContainer.id = 'sf-chatbot-root';
  botContainer.innerHTML = `
    <!-- Floating Circular Trigger Button -->
    <button class="sf-chat-bubble-btn" id="sf-chat-bubble-btn" title="Open SignalForge Assistant" style="display:none;">
      <svg viewBox="0 0 24 24" width="26" height="26" fill="#ffffff">
        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
      </svg>
      <span class="sf-chat-bubble-badge" id="sf-chat-bubble-badge"></span>
    </button>

    <!-- Chat Panel (340x460 px / mobile bottom sheet) -->
    <div class="sf-chat-panel" id="sf-chat-panel" style="display:none;">
      <div class="sf-chat-header">
        <div class="sf-chat-header-brand">
          <span style="font-size:16px;">🤖</span>
          <div>
            <h4 class="sf-chat-title">SignalForge Assistant</h4>
            <span class="sf-chat-status">Data Communication Lab Tutor</span>
          </div>
        </div>
        <button class="sf-btn sf-btn-ghost sf-btn-xs" id="sf-chat-close-btn" style="color:#ffffff;">✕</button>
      </div>

      <!-- Quick Reply Chips -->
      <div class="sf-chat-chips-scroll" id="sf-chat-chips-scroll">
        <!-- Contextual chips populate dynamically -->
      </div>

      <!-- Message History List -->
      <div class="sf-chat-messages" id="sf-chat-messages">
        <div class="sf-chat-msg sf-msg-bot">
          <div class="sf-msg-bubble">
            Hi! I am your SignalForge virtual lab tutor. Ask me anything about data communication concepts, formulas, or what's happening on this screen.
          </div>
        </div>
      </div>

      <!-- User Input Row -->
      <form class="sf-chat-input-row" id="sf-chat-form">
        <input type="text" class="sf-chat-input" id="sf-chat-input" placeholder="Ask about BER, noise, Hamming..." maxlength="120" autocomplete="off">
        <button type="submit" class="sf-btn sf-btn-primary sf-btn-sm" id="sf-chat-send-btn">Send</button>
      </form>
    </div>
  `;

  document.body.appendChild(botContainer);

  const bubbleBtn = botContainer.querySelector('#sf-chat-bubble-btn');
  const chatPanel = botContainer.querySelector('#sf-chat-panel');
  const closeBtn = botContainer.querySelector('#sf-chat-close-btn');
  const chipsScroll = botContainer.querySelector('#sf-chat-chips-scroll');
  const messagesBox = botContainer.querySelector('#sf-chat-messages');
  const chatForm = botContainer.querySelector('#sf-chat-form');
  const chatInput = botContainer.querySelector('#sf-chat-input');

  function toggleChat(open) {
    isOpen = open !== undefined ? open : !isOpen;
    chatPanel.style.display = isOpen ? 'flex' : 'none';
    bubbleBtn.style.display = isOpen ? 'none' : 'flex';
    if (isOpen) {
      updateContextChips();
      chatInput.focus();
    }
  }

  bubbleBtn.addEventListener('click', () => toggleChat(true));
  closeBtn.addEventListener('click', () => toggleChat(false));

  // Sync visibility with session state
  function syncVisibility() {
    const isLogged = State.session && State.session.loggedIn;
    if (!isLogged) {
      bubbleBtn.style.display = 'none';
      chatPanel.style.display = 'none';
    } else {
      bubbleBtn.style.display = isOpen ? 'none' : 'flex';
    }
  }

  State.subscribe((event) => {
    if (event === 'session') syncVisibility();
  });
  window.addEventListener('hashchange', () => {
    syncVisibility();
    if (isOpen) updateContextChips();
  });
  syncVisibility();

  // Determine current context based on hash route
  function getAppContext() {
    const hash = window.location.hash || '#/login';
    const cleanRoute = hash.split('?')[0];
    const trace = State.getTrace();

    let currentStage = 'message';
    // If on pipeline or tour, inspect active tab/stage if available
    const activeTabBtn = document.querySelector('.sf-tab-btn.active');
    if (activeTabBtn) {
      currentStage = activeTabBtn.getAttribute('data-tab') || 'message';
    }

    return {
      route: cleanRoute,
      stage: currentStage,
      trace
    };
  }

  // Update contextual quick-reply chips
  function updateContextChips() {
    const ctx = getAppContext();
    let chips = [];

    if (ctx.route === '#/tour' || ctx.route === '#/lab/pipeline') {
      chips = [
        "What's happening here?",
        "What is BER?",
        "Why does noise flip bits?",
        "Who does the encryption?",
        "How does Hamming fix errors?",
        "Which practical is this?"
      ];
    } else if (ctx.route === '#/lab/media') {
      chips = [
        "How are images sent?",
        "What is PSNR?",
        "Why does video use frames?",
        "What is quantization?",
        "Which practical is this?"
      ];
    } else if (ctx.route === '#/lab/signal') {
      chips = [
        "What is AM vs FM vs PM?",
        "How does PCM work?",
        "What is the Nyquist sampling theorem?",
        "What is quantization noise?"
      ];
    } else if (ctx.route === '#/lab/network') {
      chips = [
        "What is ping and RTT?",
        "What does a switch do?",
        "What is throughput vs latency?",
        "What is jitter?"
      ];
    } else if (ctx.route === '#/lab/mux') {
      chips = [
        "Why use TDM vs FDM?",
        "What is statistical multiplexing?",
        "What is a guard band?"
      ];
    } else if (ctx.route === '#/lab/basics') {
      chips = [
        "How to convert binary to decimal?",
        "What is ASCII?",
        "What is a parity bit?"
      ];
    } else {
      chips = [
        "What is SignalForge?",
        "What is real vs simulated?",
        "What is WebAssembly?",
        "Which practical is this?"
      ];
    }

    chipsScroll.innerHTML = chips.map(c => `<button class="sf-chat-chip" data-q="${c}">${c}</button>`).join('');

    chipsScroll.querySelectorAll('.sf-chat-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        const q = btn.getAttribute('data-q');
        handleUserQuestion(q);
      });
    });
  }

  // Append Message to UI
  function appendMessage(text, sender = 'bot') {
    const msg = document.createElement('div');
    msg.className = `sf-chat-msg sf-msg-${sender}`;
    msg.innerHTML = `<div class="sf-msg-bubble">${text}</div>`;
    messagesBox.appendChild(msg);
    messagesBox.scrollTop = messagesBox.scrollHeight;
  }

  // Typing animation
  function showTypingIndicator() {
    const typing = document.createElement('div');
    typing.className = 'sf-chat-msg sf-msg-bot sf-msg-typing';
    typing.id = 'sf-typing-dots';
    typing.innerHTML = `<div class="sf-msg-bubble"><span class="sf-typing-dot"></span><span class="sf-typing-dot"></span><span class="sf-typing-dot"></span></div>`;
    messagesBox.appendChild(typing);
    messagesBox.scrollTop = messagesBox.scrollHeight;
    return () => typing.remove();
  }

  // Live "What's happening here?" generator with live trace numbers
  function generateStageExplanation(ctx) {
    const stageId = ctx.stage;
    const trace = ctx.trace;
    if (!trace) return "The transmission chain is currently idle. Press 'Run transmission' to see live data.";

    const stData = trace.stages[stageId];
    if (stageId === 'message') {
      return `At Stage 1 (Message), your plain information "${stData.text || 'HELLO'}" is ready for transmission (${(stData.bytes || []).length} bytes, ${(stData.bytes || []).length * 8} bits).`;
    } else if (stageId === 'encode') {
      return `At Stage 2 (Encode), each letter was translated into its 8-bit ASCII binary equivalent, creating a bitstream of ${stData.bits.length} raw bits.`;
    } else if (stageId === 'encrypt') {
      return `At Stage 3 (Encrypt), confidentiality is applied. The ${stData.bits.length} bits are scrambled with key "${stData.key}" using an XOR stream cipher. Status: ${stData.on ? 'ENABLED' : 'DISABLED'}.`;
    } else if (stageId === 'protect') {
      return `At Stage 4 (Protect), error control is active: CRC-8 checksum is 0x${stData.crcValue.toString(16).toUpperCase()} and Hamming(7,4) created ${stData.blocks} blocks, expanding 48 bits into ${stData.totalCodedBits} bits on air.`;
    } else if (stageId === 'modulate') {
      return `At Stage 5 (Modulate), bits were turned into a continuous ${stData.modulation} radio carrier waveform at ${stData.samplesPerBit} samples per bit (${stData.txBits.length} total bits).`;
    } else if (stageId === 'channel') {
      return `At Stage 6 (Channel), the physical channel added AWGN noise at Eb/N0 = ${stData.ebn0dB} dB (noise σ = ${stData.sigma.toFixed(3)}). ${stData.flippedIndices.length} bits were flipped by noise!`;
    } else if (stageId === 'demodulate') {
      return `At Stage 7 (Demodulate), the correlation receiver decided bit values from the noisy wave. ${stData.rawErrors} wrong bits were detected (raw channel BER = ${(stData.rawBER * 100).toFixed(1)}%).`;
    } else if (stageId === 'recover') {
      return `At Stage 8 (Recover), Hamming fixed ${stData.correctedBlocks} error blocks, the CRC check reported ${stData.crcOk ? 'OK ✔' : 'FAILED ✘'}, and decryption restored the text to "${stData.text}" (Final BER = ${(stData.finalBER * 100).toFixed(1)}%).`;
    }
    return "You are exploring the SignalForge digital communication pipeline.";
  }

  // Answer matching via Level 1 knowledge scoring
  function findOfflineAnswer(question, ctx) {
    const qLower = question.toLowerCase().replace(/[^a-z0-9\s]/g, '');
    const qWords = qLower.split(/\s+/).filter(w => w.length > 2);

    if (qLower.includes("what happening here") || qLower.includes("what is happening here") || qLower.includes("current stage")) {
      return generateStageExplanation(ctx);
    }

    let bestScore = 0;
    let bestEntry = null;

    for (const entry of knowledgeData) {
      let score = 0;
      for (const kw of entry.keywords) {
        const kwLower = kw.toLowerCase();
        if (qLower.includes(kwLower)) {
          score += 3;
        } else {
          const kwWords = kwLower.split(/\s+/);
          for (const kwWord of kwWords) {
            if (qWords.includes(kwWord)) score += 1;
          }
        }
      }

      // Boost entry if it matches current app stage
      if (entry.stage && entry.stage === ctx.stage) {
        score += 2;
      }

      if (score > bestScore) {
        bestScore = score;
        bestEntry = entry;
      }
    }

    if (bestScore >= 2 && bestEntry) {
      return bestEntry.answer;
    }

    return "I don't know that one yet. Try asking about BER, noise, Hamming, modulation, encryption, or click one of the suggestion chips above.";
  }

  // Query Level 2 serverless Gemini API with 6s timeout
  async function queryGeminiApi(question, ctx) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    try {
      const resp = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, context: ctx }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (resp.ok) {
        const data = await resp.json();
        if (data && data.answer) {
          return data.answer;
        }
      }
    } catch (e) {
      // Timeout or offline fallback
    }
    return null;
  }

  // Handle Question Submission
  async function handleUserQuestion(q) {
    if (!q || !q.trim()) return;
    const cleanQ = q.trim();
    chatInput.value = '';

    appendMessage(cleanQ, 'user');
    const removeTyping = showTypingIndicator();

    const ctx = getAppContext();

    // 1. Try Level 2 AI API first
    let reply = await queryGeminiApi(cleanQ, ctx);

    // 2. Fall back to Level 1 Offline Knowledge Brain
    if (!reply) {
      reply = findOfflineAnswer(cleanQ, ctx);
    }

    // 400ms natural delay
    setTimeout(() => {
      removeTyping();
      appendMessage(reply, 'bot');
    }, 400);
  }

  chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    handleUserQuestion(chatInput.value);
  });
}

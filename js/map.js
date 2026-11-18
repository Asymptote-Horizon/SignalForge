/**
 * SignalForge - Pipeline Map Component (map.js)
 * Interactive SVG Map with 8 Stages, 3 Zones, animated cables, traveling packet,
 * dynamic particles, and responsive layout.
 */

export const STAGES = [
  { id: 'message', num: 1, title: 'Message', subtitle: 'Source Data', zone: 'TRANSMITTER', color: '#22d3ee', icon: 'M4 4h16v12H5.17L4 17.17V4zm2 3v2h12V7H6zm0 4v2h8v-2H6z' },
  { id: 'encode', num: 2, title: 'Encode', subtitle: 'ASCII → Bits', zone: 'TRANSMITTER', color: '#60a5fa', icon: 'M4 6h4v12H4zm6 0h4v12h-4zm6 0h4v12h-4z M5 8h2v8H5zm6 0h2v8h-2zm6 0h2v8h-2z' },
  { id: 'encrypt', num: 3, title: 'Encrypt', subtitle: 'XOR Scramble', zone: 'TRANSMITTER', color: '#a78bfa', icon: 'M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z' },
  { id: 'protect', num: 4, title: 'Protect', subtitle: 'CRC + Hamming', zone: 'TRANSMITTER', color: '#fbbf24', icon: 'M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z' },
  { id: 'modulate', num: 5, title: 'Modulate', subtitle: 'Bits → Wave', zone: 'TRANSMITTER', color: '#34d399', icon: 'M2 12c2.5-6 5.5-6 8 0s5.5 6 8 0 5.5-6 8 0' },
  { id: 'channel', num: 6, title: 'Channel', subtitle: 'AWGN Medium', zone: 'CHANNEL', color: '#f472b6', icon: 'M11 21h-1l1-7H7.5c-.58 0-.57-.32-.38-.66.19-.34.05-.08.07-.12C8.48 10.94 10.42 7.54 13 3h1l-1 7h3.5c.49 0 .56.33.47.51l-.07.15-4.9 10.34z' },
  { id: 'demodulate', num: 7, title: 'Demodulate', subtitle: 'Correlator', zone: 'RECEIVER', color: '#2dd4bf', icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z' },
  { id: 'recover', num: 8, title: 'Recover', subtitle: 'FEC & Decrypt', zone: 'RECEIVER', color: '#a3e635', icon: 'M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z' }
];

export function createMap(containerEl, options = {}) {
  const interactive = options.interactive !== false;
  const isTour = !!options.isTour;

  let activeStageId = 'message';
  let doneStages = new Set();
  let trace = null;
  let clickCallback = null;
  let isPaused = false;
  let currentAnim = null;

  // Create Root DOM Elements
  const wrapper = document.createElement('div');
  wrapper.className = 'sf-map-wrapper';

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'sf-map-svg');
  svg.setAttribute('viewBox', '0 0 1100 240');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

  // Defs: Filters, Gradients, Marker
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  defs.innerHTML = `
    <filter id="sf-glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="6" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
    <filter id="sf-glow-packet" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="4" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
    <linearGradient id="sf-grad-tx" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#22d3ee" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="#34d399" stop-opacity="0.08"/>
    </linearGradient>
    <linearGradient id="sf-grad-ch" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#f472b6" stop-opacity="0.14"/>
      <stop offset="100%" stop-color="#ec4899" stop-opacity="0.14"/>
    </linearGradient>
    <linearGradient id="sf-grad-rx" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#2dd4bf" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="#a3e635" stop-opacity="0.08"/>
    </linearGradient>
  `;
  svg.appendChild(defs);

  // Group Layers
  const zonesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  zonesGroup.setAttribute('class', 'sf-map-zones');
  svg.appendChild(zonesGroup);

  const cablesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  cablesGroup.setAttribute('class', 'sf-map-cables');
  svg.appendChild(cablesGroup);

  const nodesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  nodesGroup.setAttribute('class', 'sf-map-nodes');
  svg.appendChild(nodesGroup);

  const packetGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  packetGroup.setAttribute('class', 'sf-map-packet-layer');
  svg.appendChild(packetGroup);

  const particlesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  particlesGroup.setAttribute('class', 'sf-map-particles-layer');
  svg.appendChild(particlesGroup);

  wrapper.appendChild(svg);

  // Data Strip (under map)
  let dataStrip = null;
  if (!isTour) {
    dataStrip = document.createElement('div');
    dataStrip.className = 'sf-map-datastrip';
    dataStrip.innerHTML = `
      <div class="sf-datastrip-label">STAGE <span id="sf-ds-stage">1: MESSAGE</span></div>
      <div class="sf-datastrip-content" id="sf-ds-content">HELLO</div>
      <div class="sf-datastrip-meta" id="sf-ds-meta">40 bits</div>
    `;
    wrapper.appendChild(dataStrip);
  }

  containerEl.replaceChildren(wrapper);

  // Layout Calculations: 8 nodes horizontally
  // ViewBox: 1100 x 240
  const nodeWidth = 104;
  const nodeHeight = 114;
  const startX = 26;
  const spacingX = 132;
  const nodeY = 82;

  const nodePositions = STAGES.map((st, i) => {
    return {
      id: st.id,
      x: startX + i * spacingX,
      y: nodeY,
      cx: startX + i * spacingX + nodeWidth / 2,
      cy: nodeY + nodeHeight / 2
    };
  });

  // Render Background Zone Bands
  function renderZones() {
    zonesGroup.innerHTML = '';

    // Zone 1: TRANSMITTER (nodes 1..5)
    const txW = (nodePositions[4].x + nodeWidth + 14) - (nodePositions[0].x - 14);
    const txRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    txRect.setAttribute('x', nodePositions[0].x - 14);
    txRect.setAttribute('y', 16);
    txRect.setAttribute('width', txW);
    txRect.setAttribute('height', 198);
    txRect.setAttribute('rx', '14');
    txRect.setAttribute('fill', 'url(#sf-grad-tx)');
    txRect.setAttribute('stroke', '#22d3ee');
    txRect.setAttribute('stroke-opacity', '0.22');
    txRect.setAttribute('stroke-width', '1');
    zonesGroup.appendChild(txRect);

    const txText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    txText.setAttribute('x', nodePositions[0].x);
    txText.setAttribute('y', 36);
    txText.setAttribute('fill', '#22d3ee');
    txText.setAttribute('font-family', 'Inter, sans-serif');
    txText.setAttribute('font-size', '11');
    txText.setAttribute('font-weight', '700');
    txText.setAttribute('letter-spacing', '1.5');
    txText.textContent = 'TRANSMITTER';
    zonesGroup.appendChild(txText);

    // Zone 2: CHANNEL (node 6)
    const chX = nodePositions[5].x - 12;
    const chW = nodeWidth + 24;
    const chRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    chRect.setAttribute('x', chX);
    chRect.setAttribute('y', 16);
    chRect.setAttribute('width', chW);
    chRect.setAttribute('height', 198);
    chRect.setAttribute('rx', '14');
    chRect.setAttribute('fill', 'url(#sf-grad-ch)');
    chRect.setAttribute('stroke', '#f472b6');
    chRect.setAttribute('stroke-opacity', '0.35');
    chRect.setAttribute('stroke-width', '1.2');
    zonesGroup.appendChild(chRect);

    const chText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    chText.setAttribute('x', chX + 12);
    chText.setAttribute('y', 36);
    chText.setAttribute('fill', '#f472b6');
    chText.setAttribute('font-family', 'Inter, sans-serif');
    chText.setAttribute('font-size', '11');
    chText.setAttribute('font-weight', '700');
    chText.setAttribute('letter-spacing', '1.5');
    chText.textContent = 'CHANNEL (AWGN)';
    zonesGroup.appendChild(chText);

    // Drifting stormy noise dots in channel zone
    for (let d = 0; d < 8; d++) {
      const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dot.setAttribute('cx', chX + 14 + (d * 14) % (chW - 24));
      dot.setAttribute('cy', 44 + (d * 21) % 150);
      dot.setAttribute('r', '1.8');
      dot.setAttribute('fill', '#f472b6');
      dot.setAttribute('opacity', '0.5');
      dot.setAttribute('class', 'sf-channel-dot');
      zonesGroup.appendChild(dot);
    }

    // Zone 3: RECEIVER (nodes 7..8)
    const rxX = nodePositions[6].x - 14;
    const rxW = (nodePositions[7].x + nodeWidth + 14) - rxX;
    const rxRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rxRect.setAttribute('x', rxX);
    rxRect.setAttribute('y', 16);
    rxRect.setAttribute('width', rxW);
    rxRect.setAttribute('height', 198);
    rxRect.setAttribute('rx', '14');
    rxRect.setAttribute('fill', 'url(#sf-grad-rx)');
    rxRect.setAttribute('stroke', '#2dd4bf');
    rxRect.setAttribute('stroke-opacity', '0.22');
    rxRect.setAttribute('stroke-width', '1');
    zonesGroup.appendChild(rxRect);

    const rxText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    rxText.setAttribute('x', rxX + 14);
    rxText.setAttribute('y', 36);
    rxText.setAttribute('fill', '#2dd4bf');
    rxText.setAttribute('font-family', 'Inter, sans-serif');
    rxText.setAttribute('font-size', '11');
    rxText.setAttribute('font-weight', '700');
    rxText.setAttribute('letter-spacing', '1.5');
    rxText.textContent = 'RECEIVER';
    zonesGroup.appendChild(rxText);
  }

  // Render Cables between consecutive nodes
  const cableElements = [];
  function renderCables() {
    cablesGroup.innerHTML = '';
    cableElements.length = 0;

    for (let i = 0; i < nodePositions.length - 1; i++) {
      const from = nodePositions[i];
      const to = nodePositions[i + 1];
      const startPtX = from.x + nodeWidth;
      const startPtY = from.cy;
      const endPtX = to.x;
      const endPtY = to.cy;

      // Base cable track
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const d = `M ${startPtX} ${startPtY} L ${endPtX} ${endPtY}`;
      path.setAttribute('d', d);
      path.setAttribute('class', 'sf-cable-base');
      path.setAttribute('stroke', '#1e294b');
      path.setAttribute('stroke-width', '6');
      path.setAttribute('stroke-linecap', 'round');
      cablesGroup.appendChild(path);

      // Lit/active overlay cable
      const litPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      litPath.setAttribute('d', d);
      litPath.setAttribute('class', 'sf-cable-lit');
      litPath.setAttribute('stroke', STAGES[i].color);
      litPath.setAttribute('stroke-width', '4');
      litPath.setAttribute('stroke-linecap', 'round');
      litPath.setAttribute('stroke-opacity', '0.15');
      cablesGroup.appendChild(litPath);

      cableElements.push({ fromId: STAGES[i].id, toId: STAGES[i + 1].id, path, litPath, d });
    }
  }

  // Render Node Cards
  const nodeElements = new Map();
  function renderNodes() {
    nodesGroup.innerHTML = '';
    nodeElements.clear();

    STAGES.forEach((st, i) => {
      const pos = nodePositions[i];
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', `sf-map-node sf-node-${st.id}`);
      g.setAttribute('data-stage', st.id);
      g.style.cursor = interactive ? 'pointer' : 'default';

      // Card Background
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', pos.x);
      rect.setAttribute('y', pos.y);
      rect.setAttribute('width', nodeWidth);
      rect.setAttribute('height', nodeHeight);
      rect.setAttribute('rx', '14');
      rect.setAttribute('fill', '#111a33');
      rect.setAttribute('stroke', '#25335c');
      rect.setAttribute('stroke-width', '1.5');
      rect.setAttribute('class', 'sf-node-card-bg');
      g.appendChild(rect);

      // Stage Number Pill
      const numG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      const numBg = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      numBg.setAttribute('cx', pos.x + 16);
      numBg.setAttribute('cy', pos.y + 16);
      numBg.setAttribute('r', '9');
      numBg.setAttribute('fill', '#16213f');
      numG.appendChild(numBg);

      const numTxt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      numTxt.setAttribute('x', pos.x + 16);
      numTxt.setAttribute('y', pos.y + 19.5);
      numTxt.setAttribute('text-anchor', 'middle');
      numTxt.setAttribute('fill', '#8fa0c8');
      numTxt.setAttribute('font-family', 'JetBrains Mono, monospace');
      numTxt.setAttribute('font-size', '10');
      numTxt.setAttribute('font-weight', '700');
      numTxt.textContent = String(st.num);
      numG.appendChild(numTxt);
      g.appendChild(numG);

      // Status Badge (Done Tick or Error Mark)
      const statusIcon = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      statusIcon.setAttribute('x', pos.x + nodeWidth - 14);
      statusIcon.setAttribute('y', pos.y + 20);
      statusIcon.setAttribute('text-anchor', 'middle');
      statusIcon.setAttribute('font-size', '12');
      statusIcon.setAttribute('class', 'sf-node-status-mark');
      statusIcon.textContent = '';
      g.appendChild(statusIcon);

      // Icon Box
      const iconPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      iconPath.setAttribute('d', st.icon);
      iconPath.setAttribute('fill', st.color);
      iconPath.setAttribute('transform', `translate(${pos.cx - 10}, ${pos.y + 30}) scale(0.9)`);
      g.appendChild(iconPath);

      // Title Text
      const titleTxt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      titleTxt.setAttribute('x', pos.cx);
      titleTxt.setAttribute('y', pos.y + 76);
      titleTxt.setAttribute('text-anchor', 'middle');
      titleTxt.setAttribute('fill', '#e8eefc');
      titleTxt.setAttribute('font-family', 'Inter, sans-serif');
      titleTxt.setAttribute('font-size', '12');
      titleTxt.setAttribute('font-weight', '600');
      titleTxt.textContent = st.title;
      g.appendChild(titleTxt);

      // Subtitle Text
      const subTxt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      subTxt.setAttribute('x', pos.cx);
      subTxt.setAttribute('y', pos.y + 94);
      subTxt.setAttribute('text-anchor', 'middle');
      subTxt.setAttribute('fill', '#8fa0c8');
      subTxt.setAttribute('font-family', 'Inter, sans-serif');
      subTxt.setAttribute('font-size', '9.5');
      subTxt.textContent = st.subtitle;
      g.appendChild(subTxt);

      if (interactive) {
        g.addEventListener('click', () => {
          if (clickCallback) clickCallback(st.id);
        });
      }

      nodesGroup.appendChild(g);
      nodeElements.set(st.id, { g, rect, statusIcon, st, pos });
    });
  }

  // Render Animated Packet
  let packetEl = null;
  let packetLabelPill = null;
  let packetLabelText = null;

  function initPacket() {
    packetGroup.innerHTML = '';
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'sf-packet-traveler');
    g.style.pointerEvents = 'none';

    // Outer Glow Circle
    const glowCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    glowCircle.setAttribute('r', '16');
    glowCircle.setAttribute('fill', '#22d3ee');
    glowCircle.setAttribute('opacity', '0.3');
    glowCircle.setAttribute('filter', 'url(#sf-glow-packet)');
    g.appendChild(glowCircle);

    // Inner Core Circle
    const coreCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    coreCircle.setAttribute('r', '10');
    coreCircle.setAttribute('fill', '#22d3ee');
    coreCircle.setAttribute('stroke', '#ffffff');
    coreCircle.setAttribute('stroke-width', '2');
    g.appendChild(coreCircle);

    // Label Pill
    const pill = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    pill.setAttribute('x', '-35');
    pill.setAttribute('y', '-32');
    pill.setAttribute('width', '70');
    pill.setAttribute('height', '20');
    pill.setAttribute('rx', '10');
    pill.setAttribute('fill', '#0f172a');
    pill.setAttribute('stroke', '#22d3ee');
    pill.setAttribute('stroke-width', '1.5');
    g.appendChild(pill);

    // Label Text
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', '0');
    text.setAttribute('y', '-18');
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('fill', '#ffffff');
    text.setAttribute('font-family', 'JetBrains Mono, monospace');
    text.setAttribute('font-size', '10');
    text.setAttribute('font-weight', '700');
    text.textContent = 'HELLO';
    g.appendChild(text);

    packetGroup.appendChild(g);

    // Initial position at first node
    const firstPos = nodePositions[0];
    g.setAttribute('transform', `translate(${firstPos.cx}, ${firstPos.cy})`);

    packetEl = g;
    packetLabelPill = pill;
    packetLabelText = text;
  }

  // Update Data Strip Display
  function updateDataStrip(stageId) {
    if (!dataStrip) return;
    const stage = STAGES.find(s => s.id === stageId) || STAGES[0];
    const stageLbl = dataStrip.querySelector('#sf-ds-stage');
    const contentLbl = dataStrip.querySelector('#sf-ds-content');
    const metaLbl = dataStrip.querySelector('#sf-ds-meta');

    if (stageLbl) stageLbl.textContent = `${stage.num}: ${stage.title.toUpperCase()}`;

    if (!trace) {
      if (contentLbl) contentLbl.textContent = 'HELLO';
      if (metaLbl) metaLbl.textContent = '40 bits';
      return;
    }

    const stData = trace.stages[stageId];
    if (stageId === 'message') {
      contentLbl.textContent = stData.text || '[Image]';
      metaLbl.textContent = `${(stData.bytes || []).length} bytes`;
    } else if (stageId === 'encode') {
      const bitStr = Array.from(stData.bits.slice(0, 32)).join('') + (stData.bits.length > 32 ? '...' : '');
      contentLbl.textContent = bitStr;
      metaLbl.textContent = `${stData.bits.length} bits`;
    } else if (stageId === 'encrypt') {
      const bitStr = Array.from(stData.bits.slice(0, 32)).join('') + (stData.bits.length > 32 ? '...' : '');
      contentLbl.textContent = bitStr;
      metaLbl.textContent = `key: "${stData.key}"`;
    } else if (stageId === 'protect') {
      const bitStr = Array.from(stData.codedBits.slice(0, 32)).join('') + (stData.codedBits.length > 32 ? '...' : '');
      contentLbl.textContent = bitStr;
      metaLbl.textContent = `${stData.codedBits.length} coded bits (${stData.blocks} blocks)`;
    } else if (stageId === 'modulate') {
      contentLbl.textContent = `${stData.modulation} Waveform`;
      metaLbl.textContent = `${stData.samplesPerBit} samples/bit`;
    } else if (stageId === 'channel') {
      contentLbl.textContent = `AWGN (Eb/N0 = ${stData.ebn0dB} dB)`;
      metaLbl.textContent = `${stData.flippedIndices.length} bits flipped`;
    } else if (stageId === 'demodulate') {
      const bitStr = Array.from(stData.rxBitsRaw.slice(0, 32)).join('') + (stData.rxBitsRaw.length > 32 ? '...' : '');
      contentLbl.textContent = bitStr;
      metaLbl.textContent = `raw BER: ${(stData.rawBER * 100).toFixed(1)}%`;
    } else if (stageId === 'recover') {
      contentLbl.textContent = stData.text || '[Recovered Image]';
      metaLbl.textContent = `Hamming fixed: ${stData.correctedBlocks} | CRC: ${stData.crcOk ? 'OK' : 'FAIL'}`;
    }
  }

  // Refresh Visual Node States
  function refreshNodeStates() {
    STAGES.forEach(st => {
      const elem = nodeElements.get(st.id);
      if (!elem) return;

      const isActive = st.id === activeStageId;
      const isDone = doneStages.has(st.id);
      const isChannel = st.id === 'channel';
      const isDemod = st.id === 'demodulate';

      // Check errors from trace
      const hasErrors = trace && (
        (isChannel && trace.stages.channel.flippedIndices.length > 0) ||
        (isDemod && trace.stages.demodulate.rawErrors > 0)
      );

      if (isActive) {
        elem.rect.setAttribute('stroke', st.color);
        elem.rect.setAttribute('stroke-width', '3');
        elem.rect.setAttribute('fill', '#16213f');
        elem.rect.style.filter = 'drop-shadow(0 0 10px ' + st.color + ')';
        elem.g.style.transform = 'scale(1.05)';
        elem.g.style.transformOrigin = `${elem.pos.cx}px ${elem.pos.cy}px`;
      } else if (isDone) {
        elem.rect.setAttribute('stroke', isChannel && hasErrors ? '#f472b6' : '#10b981');
        elem.rect.setAttribute('stroke-width', '1.8');
        elem.rect.setAttribute('fill', '#111a33');
        elem.rect.style.filter = 'none';
        elem.g.style.transform = 'none';
        elem.statusIcon.textContent = isChannel && hasErrors ? '⚡' : '✔';
        elem.statusIcon.setAttribute('fill', isChannel && hasErrors ? '#f472b6' : '#10b981');
      } else {
        elem.rect.setAttribute('stroke', '#25335c');
        elem.rect.setAttribute('stroke-width', '1.2');
        elem.rect.setAttribute('fill', '#0d1527');
        elem.rect.style.filter = 'none';
        elem.g.style.transform = 'none';
        elem.statusIcon.textContent = '';
      }
    });

    updateDataStrip(activeStageId);
  }

  // Particle Animations
  function spawnChannelParticles(count = 5) {
    const chPos = nodePositions[5];
    particlesGroup.innerHTML = '';

    for (let i = 0; i < count; i++) {
      const p = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      const angle = (i / count) * Math.PI * 2;
      const dist = 30 + Math.random() * 20;
      const px = chPos.cx + Math.cos(angle) * dist;
      const py = chPos.cy + Math.sin(angle) * dist;

      p.setAttribute('x', px);
      p.setAttribute('y', py);
      p.setAttribute('font-size', '16');
      p.setAttribute('fill', '#f472b6');
      p.setAttribute('class', 'sf-particle-zap');
      p.textContent = '⚡';
      particlesGroup.appendChild(p);
    }

    // Channel node shake effect
    const chElem = nodeElements.get('channel');
    if (chElem) {
      chElem.g.classList.add('sf-node-shake');
      setTimeout(() => chElem.g.classList.remove('sf-node-shake'), 400);
    }
  }

  function spawnRecoverParticles(count = 5) {
    const recPos = nodePositions[7];
    particlesGroup.innerHTML = '';

    for (let i = 0; i < count; i++) {
      const p = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      const angle = (i / count) * Math.PI * 2;
      const dist = 28 + Math.random() * 18;
      const px = recPos.cx + Math.cos(angle) * dist;
      const py = recPos.cy + Math.sin(angle) * dist;

      p.setAttribute('x', px);
      p.setAttribute('y', py);
      p.setAttribute('font-size', '15');
      p.setAttribute('fill', '#a3e635');
      p.setAttribute('class', 'sf-particle-check');
      p.textContent = '✔';
      particlesGroup.appendChild(p);
    }
  }

  // Render all initial components
  renderZones();
  renderCables();
  renderNodes();
  initPacket();
  refreshNodeStates();

  return {
    setTrace(newTrace) {
      trace = newTrace;
      refreshNodeStates();
    },

    setActive(stageId) {
      activeStageId = stageId;
      refreshNodeStates();
    },

    markDone(stageId) {
      doneStages.add(stageId);
      refreshNodeStates();
    },

    reset() {
      if (currentAnim) cancelAnimationFrame(currentAnim);
      currentAnim = null;
      isPaused = false;
      doneStages.clear();
      activeStageId = 'message';
      cableElements.forEach(c => {
        c.litPath.setAttribute('stroke-opacity', '0.15');
        c.litPath.setAttribute('stroke-width', '4');
      });
      particlesGroup.innerHTML = '';
      if (packetEl) {
        const first = nodePositions[0];
        packetEl.setAttribute('transform', `translate(${first.cx}, ${first.cy})`);
        packetLabelText.textContent = 'HELLO';
      }
      refreshNodeStates();
    },

    pause() {
      isPaused = true;
    },

    resume() {
      isPaused = false;
    },

    onNodeClick(cb) {
      clickCallback = cb;
    },

    /**
     * Animate packet traveling between two stages
     */
    travel(fromId, toId, options = {}) {
      return new Promise((resolve) => {
        const fromIdx = STAGES.findIndex(s => s.id === fromId);
        const toIdx = STAGES.findIndex(s => s.id === toId);
        if (fromIdx === -1 || toIdx === -1) {
          resolve();
          return;
        }

        const duration = options.duration || 1400;
        const label = options.label || 'DATA';
        const fromPos = nodePositions[fromIdx];
        const toPos = nodePositions[toIdx];

        if (packetLabelText) {
          packetLabelText.textContent = label;
          const labelWidth = Math.max(54, label.length * 8 + 16);
          packetLabelPill.setAttribute('width', String(labelWidth));
          packetLabelPill.setAttribute('x', String(-labelWidth / 2));
        }

        // Highlight intervening cables
        for (let i = fromIdx; i < toIdx; i++) {
          if (cableElements[i]) {
            cableElements[i].litPath.setAttribute('stroke-opacity', '0.9');
            cableElements[i].litPath.setAttribute('stroke-width', '6');
          }
        }

        let startTime = null;
        let pausedElapsed = 0;
        let lastTimestamp = performance.now();

        const step = (timestamp) => {
          if (isPaused) {
            currentAnim = requestAnimationFrame(step);
            return;
          }

          if (!startTime) startTime = timestamp;
          const elapsed = timestamp - startTime;
          const progress = Math.min(1.0, elapsed / duration);

          // Ease-in-out cubic
          const ease = progress < 0.5
            ? 4 * progress * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 3) / 2;

          const currentX = fromPos.cx + (toPos.cx - fromPos.cx) * ease;
          const currentY = fromPos.cy + (toPos.cy - fromPos.cy) * ease;

          if (packetEl) {
            packetEl.setAttribute('transform', `translate(${currentX}, ${currentY})`);
          }

          if (progress < 1.0) {
            currentAnim = requestAnimationFrame(step);
          } else {
            currentAnim = null;
            if (packetEl) {
              packetEl.setAttribute('transform', `translate(${toPos.cx}, ${toPos.cy})`);
            }

            // Special stage particle effects
            if (toId === 'channel') {
              const flipped = trace ? trace.stages.channel.flippedIndices.length : 4;
              spawnChannelParticles(Math.min(flipped, 8));
            } else if (toId === 'recover') {
              const fixed = trace ? trace.stages.recover.correctedBlocks : 3;
              spawnRecoverParticles(Math.min(fixed, 7));
            }

            resolve();
          }
        };

        currentAnim = requestAnimationFrame(step);
      });
    }
  };
}

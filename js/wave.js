/**
 * SignalForge - Waveform & Visual Renderers Module
 * Renders waveforms, bit-chips, overlays, and pixel grids on HTML5 Canvas and DOM.
 * High-DPI support, dark lab console theme styling.
 */

export const Wave = {
  COLORS: {
    bg: '#0a0f1e',
    panel: '#111a33',
    line: '#25335c',
    text: '#e8eefc',
    muted: '#8fa0c8',
    cyan: '#22d3ee',
    violet: '#a78bfa',
    noise: '#f472b6',
    ok: '#34d399',
    warn: '#fbbf24',
    err: '#f87171'
  },

  /**
   * Setup canvas for crisp High-DPI rendering
   */
  setupCanvas(canvas) {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width || canvas.width || 300;
    const h = rect.height || canvas.height || 150;

    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);

    const ctx = canvas.getContext('2d');
    ctx.resetTransform?.();
    ctx.scale(dpr, dpr);
    return { ctx, width: w, height: h };
  },

  /**
   * Render continuous modulated waveform
   */
  renderWaveform(canvas, waveform, bits, options = {}) {
    if (!canvas || !waveform) return;
    const { ctx, width, height } = this.setupCanvas(canvas);
    const N = options.samplesPerBit || 20;
    const bitStart = options.bitStart || 0;
    const bitCount = options.bitCount || 16;
    const totalBits = bits ? bits.length : Math.floor(waveform.length / N);

    const sampleStart = bitStart * N;
    const sampleCount = Math.min(bitCount * N, waveform.length - sampleStart);
    if (sampleCount <= 0) return;

    // Clear
    ctx.fillStyle = '#0d1527';
    ctx.fillRect(0, 0, width, height);

    // Padding
    const padTop = 32;
    const padBottom = 20;
    const plotH = height - padTop - padBottom;
    const midY = padTop + plotH / 2;
    const ampY = (plotH / 2) * 0.85;

    // Center grid line
    ctx.strokeStyle = '#1e294b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(width, midY);
    ctx.moveTo(0, midY - ampY);
    ctx.lineTo(width, midY - ampY);
    ctx.moveTo(0, midY + ampY);
    ctx.lineTo(width, midY + ampY);
    ctx.stroke();

    // Amplitude markers
    ctx.fillStyle = '#64748b';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillText('+1.0', 4, midY - ampY + 10);
    ctx.fillText(' 0.0', 4, midY - 3);
    ctx.fillText('-1.0', 4, midY + ampY - 2);

    // Bit vertical boundaries & labels
    const actualBitsToDraw = Math.min(bitCount, totalBits - bitStart);
    const bitWidthPx = width / actualBitsToDraw;

    for (let b = 0; b < actualBitsToDraw; b++) {
      const bitIdx = bitStart + b;
      const x = b * bitWidthPx;

      // Divider
      ctx.strokeStyle = '#1e2d52';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(x, padTop - 12);
      ctx.lineTo(x, height);
      ctx.stroke();
      ctx.setLineDash([]);

      // Bit value pill
      if (bits && bitIdx < bits.length) {
        const bitVal = bits[bitIdx];
        const pillX = x + bitWidthPx / 2;
        ctx.fillStyle = bitVal === 1 ? '#0284c7' : '#334155';
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(pillX - 11, 4, 22, 18, 4) : ctx.rect(pillX - 11, 4, 22, 18);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(String(bitVal), pillX, 17);
      }
    }

    // Draw waveform trace
    ctx.strokeStyle = options.color || this.COLORS.cyan;
    ctx.lineWidth = 2.5;
    ctx.shadowColor = options.color || this.COLORS.cyan;
    ctx.shadowBlur = 8;
    ctx.beginPath();

    for (let s = 0; s < sampleCount; s++) {
      const x = (s / sampleCount) * width;
      const sampleVal = waveform[sampleStart + s];
      const y = midY - sampleVal * ampY;

      if (s === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
  },

  /**
   * Render Clean Wave overlaid with Noisy Received Wave
   */
  renderOverlay(canvas, cleanWave, noisyWave, bits, flippedIndices = [], options = {}) {
    if (!canvas || !cleanWave || !noisyWave) return;
    const { ctx, width, height } = this.setupCanvas(canvas);
    const N = options.samplesPerBit || 20;
    const bitStart = options.bitStart || 0;
    const bitCount = options.bitCount || 16;
    const totalBits = bits ? bits.length : Math.floor(cleanWave.length / N);

    const sampleStart = bitStart * N;
    const sampleCount = Math.min(bitCount * N, cleanWave.length - sampleStart);
    if (sampleCount <= 0) return;

    ctx.fillStyle = '#0d1527';
    ctx.fillRect(0, 0, width, height);

    const padTop = 32;
    const padBottom = 20;
    const plotH = height - padTop - padBottom;
    const midY = padTop + plotH / 2;
    const ampY = (plotH / 2) * 0.75;

    // Grid
    ctx.strokeStyle = '#1e294b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, midY); ctx.lineTo(width, midY);
    ctx.moveTo(0, midY - ampY); ctx.lineTo(width, midY - ampY);
    ctx.moveTo(0, midY + ampY); ctx.lineTo(width, midY + ampY);
    ctx.stroke();

    const actualBits = Math.min(bitCount, totalBits - bitStart);
    const bitWidthPx = width / actualBits;

    // Highlight flipped bit slots in light reddish tint
    for (let b = 0; b < actualBits; b++) {
      const bitIdx = bitStart + b;
      const x = b * bitWidthPx;

      if (flippedIndices.includes(bitIdx)) {
        ctx.fillStyle = 'rgba(248, 113, 113, 0.22)';
        ctx.fillRect(x, padTop, bitWidthPx, plotH);

        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x, padTop, bitWidthPx, plotH);
      }

      // Bit boundary
      ctx.strokeStyle = '#1e2d52';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(x, padTop - 12);
      ctx.lineTo(x, height);
      ctx.stroke();
      ctx.setLineDash([]);

      if (bits && bitIdx < bits.length) {
        const isFlipped = flippedIndices.includes(bitIdx);
        const pillX = x + bitWidthPx / 2;
        ctx.fillStyle = isFlipped ? '#dc2626' : '#334155';
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(pillX - 11, 4, 22, 18, 4) : ctx.rect(pillX - 11, 4, 22, 18);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(String(bits[bitIdx]), pillX, 17);
      }
    }

    // Faint Clean Wave (Cyan)
    ctx.strokeStyle = 'rgba(34, 211, 238, 0.5)';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    for (let s = 0; s < sampleCount; s++) {
      const x = (s / sampleCount) * width;
      const y = midY - cleanWave[sampleStart + s] * ampY;
      if (s === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Noisy Received Wave (Magenta / Pink)
    ctx.strokeStyle = this.COLORS.noise;
    ctx.lineWidth = 2.0;
    ctx.shadowColor = this.COLORS.noise;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    for (let s = 0; s < sampleCount; s++) {
      const x = (s / sampleCount) * width;
      const y = midY - noisyWave[sampleStart + s] * ampY;
      if (s === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
  },

  /**
   * Render Channel Noise Histogram vs Theoretical Normal PDF
   */
  renderNoiseHistogram(canvas, noiseArray, sigma) {
    if (!canvas || !noiseArray || noiseArray.length === 0) return;
    const { ctx, width, height } = this.setupCanvas(canvas);

    ctx.fillStyle = '#0d1527';
    ctx.fillRect(0, 0, width, height);

    const pad = 24;
    const plotW = width - pad * 2;
    const plotH = height - pad * 2;
    const midX = pad + plotW / 2;

    const range = Math.max(3.5 * sigma, 1.5);
    const binsCount = 31;
    const binWidth = (2 * range) / binsCount;
    const counts = new Array(binsCount).fill(0);

    for (let i = 0; i < noiseArray.length; i++) {
      const n = noiseArray[i];
      const binIdx = Math.floor((n + range) / binWidth);
      if (binIdx >= 0 && binIdx < binsCount) {
        counts[binIdx]++;
      }
    }

    const maxCount = Math.max(...counts, 1);
    const barW = plotW / binsCount;

    // Draw bars
    ctx.fillStyle = 'rgba(244, 114, 182, 0.45)';
    ctx.strokeStyle = '#f472b6';
    ctx.lineWidth = 1;

    for (let i = 0; i < binsCount; i++) {
      const barH = (counts[i] / maxCount) * (plotH - 10);
      const x = pad + i * barW;
      const y = pad + plotH - barH;
      ctx.fillRect(x, y, barW - 1, barH);
      ctx.strokeRect(x, y, barW - 1, barH);
    }

    // Draw Theoretical Normal PDF Curve
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let px = 0; px <= plotW; px += 2) {
      const xVal = -range + (px / plotW) * (2 * range);
      const pdf = (1.0 / (sigma * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * (xVal / sigma) ** 2);
      const maxPdf = 1.0 / (sigma * Math.sqrt(2 * Math.PI));
      const py = (pdf / maxPdf) * (plotH - 10);
      const y = pad + plotH - py;
      if (px === 0) ctx.moveTo(pad + px, y); else ctx.lineTo(pad + px, y);
    }
    ctx.stroke();

    // Axis and labels
    ctx.fillStyle = '#8fa0c8';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillText(`-3σ`, pad, height - 6);
    ctx.fillText(`0`, midX - 3, height - 6);
    ctx.fillText(`+3σ`, pad + plotW - 16, height - 6);
    ctx.fillText(`AWGN Noise Distribution (σ = ${sigma.toFixed(3)})`, pad, 14);
  },

  /**
   * Render 4-bit grayscale pixel grid onto canvas
   */
  renderPixelCanvas(canvas, pixels, width = 32, height = 32, options = {}) {
    if (!canvas || !pixels) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width || canvas.width || 128;
    const h = rect.height || canvas.height || 128;

    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);

    const ctx = canvas.getContext('2d');
    ctx.resetTransform?.();
    ctx.scale(dpr, dpr);

    // Render offscreen at pixel resolution and draw scaled
    const off = document.createElement('canvas');
    off.width = width;
    off.height = height;
    const offCtx = off.getContext('2d');
    const imgData = offCtx.createImageData(width, height);
    const data = imgData.data;

    const diffPixels = options.diffPixels || null;

    for (let i = 0; i < pixels.length; i++) {
      const val = Math.min(15, Math.max(0, pixels[i]));
      const gray = Math.round((val / 15.0) * 255);
      const idx = i * 4;

      if (diffPixels && diffPixels[i]) {
        // Red highlight for flipped pixel
        data[idx + 0] = 239;
        data[idx + 1] = 68;
        data[idx + 2] = 68;
        data[idx + 3] = 255;
      } else {
        data[idx + 0] = gray;
        data[idx + 1] = gray;
        data[idx + 2] = gray;
        data[idx + 3] = 255;
      }
    }

    offCtx.putImageData(imgData, 0, 0);

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(off, 0, 0, w, h);

    if (options.border) {
      ctx.strokeStyle = options.borderColor || '#334155';
      ctx.lineWidth = 1;
      ctx.strokeRect(0, 0, w, h);
    }
  }
};

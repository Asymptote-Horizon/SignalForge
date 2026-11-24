/**
 * SignalForge - Diagnostics & Boot Reliability Module
 * Catches runtime/module failures, verifies DOM mount points, and tracks engine status.
 */

class DiagnosticsManager {
  constructor() {
    this.errors = [];
    this.engineStatus = 'initializing';
    this.initErrorListeners();
  }

  initErrorListeners() {
    if (typeof window === 'undefined') return;

    window.addEventListener('error', (event) => {
      const errorMsg = event.error ? (event.error.message || String(event.error)) : event.message;
      const source = event.filename ? `${event.filename}:${event.lineno}` : 'unknown source';
      this.recordError('Unhandled Runtime Error', errorMsg, source, true);
    });

    window.addEventListener('unhandledrejection', (event) => {
      const reason = event.reason ? (event.reason.message || String(event.reason)) : 'Promise rejected without reason';
      this.recordError('Unhandled Promise Rejection', reason, 'Async Operation', true);
    });
  }

  recordError(type, message, context = '', isFatal = false) {
    const entry = {
      timestamp: new Date().toISOString(),
      type,
      message,
      context,
      isFatal
    };
    this.errors.push(entry);
    console.error(`[SignalForge Diagnostics] ${type}: ${message} (${context})`);

    if (isFatal) {
      this.displayBootError(`${type}: ${message}`);
    }
  }

  displayBootError(message) {
    console.error(`[SignalForge Diagnostics Fatal] ${message}`);
    // Keep user-facing virtual lab clean; log diagnostic info to console
    const errorEl = document.getElementById('sf-boot-error');
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.style.display = 'none';
      errorEl.classList.add('hidden');
    }
  }

  clearBootError() {
    const errorEl = document.getElementById('sf-boot-error');
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.style.display = 'none';
      errorEl.classList.add('hidden');
    }
  }

  checkMountPoints(expectedIds = []) {
    const missing = [];
    for (const id of expectedIds) {
      if (!document.getElementById(id)) {
        missing.push(id);
      }
    }
    if (missing.length > 0) {
      this.recordError(
        'Missing DOM Mount Point',
        `Critical elements missing: ${missing.join(', ')}`,
        'Mount Point Verification',
        true
      );
      return false;
    }
    return true;
  }

  setEngineStatus(status, details = '') {
    this.engineStatus = status;
    const badgeText = document.getElementById('sf-engine-text');
    if (badgeText) {
      if (status === 'wasm') {
        badgeText.textContent = 'Engine: WebAssembly (C)';
      } else if (status === 'js_fallback') {
        badgeText.textContent = 'Engine: JavaScript Fallback';
      } else if (status === 'failed') {
        badgeText.textContent = 'Engine: Offline / Fallback';
      } else {
        badgeText.textContent = `Engine: ${status}`;
      }
    }

    const statEl = document.getElementById('welcomeEngineStat');
    if (statEl) {
      statEl.textContent = status === 'wasm' ? 'WASM (C)' : 'JAVASCRIPT';
    }
  }

  async verifyAsset(url) {
    try {
      const resp = await fetch(url, { method: 'HEAD' });
      return resp.ok;
    } catch (e) {
      return false;
    }
  }
}

export const diagnostics = new DiagnosticsManager();

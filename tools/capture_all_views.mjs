import { spawn } from 'child_process';
import fs from 'fs';

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function getPageWsUrl(port = 9229) {
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json`);
      const list = await res.json();
      const page = list.find(p => p.type === 'page');
      if (page && page.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch (e) {}
    await delay(200);
  }
  throw new Error('No ws url');
}

class CDPClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 1;
    this.callbacks = new Map();
  }
  async connect() {
    this.ws.onmessage = (event) => {
      const parsed = JSON.parse(event.data);
      if (parsed.id && this.callbacks.has(parsed.id)) {
        const { resolve, reject } = this.callbacks.get(parsed.id);
        this.callbacks.delete(parsed.id);
        if (parsed.error) reject(parsed.error);
        else resolve(parsed.result);
      }
    };
    return new Promise((res, rej) => { this.ws.onopen = res; this.ws.onerror = rej; });
  }
  send(method, params = {}) {
    const id = this.id++;
    return new Promise((resolve, reject) => {
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  async eval(expr) {
    const res = await this.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (res.exceptionDetails) throw new Error(JSON.stringify(res.exceptionDetails));
    return res.result ? res.result.value : undefined;
  }
  close() { this.ws.close(); }
}

async function capture() {
  const chromeExe = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const tempUserData = `C:\\Users\\Omkar\\AppData\\Local\\Temp\\chrome_cap_${Date.now()}`;
  const chromeProc = spawn(chromeExe, [
    '--headless=new',
    '--remote-debugging-port=9229',
    '--disable-gpu',
    '--no-sandbox',
    `--user-data-dir=${tempUserData}`,
    'http://localhost:8000/'
  ]);

  try {
    await delay(1200);
    const wsUrl = await getPageWsUrl(9229);
    const client = new CDPClient(wsUrl);
    await client.connect();
    await client.send('Page.enable');

    // 1. Desktop Test (1366x768)
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 1366,
      height: 768,
      deviceScaleFactor: 1,
      mobile: false
    });

    await client.send('Page.navigate', { url: 'http://localhost:8000/' });
    await delay(1200);

    // Login
    await client.eval(`document.getElementById('googleLoginBtn').click()`);
    await delay(300);
    await client.eval(`document.getElementById('googleAccountItemOmkar').click()`);
    await delay(800);

    // Go to WASM C++ Studio on Desktop
    await client.eval(`window.location.hash = '#/lab/wasm'`);
    await delay(1000);

    const desktopEditorMetrics = await client.eval(`
      (() => {
        const ta = document.getElementById('cppCodeTextarea');
        const r = ta ? ta.getBoundingClientRect() : null;
        return {
          exists: !!ta,
          width: r ? r.width : 0,
          height: r ? r.height : 0,
          lineCount: ta ? ta.value.split('\\n').length : 0,
          charCount: ta ? ta.value.length : 0
        };
      })()
    `);
    console.log('Desktop WASM C++ Editor Metrics:', desktopEditorMetrics);

    let shot = await client.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('tools/verify_desktop_wasm.png', Buffer.from(shot.data, 'base64'));

    // 2. Mobile Test (iPhone 13: 390x844)
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true
    });
    await delay(800);

    const mobileEditorMetrics = await client.eval(`
      (() => {
        const ta = document.getElementById('cppCodeTextarea');
        const r = ta ? ta.getBoundingClientRect() : null;
        return {
          exists: !!ta,
          width: r ? r.width : 0,
          height: r ? r.height : 0
        };
      })()
    `);
    console.log('Mobile WASM C++ Editor Metrics:', mobileEditorMetrics);

    shot = await client.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('tools/verify_mobile_wasm.png', Buffer.from(shot.data, 'base64'));

    // Mobile Media Lab
    await client.eval(`window.location.hash = '#/lab/media'`);
    await delay(800);
    shot = await client.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('tools/verify_mobile_media.png', Buffer.from(shot.data, 'base64'));

    // Mobile Welcome
    await client.eval(`window.location.hash = '#/welcome'`);
    await delay(800);
    shot = await client.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('tools/verify_mobile_welcome.png', Buffer.from(shot.data, 'base64'));

    console.log('Screenshots captured successfully!');
    client.close();
  } finally {
    chromeProc.kill();
  }
}

capture().catch(console.error);

import { spawn } from 'child_process';
import fs from 'fs';

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function getPageWsUrl(port = 9227) {
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

async function findWideElements() {
  const possiblePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe'
  ];
  let chromeExe = possiblePaths.find(p => fs.existsSync(p)) || 'chrome';
  const tempUserData = `C:\\Users\\Omkar\\AppData\\Local\\Temp\\chrome_wide_${Date.now()}`;
  const chromeProc = spawn(chromeExe, [
    '--headless=new',
    '--remote-debugging-port=9227',
    '--disable-gpu',
    '--no-sandbox',
    `--user-data-dir=${tempUserData}`,
    'http://localhost:8000/'
  ]);

  try {
    await delay(1200);
    const wsUrl = await getPageWsUrl(9227);
    const client = new CDPClient(wsUrl);
    await client.connect();
    await client.send('Page.enable');

    // Force strict 390 width
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
      fitWindow: false
    });

    await client.send('Page.navigate', { url: 'http://localhost:8000/' });
    await delay(1500);

    // Login
    await client.eval(`document.getElementById('googleLoginBtn').click()`);
    await delay(300);
    await client.eval(`document.getElementById('googleAccountItemOmkar').click()`);
    await delay(800);

    const checkWide = async (name) => {
      const culprits = await client.eval(`
        (() => {
          const results = [];
          document.querySelectorAll('*').forEach(el => {
            // Check computed or client width
            const w = el.offsetWidth || el.clientWidth;
            if (w > 390) {
              const id = el.id ? '#' + el.id : '';
              const cls = el.className ? '.' + String(el.className).trim().split(/\\s+/).join('.') : '';
              // Don't report high-level root containers if a child is causing it
              results.push({
                selector: el.tagName.toLowerCase() + id + cls,
                width: w,
                styleWidth: el.style.width,
                styleMinWidth: el.style.minWidth
              });
            }
          });
          // Sort by width descending
          results.sort((a, b) => b.width - a.width);
          return results.slice(0, 10);
        })()
      `);
      console.log(`=== WIDE ELEMENTS IN ${name} ===`);
      for (const c of culprits) {
        console.log(`  ${c.width}px: ${c.selector} (inline w: ${c.styleWidth}, minW: ${c.styleMinWidth})`);
      }
    };

    await checkWide('Welcome Screen');

    const tabs = [
      { name: 'Data Pipeline', hash: '#/lab/pipeline' },
      { name: 'Media Studio', hash: '#/lab/media' },
      { name: 'Network Lab', hash: '#/lab/network' },
      { name: 'WASM C++ Studio', hash: '#/lab/wasm' },
      { name: 'Projects Gallery', hash: '#/lab/projects' },
      { name: 'Resources Feed', hash: '#/lab/resources' },
      { name: 'Other Labs', hash: '#/lab/other' }
    ];

    for (const tab of tabs) {
      await client.eval(`window.location.hash = '${tab.hash}'`);
      await delay(600);
      await checkWide(tab.name);
    }

    client.close();
  } finally {
    chromeProc.kill();
  }
}

findWideElements().catch(console.error);

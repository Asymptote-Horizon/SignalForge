import { spawn } from 'child_process';
import fs from 'fs';

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function getPageWsUrl(port = 9224) {
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
      if (parsed.method === 'Runtime.consoleAPICalled') {
        console.log('[BROWSER CONSOLE]', parsed.params.args.map(a => a.value || a.description).join(' '));
      }
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

async function main() {
  const possiblePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe'
  ];
  let chromeExe = possiblePaths.find(p => fs.existsSync(p)) || 'chrome';
  const tempUserData = `C:\\Users\\Omkar\\AppData\\Local\\Temp\\chrome_wasm_test_${Date.now()}`;
  const chromeProc = spawn(chromeExe, [
    '--headless=new',
    '--remote-debugging-port=9224',
    '--disable-gpu',
    '--no-sandbox',
    `--user-data-dir=${tempUserData}`,
    'http://localhost:8000/'
  ]);

  try {
    await delay(1200);
    const wsUrl = await getPageWsUrl(9224);
    const client = new CDPClient(wsUrl);
    await client.connect();
    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await client.send('Page.navigate', { url: 'http://localhost:8000/' });
    await delay(1500);

    // Google SSO Login
    await client.eval(`document.getElementById('googleLoginBtn').click()`);
    await delay(400);
    await client.eval(`document.getElementById('googleAccountItemOmkar').click()`);
    await delay(600);
    await client.eval(`window.location.hash = '#/lab/wasm'`);
    await delay(1200);

    console.log('--- Initial Terminal State ---');
    console.log(await client.eval(`document.getElementById('cppTerminalBody')?.textContent`));

    console.log('--- Clicking Run Button ---');
    await client.eval(`document.getElementById('cppRunBtn').click()`);
    await delay(1500);

    console.log('--- Terminal State After Click ---');
    console.log(await client.eval(`document.getElementById('cppTerminalBody')?.textContent`));
    console.log('--- Badge State ---');
    console.log(await client.eval(`document.getElementById('cppExecBadge')?.textContent`));

    client.close();
  } finally {
    chromeProc.kill();
  }
}

main().catch(console.error);

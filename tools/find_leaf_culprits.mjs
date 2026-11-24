import { spawn } from 'child_process';
import fs from 'fs';

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function getPageWsUrl(port = 9228) {
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

async function findLeaves() {
  const chromeExe = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const tempUserData = `C:\\Users\\Omkar\\AppData\\Local\\Temp\\chrome_leaf_${Date.now()}`;
  const chromeProc = spawn(chromeExe, [
    '--headless=new',
    '--remote-debugging-port=9228',
    '--disable-gpu',
    '--no-sandbox',
    `--user-data-dir=${tempUserData}`,
    'http://localhost:8000/'
  ]);

  try {
    await delay(1200);
    const wsUrl = await getPageWsUrl(9228);
    const client = new CDPClient(wsUrl);
    await client.connect();
    await client.send('Page.enable');

    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true
    });

    await client.send('Page.navigate', { url: 'http://localhost:8000/' });
    await delay(1200);

    // Login
    await client.eval(`document.getElementById('googleLoginBtn').click()`);
    await delay(300);
    await client.eval(`document.getElementById('googleAccountItemOmkar').click()`);
    await delay(800);

    const checkLeaves = async (name) => {
      const leaves = await client.eval(`
        (() => {
          const culprits = [];
          document.querySelectorAll('*').forEach(el => {
            if (el.offsetWidth > 390 || el.scrollWidth > 390) {
              // check if any child is also wide
              let childWide = false;
              for (const ch of el.children) {
                if (ch.offsetWidth > 390 || ch.scrollWidth > 390) {
                  childWide = true;
                  break;
                }
              }
              if (!childWide) {
                culprits.push({
                  tag: el.tagName.toLowerCase(),
                  id: el.id,
                  cls: el.className,
                  offsetWidth: el.offsetWidth,
                  scrollWidth: el.scrollWidth,
                  text: (el.innerText || '').slice(0, 40)
                });
              }
            }
          });
          return culprits;
        })()
      `);
      console.log(`\n>>> Culprits in [${name}] (Total: ${leaves.length}):`);
      for (const l of leaves) {
        console.log(`   ${l.tag}#${l.id}.${l.cls} (ow=${l.offsetWidth}, sw=${l.scrollWidth}) text="${l.text}"`);
      }
    };

    await checkLeaves('Welcome Screen');

    const tabs = [
      { name: 'Data Pipeline', hash: '#/lab/pipeline' },
      { name: 'Media Studio', hash: '#/lab/media' },
      { name: 'Network Lab', hash: '#/lab/network' },
      { name: 'WASM C++ Studio', hash: '#/lab/wasm' },
      { name: 'Projects Gallery', hash: '#/lab/projects' },
      { name: 'Resources Feed', hash: '#/lab/resources' },
      { name: 'Other Labs', hash: '#/lab/other' }
    ];

    for (const t of tabs) {
      await client.eval(`window.location.hash = '${t.hash}'`);
      await delay(600);
      await checkLeaves(t.name);
    }

    client.close();
  } finally {
    chromeProc.kill();
  }
}

findLeaves().catch(console.error);

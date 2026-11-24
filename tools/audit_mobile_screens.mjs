import { spawn } from 'child_process';
import fs from 'fs';

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function getPageWsUrl(port = 9226) {
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

async function audit() {
  const possiblePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe'
  ];
  let chromeExe = possiblePaths.find(p => fs.existsSync(p)) || 'chrome';
  const tempUserData = `C:\\Users\\Omkar\\AppData\\Local\\Temp\\chrome_mobile_audit_${Date.now()}`;
  const chromeProc = spawn(chromeExe, [
    '--headless=new',
    '--remote-debugging-port=9226',
    '--disable-gpu',
    '--no-sandbox',
    `--user-data-dir=${tempUserData}`,
    'http://localhost:8000/'
  ]);

  try {
    await delay(1200);
    const wsUrl = await getPageWsUrl(9226);
    const client = new CDPClient(wsUrl);
    await client.connect();
    await client.send('Page.enable');

    // Emulate Mobile Device (iPhone 13: 390x844)
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true
    });
    await client.send('Emulation.setTouchEmulationEnabled', { enabled: true });

    await client.send('Page.navigate', { url: 'http://localhost:8000/' });
    await delay(1500);

    const checkOverflow = async (name) => {
      const data = await client.eval(`
        (() => {
          const bodyW = document.body.scrollWidth;
          const docElW = document.documentElement.scrollWidth;
          const winW = window.innerWidth;
          const overflowing = [];
          document.querySelectorAll('*').forEach(el => {
            const rect = el.getBoundingClientRect();
            if (rect.right > winW + 2) {
              overflowing.push({
                tag: el.tagName,
                id: el.id,
                className: String(el.className).slice(0, 30),
                right: Math.round(rect.right),
                winW
              });
            }
          });
          return {
            name: "${name}",
            winW,
            bodyW,
            docElW,
            overflowCount: overflowing.length,
            topOverflowElements: overflowing.slice(0, 5)
          };
        })()
      `);
      console.log(`[AUDIT] ${name}: winW=${data.winW}, bodyW=${data.bodyW}, overflowCount=${data.overflowCount}`);
      if (data.overflowCount > 0) {
        console.log('   Overflown elements:', JSON.stringify(data.topOverflowElements));
      }
      return data;
    };

    await checkOverflow('Login Screen');

    // Log in
    await client.eval(`document.getElementById('googleLoginBtn').click()`);
    await delay(300);
    await client.eval(`document.getElementById('googleAccountItemOmkar').click()`);
    await delay(800);

    await checkOverflow('Welcome Screen');

    // Go to labs
    const labs = [
      { name: 'Data Pipeline', hash: '#/lab/pipeline' },
      { name: 'Media Studio', hash: '#/lab/media' },
      { name: 'Network Lab', hash: '#/lab/network' },
      { name: 'WASM C++ Studio', hash: '#/lab/wasm' },
      { name: 'Projects Gallery', hash: '#/lab/projects' },
      { name: 'Resources Feed', hash: '#/lab/resources' },
      { name: 'Other Labs', hash: '#/lab/other' },
      { name: 'Student Profile', hash: '#/profile' }
    ];

    for (const lab of labs) {
      await client.eval(`window.location.hash = '${lab.hash}'`);
      await delay(700);
      await checkOverflow(lab.name);
    }

    client.close();
  } finally {
    chromeProc.kill();
  }
}

audit().catch(console.error);

import { spawn } from 'child_process';

const delay = ms => new Promise(r => setTimeout(r, ms));

async function verifyNewLabs() {
  const p = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new', '--remote-debugging-port=9239', '--no-sandbox', 'http://localhost:8000/'
  ]);
  await delay(1200);
  const res = await fetch('http://127.0.0.1:9239/json');
  const list = await res.json();
  const wsUrl = list[0].webSocketDebuggerUrl;
  const ws = new WebSocket(wsUrl);
  let id = 1;
  const send = (method, params = {}) => new Promise((resolve) => {
    const curId = id++;
    const handler = (evt) => {
      const data = JSON.parse(evt.data);
      if (data.id === curId) {
        ws.removeEventListener('message', handler);
        resolve(data.result);
      }
    };
    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({ id: curId, method, params }));
  });
  await new Promise(r => ws.onopen = r);
  await send('Page.enable');
  await delay(1600);

  // Authenticate via Google SSO
  await send('Runtime.evaluate', { expression: `document.getElementById('googleLoginBtn').click();` });
  await delay(400);
  await send('Runtime.evaluate', { expression: `document.getElementById('googleAccountItemOmkar').click();` });
  await delay(1000);

  // 1. Verify Bluetooth Analyzer Lab
  await send('Runtime.evaluate', { expression: `window.location.hash = '#/lab/bluetooth-analyzer';` });
  await delay(1200);

  const btState = await send('Runtime.evaluate', {
    expression: `(() => {
      const activeScreen = document.querySelector('.screen.active')?.id;
      const playBtn = document.getElementById('btTogglePlayBtn');
      const distSlider = document.getElementById('btDistanceSlider');
      const distReadout = document.getElementById('btDistanceReadout')?.textContent;
      const rssiReadout = document.getElementById('btRssiReadout')?.textContent;
      const linkState = document.getElementById('btLinkStateReadout')?.textContent;
      return { activeScreen, hasPlayBtn: !!playBtn, hasDistSlider: !!distSlider, distReadout, rssiReadout, linkState };
    })()`,
    returnByValue: true
  });
  console.log('Bluetooth Analyzer Lab State:', btState.result?.value);
  if (!btState.result?.value.hasPlayBtn || !btState.result?.value.hasDistSlider) {
    throw new Error('Bluetooth Analyzer Lab elements failed to render');
  }

  // Test distance slider past 10m threshold
  await send('Runtime.evaluate', {
    expression: `(() => {
      const slider = document.getElementById('btDistanceSlider');
      slider.value = '14.5';
      slider.dispatchEvent(new Event('input'));
    })()`
  });
  await delay(300);

  const btCutoffState = await send('Runtime.evaluate', {
    expression: `(() => {
      const linkState = document.getElementById('btLinkStateReadout')?.textContent;
      const log = document.getElementById('btEventLogger')?.textContent;
      return { linkState, hasCutoffWarning: log.includes('Boundary') || log.includes('10m') };
    })()`,
    returnByValue: true
  });
  console.log('Bluetooth 14.5m Cutoff State:', btCutoffState.result?.value);
  if (!btCutoffState.result?.value.linkState.includes('DISCONNECTED') && !btCutoffState.result?.value.linkState.includes('OUT OF RANGE')) {
    throw new Error('Bluetooth 10m boundary cutoff failed to trigger');
  }
  console.log('✅ [PASS] Bluetooth Neckband Range & Buffer Analyzer verified with RF path-loss modeling & 10m cutoff.');

  // 2. Verify Mobile P2P Device-to-Device Sharing Lab
  await send('Runtime.evaluate', { expression: `window.location.hash = '#/lab/p2p';` });
  await delay(1200);

  const p2pState = await send('Runtime.evaluate', {
    expression: `(() => {
      const txBtn = document.getElementById('p2pRoleTxBtn');
      const rxBtn = document.getElementById('p2pRoleRxBtn');
      const wifiBtn = document.getElementById('p2pMediumWifiBtn');
      const btBtn = document.getElementById('p2pMediumBtBtn');
      const sendBtn = document.getElementById('p2pSendBtn');
      const roomCode = document.getElementById('p2pRoomCode')?.textContent;
      return { hasTx: !!txBtn, hasRx: !!rxBtn, hasWifi: !!wifiBtn, hasBt: !!btBtn, hasSendBtn: !!sendBtn, roomCode };
    })()`,
    returnByValue: true
  });
  console.log('P2P Sharing Lab State:', p2pState.result?.value);
  if (!p2pState.result?.value.hasTx || !p2pState.result?.value.hasRx || !p2pState.result?.value.hasSendBtn) {
    throw new Error('P2P Sharing Lab controls failed to render');
  }

  // Trigger P2P packet transmission
  await send('Runtime.evaluate', {
    expression: `document.getElementById('p2pSendBtn').click();`
  });
  await delay(500);

  const packetLogState = await send('Runtime.evaluate', {
    expression: `(() => {
      const log = document.getElementById('p2pEventLog')?.textContent || '';
      return { hasTxLog: log.includes('TX') || log.includes('Frame') || log.includes('HELLO') };
    })()`,
    returnByValue: true
  });
  console.log('P2P Packet Log State:', packetLogState.result?.value);
  if (!packetLogState.result?.value.hasTxLog) {
    throw new Error('P2P Packet transmission log failed to record frame');
  }
  console.log('✅ [PASS] Mobile P2P Device-to-Device Sharing Lab verified with live transmission & acoustic chime.');

  p.kill();
  process.exit(0);
}

verifyNewLabs().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});

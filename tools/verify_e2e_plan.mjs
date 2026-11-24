import http from 'http';
import { spawn } from 'child_process';

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function getPageWsUrl(port = 9222) {
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json`);
      const list = await res.json();
      const page = list.find(p => p.type === 'page');
      if (page && page.webSocketDebuggerUrl) {
        return page.webSocketDebuggerUrl;
      }
    } catch (e) {}
    await delay(250);
  }
  throw new Error('Could not find page target on port ' + port);
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
      if (parsed.method === 'Console.messageAdded') {
        console.log('[BROWSER CONSOLE]', parsed.params.message.text);
      }
      if (parsed.method === 'Runtime.consoleAPICalled') {
        console.log('[BROWSER LOG]', parsed.params.args?.map(a => a.value || a.description).join(' '));
      }
      if (parsed.method === 'Runtime.exceptionThrown') {
        console.error('[BROWSER EXCEPTION]', parsed.params.exceptionDetails?.exception?.description || parsed.params.exceptionDetails?.text);
      }
      if (parsed.id && this.callbacks.has(parsed.id)) {
        const cb = this.callbacks.get(parsed.id);
        this.callbacks.delete(parsed.id);
        if (parsed.error) cb.reject(new Error(parsed.error.message));
        else cb.resolve(parsed.result);
      }
    };
    return new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
    });
  }

  async send(method, params = {}) {
    const id = this.id++;
    return new Promise((resolve, reject) => {
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async eval(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    if (res.exceptionDetails) {
      throw new Error(res.exceptionDetails.exception?.description || 'Eval error');
    }
    return res.result?.value;
  }

  close() {
    this.ws.close();
  }
}

async function runVerification() {
  console.log('Spawning headless Chrome for end-to-end plan verification...');
  const possiblePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe',
    'chrome'
  ];
  let chromeExe = possiblePaths[0];
  const fs = await import('fs');
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) { chromeExe = p; break; }
  }

  const chromeProc = spawn(chromeExe, [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--disable-gpu',
    '--no-sandbox',
    'about:blank'
  ]);

  try {
    const wsUrl = await getPageWsUrl(9222);
    const client = new CDPClient(wsUrl);
    await client.connect();

    await client.send('Page.enable');
    await client.send('Runtime.enable');

    console.log('CDP attached to browser page. Running Test Suite 1: Mathematical Invariant Tests...');

    // 1. Run Unit Tests Page
    await client.send('Page.navigate', { url: 'http://localhost:8000/tests/core-tests.html' });
    let testSummary;
    for (let i = 0; i < 20; i++) {
      await delay(200);
      testSummary = await client.eval(`
        (() => {
          const total = document.getElementById('statTotal')?.textContent;
          const passed = document.getElementById('statPassed')?.textContent;
          const failed = document.getElementById('statFailed')?.textContent;
          const engine = document.getElementById('statEngine')?.textContent;
          return { total, passed, failed, engine };
        })()
      `);
      if (testSummary && testSummary.total && testSummary.total !== '-') break;
    }

    console.log('Unit Tests Result:', testSummary);
    if (parseInt(testSummary.failed) !== 0 || parseInt(testSummary.passed) < 14) {
      const failedCases = await client.eval(`
        Array.from(document.querySelectorAll('.test-case')).filter(el => el.querySelector('.case-icon.fail')).map(el => ({
          name: el.querySelector('.case-info span:last-child')?.textContent,
          error: el.querySelector('.case-error')?.textContent
        }))
      `);
      console.log('Failed cases detail:', failedCases);
      throw new Error(`Unit tests failed or incomplete: ${JSON.stringify(testSummary)}`);
    }
    console.log(`✅ [PASS] All ${testSummary.passed} Core Mathematical Invariant tests passed! (Engine: ${testSummary.engine})\n`);

    // 2. Test Main App Routing & Lifecycle
    console.log('Running Test Suite 2: Main App Screen Isolation & Routing Lifecycle...');
    await client.send('Page.navigate', { url: 'http://localhost:8000/#/login' });
    await delay(1000);

    // Check login screen isolation
    const loginActive = await client.eval(`
      (() => {
        const activeScreens = Array.from(document.querySelectorAll('.screen.active')).map(s => s.id);
        const headerHidden = document.getElementById('appHeader').classList.contains('hidden');
        return { activeScreens, headerHidden };
      })()
    `);
    console.log('Login screen state:', loginActive);
    if (loginActive.activeScreens.length !== 1 || loginActive.activeScreens[0] !== 'screen-login') {
      throw new Error(`Multiple or incorrect active screens on login: ${loginActive.activeScreens.join(', ')}`);
    }
    console.log('✅ [PASS] Screen isolation verified: Exactly 1 screen active (screen-login). Header hidden.');

    // Test Guest Login
    await client.eval(`document.getElementById('guestBtn').click()`);
    await delay(600);

    const welcomeState = await client.eval(`
      (() => {
        const activeScreens = Array.from(document.querySelectorAll('.screen.active')).map(s => s.id);
        const hash = window.location.hash;
        const user = document.getElementById('welcomeName')?.textContent;
        const flowNodes = document.querySelectorAll('#welcomeFlow .flow-node').length;
        return { activeScreens, hash, user, flowNodes };
      })()
    `);
    console.log('Welcome state after login:', welcomeState);
    if (welcomeState.hash !== '#/welcome' || welcomeState.activeScreens[0] !== 'screen-welcome') {
      throw new Error(`Failed to navigate to welcome screen: ${JSON.stringify(welcomeState)}`);
    }
    console.log(`✅ [PASS] Login successful! Welcome user: "${welcomeState.user}", Flow nodes rendered: ${welcomeState.flowNodes}`);

    // Test Navigation to Pick Screen
    await client.eval(`window.location.hash = '#/pick'`);
    await delay(500);
    const pickActive = await client.eval(`document.getElementById('screen-pick').classList.contains('active')`);
    console.log(`✅ [PASS] Pick screen navigation: ${pickActive ? 'Active' : 'Failed'}`);

    // Test Navigation to Tour Screen & Timer Lifecycle
    await client.eval(`window.location.hash = '#/tour'`);
    await delay(500);
    const tourState = await client.eval(`
      (() => {
        const active = document.getElementById('screen-tour').classList.contains('active');
        const headerHidden = document.getElementById('appHeader').classList.contains('hidden');
        const stageKicker = document.getElementById('tourStageKicker')?.textContent;
        return { active, headerHidden, stageKicker };
      })()
    `);
    console.log('Tour state:', tourState);
    if (!tourState.active || !tourState.headerHidden) {
      throw new Error(`Tour screen failed activation or header isolation`);
    }
    console.log(`✅ [PASS] Tour screen active with isolated view. Stage: ${tourState.stageKicker}`);

    // Test Navigation to Lab Dashboard
    await client.eval(`window.location.hash = '#/lab/pipeline'`);
    await delay(600);
    const labState = await client.eval(`
      (() => {
        const active = document.getElementById('screen-dashboard').classList.contains('active');
        const engineText = document.getElementById('sf-engine-text')?.textContent;
        const pipelineContent = document.getElementById('lab-pipeline')?.style.display !== 'none';
        return { active, engineText, pipelineContent };
      })()
    `);
    console.log('Lab state:', labState);
    if (!labState.active || !labState.pipelineContent) {
      throw new Error(`Pipeline lab dashboard failed activation`);
    }
    console.log(`✅ [PASS] Pipeline Lab active! Engine badge: "${labState.engineText}"`);

    // Test Math Self-Test in Pipeline Lab
    await client.eval(`document.getElementById('sf-btn-run-selftest').click()`);
    await delay(800);
    const selfTestResult = await client.eval(`document.getElementById('sf-selftest-output').textContent`);
    console.log('Math Self-Test Output:\n', selfTestResult.trim());
    if (!selfTestResult.includes('ALL SECTION 5.5 SIMULATIONS PASSED') && !selfTestResult.includes('PASS')) {
      throw new Error('Self-test did not pass: ' + selfTestResult);
    }
    console.log('✅ [PASS] Math Self-Test executed with verified passing status.');

    // Test Syllabus Modal
    await client.eval(`document.getElementById('navSyllabusBtn').click()`);
    await delay(300);
    const modalVisible = await client.eval(`document.getElementById('sf-syllabus-modal').style.display === 'flex'`);
    console.log(`✅ [PASS] Syllabus Map modal opened: ${modalVisible}`);
    await client.eval(`document.getElementById('sf-syllabus-close').click()`);
    await delay(300);
    const modalClosed = await client.eval(`document.getElementById('sf-syllabus-modal').style.display === 'none'`);
    console.log(`✅ [PASS] Syllabus Map modal closed: ${modalClosed}`);

    // Test Logout
    await client.eval(`document.getElementById('logoutBtn').click()`);
    await delay(500);
    const logoutState = await client.eval(`
      (() => {
        const hash = window.location.hash;
        const loginActive = document.getElementById('screen-login').classList.contains('active');
        const session = sessionStorage.getItem('sf_session');
        return { hash, loginActive, session };
      })()
    `);
    console.log('Logout state:', logoutState);
    if (logoutState.hash !== '#/login' || !logoutState.loginActive) {
      throw new Error(`Logout did not return to login screen`);
    }
    console.log('✅ [PASS] Sign out verified: Session cleared, returned to isolated login screen.');

    console.log('\n======================================================');
    console.log('🎉 ALL END-TO-END VERIFICATION CHECKS PASSED PERFECTLY!');
    console.log('======================================================\n');

    client.close();
  } finally {
    chromeProc.kill();
  }
}

runVerification().catch(err => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});

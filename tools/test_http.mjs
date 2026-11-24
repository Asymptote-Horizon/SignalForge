import http from 'http';

const urls = [
  '/',
  '/css/styles.css',
  '/js/main.js',
  '/js/router.js',
  '/js/diagnostics.js',
  '/wasm/engine.wasm',
  '/data/knowledge.json',
  '/assets/ping.txt',
  '/tests/core-tests.html'
];

async function checkUrl(path) {
  return new Promise((resolve) => {
    const req = http.get({
      host: 'localhost',
      port: 8000,
      path: path,
      timeout: 3000
    }, (res) => {
      let len = 0;
      res.on('data', chunk => len += chunk.length);
      res.on('end', () => {
        resolve({ path, status: res.statusCode, length: len, ok: res.statusCode === 200 });
      });
    });
    req.on('error', (err) => resolve({ path, error: err.message, ok: false }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ path, error: 'Timeout', ok: false });
    });
  });
}

async function run() {
  console.log('Verifying HTTP Endpoints on http://localhost:8000/ ...\n');
  let allOk = true;
  for (const u of urls) {
    const r = await checkUrl(u);
    if (r.ok) {
      console.log(`✅ [${r.status}] http://localhost:8000${r.path} (${r.length.toLocaleString()} bytes)`);
    } else {
      console.error(`❌ [FAIL] http://localhost:8000${r.path} - ${r.status || r.error}`);
      allOk = false;
    }
  }
  if (!allOk) process.exit(1);
  console.log('\nAll endpoints returned HTTP 200.');
}

run();

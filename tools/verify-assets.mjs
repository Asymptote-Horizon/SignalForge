/**
 * SignalForge - Asset Verification Script (Node.js)
 * Validates integrity of binary payloads, WASM, styles, and data fixtures.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const checks = [
  {
    name: 'index.html entry point',
    path: 'index.html',
    validate: (buf) => buf.length > 500 && buf.toString().includes('<!DOCTYPE html>')
  },
  {
    name: 'Codex master stylesheet',
    path: 'css/styles.css',
    validate: (buf) => buf.length > 5000 && buf.toString().includes('.screen')
  },
  {
    name: 'WASM bit engine binary',
    path: 'wasm/engine.wasm',
    validate: (buf) => {
      // WASM magic number: 0x00 0x61 0x73 0x6d (\0asm)
      return buf.length > 1000 && buf[0] === 0x00 && buf[1] === 0x61 && buf[2] === 0x73 && buf[3] === 0x6d;
    }
  },
  {
    name: '2MB throughput test payload (assets/payload.bin)',
    path: 'assets/payload.bin',
    validate: (buf) => buf.length === 2097152
  },
  {
    name: '1-byte HTTP ping payload (assets/ping.txt)',
    path: 'assets/ping.txt',
    validate: (buf) => buf.length === 1
  },
  {
    name: '32x32 sample photo JSON (assets/sample_photo.json)',
    path: 'assets/sample_photo.json',
    validate: (buf) => {
      const data = JSON.parse(buf.toString('utf8'));
      return data && (data.pixels || Array.isArray(data));
    }
  },
  {
    name: 'Curriculum knowledge base (data/knowledge.json)',
    path: 'data/knowledge.json',
    validate: (buf) => {
      const data = JSON.parse(buf.toString('utf8'));
      return Array.isArray(data) && data.length >= 40;
    }
  }
];

let failed = 0;
console.log('=== SignalForge Asset & Runtime Integrity Verification ===\n');

for (const check of checks) {
  const fullPath = path.join(ROOT, check.path);
  try {
    if (!fs.existsSync(fullPath)) {
      console.error(`❌ [FAIL] Missing file: ${check.path} (${check.name})`);
      failed++;
      continue;
    }
    const buf = fs.readFileSync(fullPath);
    if (!check.validate(buf)) {
      console.error(`❌ [FAIL] Validation failed for: ${check.path} (Size: ${buf.length} bytes)`);
      failed++;
      continue;
    }
    console.log(`✅ [PASS] ${check.name} (${check.path}) - ${buf.length.toLocaleString()} bytes`);
  } catch (err) {
    console.error(`❌ [ERROR] ${check.path}: ${err.message}`);
    failed++;
  }
}

console.log(`\nResult: ${checks.length - failed}/${checks.length} checks passed.`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log('All static assets and payloads strictly validated.');
}

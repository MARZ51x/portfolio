'use strict';

// Self-contained behavioral tests for the portfolio server.
//
// We start the real server.js as a child process on a fixed free port via the
// PORT env var (NOT 3000 — that port is occupied by an unrelated Next.js app on
// this machine). We then make raw HTTP requests against THAT instance and assert
// on observable behavior. The server is stopped in the after() hook.

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const http = require('node:http');
const path = require('node:path');

const PROJECT_ROOT = path.join(__dirname, '..');
// A fixed, almost-certainly-free port. Deliberately not 3000.
const PORT = process.env.TEST_PORT || '4317';
const BASE = `http://127.0.0.1:${PORT}`;

let child;

// Minimal HTTP GET helper. Returns { status, headers, body }.
function get(pathname) {
  return new Promise((resolve, reject) => {
    const req = http.get(`${BASE}${pathname}`, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    });
    req.on('error', reject);
    req.setTimeout(5000, () => req.destroy(new Error('request timed out')));
  });
}

// Wait until the server responds (or fail after a timeout).
async function waitForServer(retries = 50) {
  for (let i = 0; i < retries; i++) {
    try {
      await get('/');
      return;
    } catch (err) {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  throw new Error('server did not become ready in time');
}

before(async () => {
  child = spawn(process.execPath, [path.join(PROJECT_ROOT, 'server.js')], {
    cwd: PROJECT_ROOT,
    env: { ...process.env, PORT },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stderr.on('data', (d) => { process.stderr.write(`[server stderr] ${d}`); });
  await waitForServer();
});

after(() => {
  if (child && !child.killed) child.kill();
});

// --- Happy path -----------------------------------------------------------

test('GET / returns 200 with the portfolio HTML (title + real resume content)', async () => {
  const res = await get('/');
  assert.equal(res.status, 200, 'GET / should return HTTP 200');
  assert.match(res.headers['content-type'] || '', /text\/html/, 'should serve HTML');
  // Title proves we hit OUR app, not the unrelated Next.js app on 3000.
  assert.match(res.body, /<title>Acamar L\. Baltazar — Automation &amp; AI Engineer<\/title>/);
  // Real resume content, not placeholder/empty.
  assert.ok(res.body.includes('Acamar L. Baltazar'), 'page should contain the name');
  assert.ok(res.body.includes('n8n'), 'page should contain a real skill (n8n)');
  assert.ok(
    res.body.includes('Automated Report Generator via Telegram Bot'),
    'page should contain a real project name'
  );
});

// --- Static asset ---------------------------------------------------------

test('GET /styles.css returns 200 with CSS content-type', async () => {
  const res = await get('/styles.css');
  assert.equal(res.status, 200, 'GET /styles.css should return HTTP 200');
  assert.match(
    res.headers['content-type'] || '',
    /text\/css/,
    'styles.css should be served with a CSS content-type'
  );
  assert.ok(res.body.length > 0, 'CSS body should not be empty');
});

// --- Edge case: unknown route (spec-named 404 fallback) -------------------

test('GET /nonexistent returns 404 and falls back to serving the page', async () => {
  const res = await get('/nonexistent');
  assert.equal(res.status, 404, 'unknown route should return HTTP 404');
  // Catch-all falls back to index.html, so the body is still the portfolio page.
  assert.match(
    res.body,
    /<title>Acamar L\. Baltazar — Automation &amp; AI Engineer<\/title>/,
    '404 fallback should serve the single portfolio page'
  );
});

// --- Edge case: PORT env var is honored -----------------------------------

test('server honors the PORT env var (listening on the configured port)', async () => {
  // The before() hook only succeeds if the server bound to PORT; reaching it
  // here on BASE (which uses PORT) confirms the env var was honored.
  const res = await get('/');
  assert.equal(res.status, 200);
  assert.equal(PORT, '4317', 'sanity: test is using the non-3000 port');
});

// --- Failure case: distinguish correct content from a wrong/empty page ----

test('served page is OUR app, not the wrong app, and has real sections', async () => {
  const res = await get('/');
  // Would FAIL if we accidentally hit the unrelated Next.js app on 3000.
  assert.ok(
    !/Move With Momentum/i.test(res.body),
    'must NOT contain the unrelated "Move With Momentum" app content'
  );
  // Required resume sections present — would fail on an empty/broken page.
  assert.ok(res.body.includes('Technical Skills'), 'should have a Technical Skills section');
  assert.ok(res.body.includes('Experience'), 'should have an Experience section');
  assert.ok(res.body.includes('acamar.baltazar@gmail.com'), 'should include the contact email');
});

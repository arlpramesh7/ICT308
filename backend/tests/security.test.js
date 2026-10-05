const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
process.env.NODE_ENV = 'test';
process.env.DB_PATH = ':memory:';
process.env.JWT_SECRET = 'test-only-secret-at-least-32-characters-long';
process.env.TEST_RATE_LIMIT = '2';
const app = require('../src/app');
let server, base;
before(async () => { server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve)); base = 'http://127.0.0.1:' + server.address().port; });
after(async () => { await new Promise(resolve => server.close(resolve)); require('../src/db').close(); });
test('rate limit allows two requests and rejects the third with retry information', async () => {
  assert.equal((await fetch(base + '/api/health')).status, 200);
  assert.equal((await fetch(base + '/api/health')).status, 200);
  const response = await fetch(base + '/api/health');
  assert.equal(response.status, 429);
  assert.ok(response.headers.has('retry-after'));
});
test('cross-origin mutations are rejected before business logic', async () => {
  const response = await fetch(base + '/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://untrusted.example' }, body: '{}' });
  assert.equal(response.status, 403);
});
test('non-JSON writes are rejected', async () => {
  assert.equal((await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: '{}' })).status, 415);
});
test('malformed JSON returns 400 rather than 500', async () => {
  assert.equal((await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' })).status, 400);
});
test('security headers block framing and unexpected scripts', async () => {
  const response = await fetch(base + '/');
  assert.match(response.headers.get('content-security-policy'), /script-src 'self'/);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(response.headers.get('x-frame-options'), 'SAMEORIGIN');
});

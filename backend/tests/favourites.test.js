const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
process.env.NODE_ENV = 'test'; process.env.DB_PATH = ':memory:'; process.env.JWT_SECRET = 'favourites-test-secret-at-least-32-characters';
const app = require('../src/app'); const db = require('../src/db');
let server, base, customer, second, staff, userId;
async function request(method, path, token) {
  const r = await fetch(base + '/api' + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, ...(method !== 'GET' ? { body: '{}' } : {}) });
  return { status: r.status, body: await r.json() };
}
before(async () => {
  const tokens = ['customer', 'second', 'staff'].map(name => {
    const id = Number(db.prepare('INSERT INTO user (username,email,password_hash,role) VALUES (?,?,?,?)').run(name, name + '@example.test', 'disabled', name === 'staff' ? 'staff' : 'customer').lastInsertRowid);
    if (name === 'customer') userId = id;
    return jwt.sign({ user_id: id, version: 0 }, process.env.JWT_SECRET, { issuer: 'smartdine', audience: 'smartdine-client', expiresIn: '1h' });
  });
  [customer, second, staff] = tokens; server = app.listen(0, '127.0.0.1'); await new Promise(r => server.once('listening', r)); base = 'http://127.0.0.1:' + server.address().port;
});
after(async () => { await new Promise(r => server.close(r)); db.close(); });
test('favourites require a customer session', async () => { assert.equal((await request('GET', '/favourites')).status, 401); assert.equal((await request('PUT', '/favourites/1', staff)).status, 403); });
test('saving is idempotent and persists to SQLite', async () => {
  assert.equal((await request('PUT', '/favourites/1', customer)).body.saved, true); await request('PUT', '/favourites/1', customer);
  assert.equal(db.prepare('SELECT COUNT(*) AS c FROM favourite WHERE user_id = ?').get(userId).c, 1);
  const rows = (await request('GET', '/favourites', customer)).body; assert.equal(rows.length, 1); assert.equal(rows[0].restaurant_id, 1); assert.ok(rows[0].cover_image);
});
test('one customer cannot see or remove another customers favourite', async () => {
  assert.equal((await request('GET', '/favourites', second)).body.length, 0); await request('DELETE', '/favourites/1', second); assert.equal((await request('GET', '/favourites', customer)).body.length, 1);
});
test('unknown or malformed restaurant ids are rejected', async () => { assert.equal((await request('PUT', '/favourites/9999', customer)).status, 404); assert.equal((await request('PUT', '/favourites/no', customer)).status, 400); });
test('favourites are included only in their owners data export', async () => { assert.equal((await request('GET', '/privacy/export', customer)).body.favourites.length, 1); assert.equal((await request('GET', '/privacy/export', second)).body.favourites.length, 0); });
test('removal persists and repeated removal is safe', async () => { assert.equal((await request('DELETE', '/favourites/1', customer)).body.saved, false); await request('DELETE', '/favourites/1', customer); assert.equal((await request('GET', '/favourites', customer)).body.length, 0); });
test('deleting an account cascades its favourites', async () => { await request('PUT', '/favourites/2', customer); db.prepare('DELETE FROM user WHERE user_id = ?').run(userId); assert.equal(db.prepare('SELECT COUNT(*) AS c FROM favourite WHERE user_id = ?').get(userId).c, 0); });

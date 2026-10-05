const { test, before, after } = require('node:test');
const assert = require('node:assert/strict'); const jwt = require('jsonwebtoken');
process.env.NODE_ENV = 'test'; process.env.DB_PATH = ':memory:'; process.env.JWT_SECRET = 'review-test-secret-at-least-32-characters';
const app = require('../src/app'); const db = require('../src/db'); let server, base, token;
before(async () => {
  for (let i = 0; i < 12; i++) {
    const id = Number(db.prepare('INSERT INTO user (username,email,password_hash) VALUES (?,?,?)').run('Reader ' + i, i + '@example.test', 'disabled').lastInsertRowid);
    db.prepare('INSERT INTO feedback (user_id,restaurant_id,rating,comment) VALUES (?,1,?,?)').run(id, i % 5 + 1, 'Review ' + i);
    if (!i) token = jwt.sign({ user_id: id, version: 0 }, process.env.JWT_SECRET, { issuer: 'smartdine', audience: 'smartdine-client', expiresIn: '1h' });
  }
  server = app.listen(0, '127.0.0.1'); await new Promise(r => server.once('listening', r)); base = 'http://127.0.0.1:' + server.address().port;
});
after(async () => { await new Promise(r => server.close(r)); db.close(); });
test('all reviews are reachable across bounded pages without duplication', async () => {
  const ids = [];
  for (let page = 1; page <= 3; page++) { const r = await (await fetch(base + '/api/feedback/1?page=' + page + '&page_size=5')).json(); assert.equal(r.rating_count, 12); assert.equal(r.has_next, page < 3); ids.push(...r.reviews.map(x => x.feedback_id)); }
  assert.equal(ids.length, 12); assert.equal(new Set(ids).size, 12);
});
test('pagination rejects unbounded and negative inputs', async () => { for (const query of ['page=0', 'page=-1', 'page_size=1000', 'page_size=0', 'page=abc']) assert.equal((await fetch(base + '/api/feedback/1?' + query)).status, 400); });
test('unknown restaurant returns not found and empty restaurant has zero reviews', async () => { assert.equal((await fetch(base + '/api/feedback/99999')).status, 404); const r = await (await fetch(base + '/api/feedback/2')).json(); assert.equal(r.rating_count, 0); assert.equal(r.average_rating, null); });
test('customer can retrieve only their own editable review', async () => { assert.equal((await fetch(base + '/api/feedback/1/mine')).status, 401); const r = await (await fetch(base + '/api/feedback/1/mine', { headers: { Authorization: 'Bearer ' + token } })).json(); assert.equal(r.comment, 'Review 0'); });
test('updating a review refreshes aggregate without inflating total or exposing email', async () => {
  const r = await fetch(base + '/api/feedback/1', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify({ rating: 5, comment: '<script>unsafe()</script>' }) }); assert.equal(r.status, 200);
  const result = await (await fetch(base + '/api/feedback/1')).json(); assert.equal(result.rating_count, 12); assert.ok(result.reviews.some(r => r.comment === '<script>unsafe()</script>')); assert.ok(!JSON.stringify(result).includes('@example.test'));
});

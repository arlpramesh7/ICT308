const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
process.env.NODE_ENV = 'test';
process.env.DB_PATH = ':memory:';
process.env.JWT_SECRET = 'catalog-test-secret-at-least-32-characters';
const app = require('../src/app');
const db = require('../src/db');
const { openingState } = require('../src/services/catalogService');
let server, base;
before(async () => { server = app.listen(0, '127.0.0.1'); await new Promise(r => server.once('listening', r)); base = 'http://127.0.0.1:' + server.address().port; });
after(async () => { await new Promise(r => server.close(r)); db.close(); });
test('catalog has local photographs, metadata and persisted rating aggregates', async () => {
  const rows = await (await fetch(base + '/api/restaurants')).json();
  assert.equal(rows.length, 6); for (const r of rows) { assert.match(r.cover_image, /^\/assets\/.+\.jpg$/); assert.ok(r.description.length > 40); assert.equal(typeof r.is_open, 'boolean'); assert.equal(r.rating_count, 0); }
});
test('dedicated restaurant endpoint exposes complete grouped menu with descriptions', async () => {
  const r = await (await fetch(base + '/api/restaurants/1')).json();
  assert.equal(r.name, 'The Spice Tailor'); assert.ok(r.menu.length >= 7); assert.ok(r.menu.every(i => i.description));
  assert.deepEqual(new Set(r.menu.map(i => i.category)), new Set(['Starter', 'Main', 'Side', 'Dessert', 'Drink']));
});
test('restaurant details distinguish unknown and malformed ids', async () => {
  assert.equal((await fetch(base + '/api/restaurants/9999')).status, 404);
  assert.equal((await fetch(base + '/api/restaurants/invalid')).status, 400);
});
test('restaurant page and all local food photographs are served', async () => {
  assert.equal((await fetch(base + '/restaurant.html?id=1')).status, 200);
  for (const name of ['indian', 'japanese', 'italian', 'vegetarian', 'steak', 'korean']) {
    const r = await fetch(base + '/assets/' + name + '.jpg'); assert.equal(r.status, 200); assert.match(r.headers.get('content-type'), /image\/jpeg/); assert.ok((await r.arrayBuffer()).byteLength > 10000);
  }
});
test('opening status uses Sydney time and exact closing boundary', () => {
  const r = { is_active: 1, open_minute: 660, close_minute: 1320 };
  assert.equal(openingState(r, new Date('2026-10-05T00:00:00Z')), true);
  assert.equal(openingState(r, new Date('2026-10-05T11:00:00Z')), false);
  assert.equal(openingState({ ...r, is_active: 0 }, new Date('2026-10-05T00:00:00Z')), false);
});

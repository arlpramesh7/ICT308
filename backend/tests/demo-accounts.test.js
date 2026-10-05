const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const { randomUUID } = require('node:crypto');
process.env.NODE_ENV = 'test';
process.env.DB_PATH = ':memory:';
process.env.JWT_SECRET = 'demo-account-test-secret-at-least-32-characters';
process.env.DEMO_DATA = 'true';
const app = require('../src/app');
const db = require('../src/db');
const { seedDemoAccounts, accounts, password } = require('../scripts/demo-accounts');
let server, base, customerToken;
const orders = new Map();
async function request(method, path, body, token) {
  // Synchronous bcrypt fixtures can outlive an idle pooled socket on slower CI hosts.
  const response = await fetch(base + '/api' + path, {
    method, headers: { 'Content-Type': 'application/json', Connection: 'close', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { status: response.status, body: await response.json() };
}
before(async () => {
  seedDemoAccounts(db);
  // Test-only all-day hours keep authorization tests independent of wall-clock time.
  db.exec('UPDATE restaurant SET open_minute = 0, close_minute = 1440');
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  base = 'http://127.0.0.1:' + server.address().port;
  customerToken = (await request('POST', '/auth/login', { email: accounts[0].email, password })).body.token;
  for (const r of db.prepare('SELECT restaurant_id FROM restaurant').all()) {
    const item = db.prepare('SELECT item_id FROM menu_item WHERE restaurant_id = ? AND is_available = 1 LIMIT 1').get(r.restaurant_id);
    assert.equal((await request('POST', '/cart/items', { item_id: item.item_id, quantity: 2 }, customerToken)).status, 200);
    const cart = (await request('GET', '/cart', undefined, customerToken)).body;
    const placed = await request('POST', '/orders', { customer_name: 'Seed Test Customer', contact_phone: '', pickup_notes: 'Authorization fixture', fulfilment: 'pickup', cart_revision: cart.revision, idempotency_key: randomUUID() }, customerToken);
    assert.equal(placed.status, 201);
    orders.set(r.restaurant_id, placed.body);
  }
});
after(async () => { if (server) await new Promise(resolve => server.close(resolve)); db.close(); });

test('demonstration seeding is repeatable with twelve exclusive venue accounts and compatible aliases', () => {
  const before = db.prepare('SELECT user_id,email,password_hash FROM user ORDER BY user_id').all();
  const member = db.prepare('SELECT user_id FROM user WHERE email = ?').get('staff.seoul-grill@smartdine.test');
  db.prepare('DELETE FROM restaurant_member WHERE user_id = ?').run(member.user_id);
  seedDemoAccounts(db);
  assert.deepEqual(db.prepare('SELECT user_id,email,password_hash FROM user ORDER BY user_id').all(), before);
  assert.equal(accounts.length, 15);
  for (const account of accounts.filter(a => a.restaurant)) {
    const memberships = db.prepare('SELECT r.name FROM user u JOIN restaurant_member m USING(user_id) JOIN restaurant r USING(restaurant_id) WHERE u.email = ?').all(account.email);
    assert.deepEqual(memberships.map(r => r.name), [account.restaurant]);
  }
});

test('demonstration setup preserves personal accounts and existing customer passwords and data', () => {
  const customer = db.prepare('SELECT * FROM user WHERE email = ?').get(accounts[0].email);
  db.prepare('UPDATE user SET username = ? WHERE user_id = ?').run('Legacy Customer', customer.user_id);
  const personalHash = bcrypt.hashSync('Private-Test-Password26!', 12);
  const id = Number(db.prepare('INSERT INTO user (username,display_name,email,password_hash,role) VALUES (?,?,?,?,?)').run('Prajwal Shrestha', 'Personal Name', 'personal@example.test', personalHash, 'customer').lastInsertRowid);
  const personal = db.prepare('SELECT * FROM user WHERE user_id = ?').get(id);
  seedDemoAccounts(db);
  assert.deepEqual(db.prepare('SELECT * FROM user WHERE user_id = ?').get(id), personal);
  const after = db.prepare('SELECT * FROM user WHERE user_id = ?').get(customer.user_id);
  assert.equal(after.username, 'Legacy Customer'); assert.equal(after.password_hash, customer.password_hash);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM customer_order WHERE user_id = ?').get(customer.user_id).n, 6);
});

test('role activity password and venue collisions fail atomically without resetting or widening access', () => {
  const account = db.prepare('SELECT * FROM user WHERE email = ?').get('staff.the-spice-tailor@smartdine.test');
  const customer = db.prepare('SELECT user_id FROM user WHERE email = ?').get(accounts[0].email);
  db.prepare('UPDATE user SET display_name = ? WHERE user_id = ?').run('Before failed setup', customer.user_id);
  for (const [field, value, original, pattern] of [
    ['role', 'customer', 'staff', /role\/activity/],
    ['is_active', 0, 1, /role\/activity/],
    ['password_hash', bcrypt.hashSync('Different-Test-Password26!', 12), account.password_hash, /preserved without reset/],
  ]) {
    db.prepare(`UPDATE user SET ${field} = ? WHERE user_id = ?`).run(value, account.user_id);
    assert.throws(() => seedDemoAccounts(db), pattern);
    assert.equal(db.prepare('SELECT display_name FROM user WHERE user_id = ?').get(customer.user_id).display_name, 'Before failed setup');
    assert.equal(db.prepare(`SELECT ${field} AS value FROM user WHERE user_id = ?`).get(account.user_id).value, value);
    db.prepare(`UPDATE user SET ${field} = ? WHERE user_id = ?`).run(original, account.user_id);
  }
  db.prepare('INSERT INTO restaurant_member (user_id,restaurant_id) VALUES (?,2)').run(account.user_id);
  assert.throws(() => seedDemoAccounts(db), /membership conflicts/);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM restaurant_member WHERE user_id = ?').get(account.user_id).n, 2);
  db.prepare('DELETE FROM restaurant_member WHERE user_id = ? AND restaurant_id = 2').run(account.user_id);
  db.prepare('UPDATE user SET display_name = ? WHERE user_id = ?').run(accounts[0].name, customer.user_id);
});

test('missing demonstration venues roll back provisioning without changing existing records', () => {
  db.prepare('UPDATE restaurant SET is_active = 0 WHERE restaurant_id = 1').run();
  const before = db.prepare('SELECT * FROM user ORDER BY user_id').all();
  assert.throws(() => seedDemoAccounts(db), /restaurant missing/);
  assert.deepEqual(db.prepare('SELECT * FROM user ORDER BY user_id').all(), before);
  db.prepare('UPDATE restaurant SET is_active = 1 WHERE restaurant_id = 1').run();
});

test('demonstration provisioning refuses production and disabled fixtures', () => {
  process.env.NODE_ENV = 'production';
  assert.throws(() => seedDemoAccounts(db), /disabled/);
  process.env.NODE_ENV = 'test'; process.env.DEMO_DATA = 'false';
  assert.throws(() => seedDemoAccounts(db), /disabled/);
  process.env.DEMO_DATA = 'true';
});

for (const account of accounts.filter(a => a.email.includes('.'))) {
  if (!account.restaurant || !account.email.startsWith(account.role + '.')) continue;
  test(account.email + ' logs in and manages only its assigned restaurant', async () => {
    const login = await request('POST', '/auth/login', { email: account.email, password });
    assert.equal(login.status, 200); assert.equal(login.body.role, account.role); assert.equal(login.body.display_name, account.name);
    const token = login.body.token;
    const managed = await request('GET', '/restaurants/managed', undefined, token);
    assert.equal(managed.status, 200); assert.equal(managed.body.length, 1); assert.equal(managed.body[0].name, account.restaurant);
    const id = managed.body[0].restaurant_id, other = id === 1 ? 2 : 1;
    assert.equal((await request('GET', `/restaurants/${id}/manage`, undefined, token)).status, 200);
    assert.equal((await request('GET', `/restaurants/${other}/manage`, undefined, token)).status, 403);
    const created = await request('POST', `/restaurants/${id}/menu`, { item_name: 'Scope Test Dish', price: 12.5 }, token);
    assert.equal(created.status, 201);
    assert.equal((await request('PATCH', `/restaurants/${id}/menu/${created.body.item_id}`, { is_available: false }, token)).status, 200);
    assert.equal((await request('DELETE', `/restaurants/${id}/menu/${created.body.item_id}`, {}, token)).status, 200);
    assert.equal((await request('POST', `/restaurants/${other}/menu`, { item_name: 'Forbidden Dish', price: 1 }, token)).status, 403);
    assert.equal((await request('PATCH', `/restaurants/${other}/promotion`, { promotion_text: '', promotion_active: false }, token)).status, 403);
    assert.equal((await request('GET', `/orders/managed?restaurant_id=${other}`, undefined, token)).status, 403);
    assert.equal((await request('PATCH', `/orders/${orders.get(other).order_id}/status`, { status: 'Confirmed' }, token)).status, 403);
    const own = await request('GET', `/orders/managed?restaurant_id=${id}`, undefined, token);
    assert.equal(own.status, 200); assert.equal(own.body[0].pickup_notes, 'Authorization fixture');
    for (const status of account.role === 'staff' ? ['Confirmed', 'Preparing'] : ['Ready', 'Completed']) {
      assert.equal((await request('PATCH', `/orders/${orders.get(id).order_id}/status`, { status }, token)).status, 200);
    }
    assert.equal((await request('GET', `/analytics/restaurants/${id}`, undefined, token)).status, account.role === 'owner' ? 200 : 403);
    assert.equal((await request('GET', `/analytics/restaurants/${other}`, undefined, token)).status, 403);
    assert.equal((await request('GET', `/restaurants/${id}/manage`, undefined, customerToken)).status, 403);
    assert.equal((await request('GET', `/analytics/restaurants/${id}`, undefined, customerToken)).status, 403);
    if (account.role === 'owner') assert.equal((await request('GET', `/orders/${orders.get(id).order_id}`, undefined, customerToken)).body.status, 'Completed');
  });
}

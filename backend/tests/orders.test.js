const { test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
process.env.NODE_ENV = 'test'; process.env.DB_PATH = ':memory:'; process.env.JWT_SECRET = 'orders-test-secret-at-least-32-characters';
const app = require('../src/app'); const db = require('../src/db');
let server, base, customer, other, staff, owner, outsider, item, secondItem, foreignItem;
function account(name, role) {
  const id = Number(db.prepare('INSERT INTO user (username,email,password_hash,role) VALUES (?,?,?,?)').run(name, name + '@example.test', bcrypt.hashSync('Order-Test26!', 4), role).lastInsertRowid);
  return { id, token: jwt.sign({ user_id: id, version: 0 }, process.env.JWT_SECRET, { issuer: 'smartdine', audience: 'smartdine-client', expiresIn: '1h' }) };
}
async function request(path, method = 'GET', body, who = customer) {
  if (method === 'DELETE' && body === undefined) body = {};
  const response = await fetch(base + '/api' + path, { method, headers: { 'Content-Type': 'application/json', ...(who ? { Authorization: 'Bearer ' + who.token } : {}) }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
  return { status: response.status, body: await response.json() };
}
async function add(id = item, quantity = 1, who = customer) { return request('/cart/items', 'POST', { item_id: id, quantity }, who); }
async function checkout(overrides = {}, who = customer) {
  const cart = (await request('/cart', 'GET', undefined, who)).body;
  return request('/orders', 'POST', { customer_name: 'Pickup Customer', fulfilment: 'pickup', cart_revision: cart.revision, idempotency_key: randomUUID(), ...overrides }, who);
}
before(async () => {
  customer = account('customer', 'customer'); other = account('other', 'customer'); staff = account('staff', 'staff'); owner = account('owner', 'owner'); outsider = account('outsider', 'staff');
  for (const who of [staff, owner]) db.prepare('INSERT INTO restaurant_member (user_id,restaurant_id) VALUES (?,1)').run(who.id);
  [item, secondItem] = db.prepare('SELECT item_id FROM menu_item WHERE restaurant_id = 1 ORDER BY item_id LIMIT 2').all().map(i => i.item_id);
  foreignItem = db.prepare('SELECT item_id FROM menu_item WHERE restaurant_id = 2 LIMIT 1').get().item_id;
  server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve)); base = 'http://127.0.0.1:' + server.address().port;
});
beforeEach(() => { db.exec('DELETE FROM cart_item; DELETE FROM customer_order; UPDATE menu_item SET is_available = 1; UPDATE restaurant SET is_active = 1,open_minute = 0,close_minute = 1440'); db.prepare('UPDATE menu_item SET price = 12.35 WHERE item_id = ?').run(item); });
after(async () => { await new Promise(resolve => server.close(resolve)); db.close(); });
test('cart and orders require authentication and customer role', async () => {
  for (const path of ['/cart', '/orders']) { assert.equal((await request(path, 'GET', undefined, null)).status, 401); assert.equal((await request(path, 'GET', undefined, staff)).status, 403); }
  assert.equal((await request('/orders/managed?restaurant_id=1')).status, 403);
});
test('cart persists per account and computes prices in integer cents', async () => {
  const added = await add(item, 3); assert.equal(added.status, 200); assert.equal(added.body.total_cents, 3705); assert.equal(added.body.item_count, 3);
  assert.equal((await request('/cart')).body.total_cents, 3705); assert.equal((await request('/cart', 'GET', undefined, other)).body.item_count, 0);
});
test('client-supplied prices and totals cannot change menu prices', async () => {
  const cart = await request('/cart/items', 'POST', { item_id: item, quantity: 2, price: 0, total_cents: 1 }); assert.equal(cart.body.total_cents, 2470);
  const order = await checkout({ total_cents: 1 }); assert.equal(order.status, 201); assert.equal(order.body.total_cents, 2470);
});
test('invalid quantities and item identifiers are rejected', async () => {
  for (const quantity of [0, -1, 21, 1.5, '2', null]) assert.equal((await add(item, quantity)).status, 400);
  for (const id of [0, -1, '1', 1.5]) assert.equal((await add(id)).status, 400);
  assert.equal((await add(99999)).status, 404);
});
test('unavailable items and inactive restaurants cannot be added', async () => {
  db.prepare('UPDATE menu_item SET is_available = 0 WHERE item_id = ?').run(item); assert.equal((await add()).status, 409);
  db.prepare('UPDATE menu_item SET is_available = 1 WHERE item_id = ?').run(item); db.exec('UPDATE restaurant SET is_active = 0 WHERE restaurant_id = 1'); assert.equal((await add()).status, 409);
});
test('cart restricts orders to one restaurant and enforces quantity caps', async () => {
  await add(item, 20); assert.equal((await add(foreignItem)).status, 409); assert.equal((await add(item)).status, 400);
  const ids = db.prepare('SELECT item_id FROM menu_item WHERE restaurant_id = 1 AND item_id != ?').all(item);
  await add(ids[0].item_id, 20); assert.equal((await add(ids[1].item_id, 11)).status, 400); assert.equal((await request('/cart')).body.item_count, 40);
});
test('quantity updates, removals and clear apply only to the authenticated cart', async () => {
  await add(item, 3); await add(item, 2, other);
  assert.equal((await request('/cart/items/' + item, 'PUT', { quantity: 2 })).body.item_count, 2);
  assert.equal((await request('/cart/items/' + item, 'DELETE')).body.item_count, 0);
  assert.equal((await request('/cart', 'GET', undefined, other)).body.item_count, 2);
  await add(); assert.equal((await request('/cart', 'DELETE')).body.item_count, 0);
});
test('empty carts cannot be checked out', async () => { assert.equal((await checkout()).status, 400); });
test('checkout requires valid name, pickup mode, revision and retry key', async () => {
  await add();
  for (const fields of [{ customer_name: '' }, { customer_name: 'x' }, { fulfilment: 'delivery' }, { fulfilment: ['pickup'] }, { cart_revision: 'bad' }, { idempotency_key: 'bad' }, { pickup_notes: 'x'.repeat(501) }, { contact_phone: 'not-a-phone' }]) assert.equal((await checkout(fields)).status, 400);
});
test('checkout rejects stale cart revisions and changed menu prices', async () => {
  const cart = (await add()).body; await add(); assert.equal((await checkout({ cart_revision: cart.revision })).status, 409);
  const current = (await request('/cart')).body; db.prepare('UPDATE menu_item SET price = 15.15 WHERE item_id = ?').run(item); assert.equal((await checkout({ cart_revision: current.revision })).status, 409);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM customer_order').get().n, 0);
});
test('checkout rechecks availability and opening hours', async () => {
  await add(); db.prepare('UPDATE menu_item SET is_available = 0 WHERE item_id = ?').run(item);
  assert.equal((await checkout()).status, 409); db.prepare('UPDATE menu_item SET is_available = 1 WHERE item_id = ?').run(item);
  db.exec('UPDATE restaurant SET open_minute = 0,close_minute = 0 WHERE restaurant_id = 1'); assert.equal((await checkout()).status, 409);
});
test('successful checkout snapshots item prices, creates a unique ID and clears cart', async () => {
  await add(item, 2); const order = await checkout({ contact_phone: '+61 400 123 456', pickup_notes: 'Please pack cutlery.' });
  assert.equal(order.status, 201); assert.match(order.body.order_number, /^SD-\d{8}-[A-F0-9]{8}$/); assert.equal(order.body.status, 'Placed'); assert.equal(order.body.total_cents, 2470);
  assert.equal((await request('/cart')).body.item_count, 0);
  db.prepare('UPDATE menu_item SET price = 99 WHERE item_id = ?').run(item);
  assert.equal((await request('/orders/' + order.body.order_id)).body.items[0].unit_price_cents, 1235);
});
test('identical checkout retry returns the same order without duplicates', async () => {
  await add(); const key = randomUUID(); const first = await checkout({ idempotency_key: key }); const retry = await checkout({ idempotency_key: key });
  assert.equal(first.status, 201); assert.equal(retry.status, 200); assert.equal(first.body.order_id, retry.body.order_id); assert.equal(db.prepare('SELECT COUNT(*) AS n FROM customer_order').get().n, 1);
});
test('order history and detail cannot expose another customer orders', async () => {
  await add(); const order = (await checkout()).body;
  assert.equal((await request('/orders')).body.length, 1); assert.equal((await request('/orders', 'GET', undefined, other)).body.length, 0);
  assert.equal((await request('/orders/' + order.order_id, 'GET', undefined, other)).status, 404);
});
test('only assigned staff and owners can see and update restaurant orders', async () => {
  await add(); const order = (await checkout()).body;
  for (const who of [staff, owner]) assert.equal((await request('/orders/managed?restaurant_id=1', 'GET', undefined, who)).body.length, 1);
  assert.equal((await request('/orders/managed?restaurant_id=1', 'GET', undefined, outsider)).status, 403);
  assert.equal((await request('/orders/' + order.order_id + '/status', 'PATCH', { status: 'Confirmed' }, outsider)).status, 403);
  assert.equal((await request('/orders/' + order.order_id + '/status', 'PATCH', { status: 'Confirmed' })).status, 403);
});
test('status transitions are sequential, persistent and audited', async () => {
  await add(); const order = (await checkout()).body; const path = '/orders/' + order.order_id + '/status';
  assert.equal((await request(path, 'PATCH', { status: 'Ready' }, staff)).status, 409);
  for (const status of ['Confirmed', 'Preparing', 'Ready', 'Completed']) { const result = await request(path, 'PATCH', { status }, staff); assert.equal(result.status, 200); assert.equal(result.body.status, status); }
  assert.equal((await request(path, 'PATCH', { status: 'Confirmed' }, owner)).status, 409);
  assert.equal((await request('/orders/' + order.order_id)).body.status, 'Completed');
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM audit_event WHERE target_id = ? AND action LIKE 'order.%'").get(order.order_id).n, 4);
});
test('order item snapshots survive menu item deletion', async () => {
  await add(); const order = (await checkout()).body;
  db.prepare('DELETE FROM menu_item WHERE item_id = ?').run(item);
  const stored = (await request('/orders/' + order.order_id)).body; assert.equal(stored.items[0].item_id, null); assert.equal(stored.items[0].unit_price_cents, 1235);
  db.prepare('INSERT INTO menu_item (item_id,restaurant_id,item_name,category,price,is_available) VALUES (?,1,?,?,?,1)').run(item, stored.items[0].item_name, 'Main', 12.35);
});
test('privacy export includes own cart and orders but no retry keys', async () => {
  await add(); const order = (await checkout()).body; await add(secondItem);
  const exported = (await request('/privacy/export')).body;
  assert.equal(exported.orders[0].order_id, order.order_id); assert.equal(exported.cart.length, 1); assert.ok(!('idempotency_key' in exported.orders[0]));
  assert.equal((await request('/privacy/export', 'GET', undefined, other)).body.orders.length, 0);
});
test('account deletion cascades cart, orders and order item personal data', async () => {
  const temporary = account('temporary', 'customer'); await add(item, 1, temporary); await checkout({}, temporary); await add(item, 1, temporary);
  assert.equal((await request('/privacy/account', 'DELETE', { password: 'Order-Test26!', confirmation: 'DELETE' }, temporary)).status, 200);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM customer_order WHERE user_id = ?').get(temporary.id).n, 0);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM cart_item WHERE user_id = ?').get(temporary.id).n, 0);
});

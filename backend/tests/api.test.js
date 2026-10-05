const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
process.env.NODE_ENV = 'test';
process.env.DB_PATH = ':memory:';
process.env.JWT_SECRET = 'test-only-secret-at-least-32-characters-long';
delete process.env.TEST_RATE_LIMIT;
const app = require('../src/app');
const db = require('../src/db');
let server, base, customer, second, staff, owner, customerId, itemId;
const password = 'Integration-Test26!';
function token(id, options = {}) {
  return jwt.sign({ user_id: id, version: 0 }, process.env.JWT_SECRET, { issuer: 'smartdine', audience: 'smartdine-client', expiresIn: '1h', ...options });
}
async function request(method, url, body, auth) {
  const response = await fetch(base + '/api' + url, { method, headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: 'Bearer ' + auth } : {}) }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
  return { status: response.status, body: await response.json(), headers: response.headers };
}
before(async () => {
  const hash = await bcrypt.hash(password, 12);
  const ids = {};
  for (const role of ['customer', 'second', 'staff', 'owner']) {
    ids[role] = Number(db.prepare('INSERT INTO user (username, email, password_hash, role) VALUES (?, ?, ?, ?)').run(role, role + '@smartdine.test', hash, role === 'second' ? 'customer' : role).lastInsertRowid);
  }
  customerId = ids.customer;
  [customer, second, staff, owner] = ['customer', 'second', 'staff', 'owner'].map(role => token(ids[role]));
  for (const role of ['staff', 'owner']) db.prepare('INSERT INTO restaurant_member (user_id, restaurant_id) VALUES (?, 1)').run(ids[role]);
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  base = 'http://127.0.0.1:' + server.address().port;
});
after(async () => { await new Promise(resolve => server.close(resolve)); db.close(); });
test('health responds and does not expose secrets', async () => {
  const r = await request('GET', '/health'); assert.equal(r.status, 200); assert.equal(r.body.version, '2.0.0'); assert.equal(r.headers.get('cache-control'), 'no-store');
});
test('registration hashes passwords and creates customer with secure cookie flags', async () => {
  const r = await request('POST', '/auth/register', { username: 'New Diner', email: 'new@example.test', password, privacy_accepted: true });
  assert.equal(r.status, 201); assert.equal(r.body.role, 'customer');
  assert.match(r.headers.get('set-cookie'), /HttpOnly/); assert.match(r.headers.get('set-cookie'), /SameSite=Strict/);
  const u = db.prepare("SELECT * FROM user WHERE email = 'new@example.test'").get();
  assert.notEqual(u.password_hash, password); assert.equal(bcrypt.getRounds(u.password_hash), 12); assert.ok(u.privacy_accepted_at);
});
test('public registration cannot escalate to owner', async () => assert.equal((await request('POST', '/auth/register', { username: 'Escalation', email: 'owner-attack@example.test', password, role: 'owner', privacy_accepted: true })).status, 400));
test('public registration cannot escalate to staff', async () => assert.equal((await request('POST', '/auth/register', { username: 'Escalation', email: 'staff-attack@example.test', password, role: 'staff', privacy_accepted: true })).status, 400));
test('registration requires privacy acknowledgement and a strong enough password', async () => assert.equal((await request('POST', '/auth/register', { username: 'Short', email: 'short@example.test', password: 'short' })).status, 400));
test('duplicate registration is rejected case-insensitively', async () => assert.equal((await request('POST', '/auth/register', { username: 'Other Name', email: 'NEW@EXAMPLE.TEST', password, privacy_accepted: true })).status, 409));
test('valid login accepts email case differences', async () => assert.equal((await request('POST', '/auth/login', { email: 'CUSTOMER@SMARTDINE.TEST', password })).status, 200));

test('authenticated display names are database driven without changing unique login identifiers', async () => {
  const initial = await request('GET', '/auth/me', undefined, customer);
  assert.equal(initial.body.display_name, 'customer');
  db.prepare('UPDATE user SET display_name = ? WHERE user_id = ?').run('Profile Test Name', customerId);
  const me = await request('GET', '/auth/me', undefined, customer);
  assert.equal(me.body.username, 'customer'); assert.equal(me.body.display_name, 'Profile Test Name');
  const login = await request('POST', '/auth/login', { email: 'customer@smartdine.test', password });
  assert.equal(login.body.display_name, 'Profile Test Name');
  db.prepare('UPDATE user SET display_name = NULL WHERE user_id = ?').run(customerId);
});
test('missing authentication is rejected', async () => assert.equal((await request('GET', '/preferences')).status, 401));
test('tampered token is rejected', async () => assert.equal((await request('GET', '/preferences', undefined, customer + 'x')).status, 401));
test('expired token is rejected', async () => assert.equal((await request('GET', '/preferences', undefined, token(customerId, { expiresIn: -1 }))).status, 401));
test('inactive account is rejected even with a valid token', async () => {
  db.prepare('UPDATE user SET is_active = 0 WHERE user_id = ?').run(customerId);
  assert.equal((await request('GET', '/preferences', undefined, customer)).status, 401);
  db.prepare('UPDATE user SET is_active = 1 WHERE user_id = ?').run(customerId);
});
test('five failed logins trigger a temporary account lock', async () => {
  for (let i = 0; i < 5; i++) assert.equal((await request('POST', '/auth/login', { email: 'customer@smartdine.test', password: 'wrong' })).status, 401);
  assert.equal((await request('POST', '/auth/login', { email: 'customer@smartdine.test', password })).status, 429);
});
test('expired account lock permits valid login', async () => {
  db.prepare("UPDATE user SET locked_until = datetime('now', '-1 minute') WHERE user_id = ?").run(customerId);
  assert.equal((await request('POST', '/auth/login', { email: 'customer@smartdine.test', password })).status, 200);
  assert.equal(db.prepare('SELECT failed_logins FROM user WHERE user_id = ?').get(customerId).failed_logins, 0);
});
test('preferences save and read back exact validated fields', async () => {
  assert.equal((await request('PUT', '/preferences', { cuisine_type: 'Indian', dietary_req: 'vegetarian', price_range: '$$', radius_km: 2 }, customer)).status, 200);
  assert.equal((await request('GET', '/preferences', undefined, customer)).body.radius_km, 2);
});
test('unsupported dietary requirements are rejected', async () => assert.equal((await request('PUT', '/preferences', { dietary_req: 'halal' }, customer)).status, 400));
test('invalid radius and price bands are rejected', async () => {
  assert.equal((await request('PUT', '/preferences', { radius_km: -1 }, customer)).status, 400);
  assert.equal((await request('PUT', '/preferences', { price_range: 'cheap' }, customer)).status, 400);
});
test('preferences are private to each customer', async () => assert.equal((await request('GET', '/preferences', undefined, second)).body, null));
test('invalid coordinates are rejected', async () => assert.equal((await request('POST', '/location/update', { latitude: 91, longitude: 151 }, customer)).status, 400));
test('location returns scored nearby venues with dietary exclusions and directions', async () => {
  const r = await request('POST', '/location/update', { latitude: -33.8672, longitude: 151.2085 }, customer);
  assert.equal(r.status, 200); assert.equal(r.body.recommendations.length, 4);
  assert.equal(r.body.excluded_for_dietary_requirements.length, 2);
  const first = r.body.recommendations[0]; assert.equal(first.restaurant_id, 1); assert.equal(first.within_geofence, true);
  assert.ok(first.directions.maps_url.includes('travelmode=walking')); assert.equal(Object.keys(first.score_breakdown).length, 6);
});
test('location pings suppress duplicate impressions and notifications', async () => {
  const before = db.prepare('SELECT COUNT(*) AS c FROM recommendation WHERE user_id = ?').get(customerId).c;
  const count = db.prepare('SELECT COUNT(*) AS c FROM notification WHERE user_id = ?').get(customerId).c;
  await request('POST', '/location/update', { latitude: -33.8672, longitude: 151.2085 }, customer);
  assert.equal(db.prepare('SELECT COUNT(*) AS c FROM recommendation WHERE user_id = ?').get(customerId).c, before);
  assert.equal(db.prepare('SELECT COUNT(*) AS c FROM notification WHERE user_id = ?').get(customerId).c, count);
});
test('far-away coordinates return no recommendations', async () => {
  const r = await request('POST', '/location/update', { latitude: 0, longitude: 0 }, customer);
  assert.deepEqual(r.body.recommendations, []);
});
test('notification read status is private to the recipient', async () => {
  const notifications = (await request('GET', '/location/notifications', undefined, customer)).body;
  assert.ok(notifications.length); const id = notifications[0].notif_id;
  assert.equal((await request('PATCH', '/location/notifications/' + id + '/read', {}, second)).status, 404);
  assert.equal((await request('PATCH', '/location/notifications/' + id + '/read', {}, customer)).status, 200);
});
test('view tracking changes the latest impression once', async () => {
  assert.equal((await request('POST', '/location/recommendations/1/viewed', {}, customer)).status, 200);
  await request('POST', '/location/recommendations/1/viewed', {}, customer);
  assert.equal(db.prepare('SELECT SUM(is_viewed) AS c FROM recommendation WHERE user_id = ? AND restaurant_id = 1').get(customerId).c, 1);
});
test('customer cannot add menu items', async () => assert.equal((await request('POST', '/restaurants/1/menu', { item_name: 'Attack', price: 1 }, customer)).status, 403));
test('staff cannot manage an unassigned restaurant', async () => assert.equal((await request('POST', '/restaurants/2/menu', { item_name: 'Attack', price: 1 }, staff)).status, 403));
test('staff can create an assigned restaurant menu item', async () => {
  const r = await request('POST', '/restaurants/1/menu', { item_name: 'Test Dhal', price: 18.9, category: 'Main', description: 'Lentil curry', vegetarian: true, vegan: true, is_available: true }, staff);
  assert.equal(r.status, 201); itemId = r.body.item_id; assert.ok(itemId);
});
test('negative prices and string booleans are rejected', async () => {
  assert.equal((await request('PATCH', '/restaurants/1/menu/' + itemId, { price: -1 }, staff)).status, 400);
  assert.equal((await request('PATCH', '/restaurants/1/menu/' + itemId, { is_available: 'false' }, staff)).status, 400);
});
test('invalid vegan flags and empty menu names are rejected', async () => {
  assert.equal((await request('POST', '/restaurants/1/menu', { item_name: 'Wrong', price: 2, vegan: true, vegetarian: false }, staff)).status, 400);
  assert.equal((await request('PATCH', '/restaurants/1/menu/' + itemId, { item_name: ' ' }, staff)).status, 400);
});
test('disabled items disappear publicly but remain in staff management', async () => {
  assert.equal((await request('PATCH', '/restaurants/1/menu/' + itemId, { is_available: false }, staff)).status, 200);
  assert.ok(!(await request('GET', '/restaurants/1/menu')).body.some(item => item.item_id === itemId));
  assert.ok((await request('GET', '/restaurants/1/manage', undefined, staff)).body.menu.some(item => item.item_id === itemId));
});
test('menu update cannot change another restaurants item', async () => assert.equal((await request('PATCH', '/restaurants/1/menu/6', { price: 1 }, staff)).status, 404));
test('staff can delete an item and produces an audit record', async () => {
  assert.equal((await request('DELETE', '/restaurants/1/menu/' + itemId, {}, staff)).status, 200);
  assert.equal(db.prepare('SELECT action FROM audit_event WHERE target_id = ? ORDER BY event_id DESC').get(itemId).action, 'menu.delete');
});
test('scheduled promotions validate dates and update the restaurant', async () => {
  assert.equal((await request('PATCH', '/restaurants/1/promotion', { promotion_text: 'Lunch offer', promotion_active: true, promotion_start: '2030-01-01T00:00:00Z', promotion_end: '2020-01-01T00:00:00Z' }, staff)).status, 400);
  assert.equal((await request('PATCH', '/restaurants/1/promotion', { promotion_text: 'Future offer', promotion_active: true, promotion_start: '2030-01-01T00:00:00Z', promotion_end: '2030-01-02T00:00:00Z' }, staff)).status, 200);
  const r = await request('POST', '/location/update', { latitude: -33.8672, longitude: 151.2085 }, customer);
  assert.equal(r.body.recommendations.find(r => r.restaurant_id === 1).promotion, null);
});
test('staff and customers cannot access owner analytics', async () => {
  assert.equal((await request('GET', '/analytics/restaurants/1', undefined, staff)).status, 403);
  assert.equal((await request('GET', '/analytics/restaurants/1', undefined, customer)).status, 403);
});
test('owner cannot read another restaurants analytics', async () => assert.equal((await request('GET', '/analytics/restaurants/2', undefined, owner)).status, 403));
test('feedback ratings enforce range and update instead of inflating counts', async () => {
  assert.equal((await request('POST', '/feedback/1', { rating: 6 }, customer)).status, 400);
  assert.equal((await request('POST', '/feedback/1', { rating: 5, comment: 'Good menu' }, customer)).status, 201);
  assert.equal((await request('POST', '/feedback/1', { rating: 4, comment: 'Updated review' }, customer)).status, 200);
  const r = (await request('GET', '/feedback/1')).body; assert.equal(r.rating_count, 1); assert.equal(r.average_rating, 4);
});
test('owner metrics come from persisted impressions views and ratings', async () => {
  const r = (await request('GET', '/analytics/restaurants/1', undefined, owner)).body;
  assert.equal(r.metrics.impressions, 1); assert.equal(r.metrics.views, 1); assert.equal(r.metrics.engagement_rate, 1);
  assert.equal(r.metrics.average_rating, 4); assert.equal(r.metrics.rating_count, 1); assert.equal(r.recent_feedback[0].username, undefined);
});
test('staff cannot submit customer ratings', async () => assert.equal((await request('POST', '/feedback/1', { rating: 5 }, staff)).status, 403));
test('SQL-like review content remains inert data', async () => {
  const comment = "Nice'); DROP TABLE user; --";
  assert.equal((await request('POST', '/feedback/1', { rating: 4, comment }, customer)).status, 200);
  assert.ok(db.prepare('SELECT COUNT(*) AS c FROM user').get().c > 0);
  assert.equal((await request('GET', '/feedback/1')).body.reviews[0].comment, comment);
});
test('push subscriptions cannot target localhost or arbitrary hosts', async () => {
  for (const endpoint of ['https://127.0.0.1/push', 'https://example.com/push', 'https://fcm.googleapis.com.evil.test/push']) {
    assert.equal((await request('POST', '/push/subscribe', { endpoint, keys: { p256dh: 'a'.repeat(87), auth: 'a'.repeat(22) } }, customer)).status, 400);
  }
});
test('notification opt-out prevents further offer records', async () => {
  assert.equal((await request('PATCH', '/privacy/settings', { notifications_enabled: false }, customer)).status, 200);
  db.prepare('DELETE FROM notification WHERE user_id = ?').run(customerId);
  db.prepare("UPDATE restaurant SET promotion_active = 1, promotion_start = NULL, promotion_end = NULL WHERE restaurant_id = 1").run();
  await request('POST', '/location/update', { latitude: -33.8672, longitude: 151.2085 }, customer);
  assert.equal((await request('GET', '/location/notifications', undefined, customer)).body.length, 0);
});
test('data export contains only own data and excludes password hash and tokens', async () => {
  const r = await request('GET', '/privacy/export', undefined, customer);
  assert.equal(r.body.profile.email, 'customer@smartdine.test');
  assert.ok(!JSON.stringify(r.body).includes('password_hash'));
  assert.ok(!JSON.stringify(r.body).includes('second@smartdine.test'));
  assert.ok(!Object.hasOwn(r.body.profile, 'token_version'));
});
test('delete history removes impressions and notifications', async () => {
  assert.equal((await request('DELETE', '/privacy/history', {}, customer)).status, 200);
  assert.equal(db.prepare('SELECT COUNT(*) AS c FROM recommendation WHERE user_id = ?').get(customerId).c, 0);
});
test('logout revokes previously issued tokens', async () => {
  assert.equal((await request('POST', '/auth/logout', {}, second)).status, 200);
  assert.equal((await request('GET', '/auth/me', undefined, second)).status, 401);
});
test('account deletion requires password and removes associated data', async () => {
  assert.equal((await request('DELETE', '/privacy/account', { password: 'wrong', confirmation: 'DELETE' }, customer)).status, 401);
  assert.equal((await request('DELETE', '/privacy/account', { password, confirmation: 'DELETE' }, customer)).status, 200);
  assert.equal(db.prepare('SELECT * FROM user WHERE user_id = ?').get(customerId), undefined);
  assert.equal((await request('GET', '/auth/me', undefined, customer)).status, 401);
});

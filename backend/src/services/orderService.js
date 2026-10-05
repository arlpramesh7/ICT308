const { randomUUID, createHash } = require('node:crypto');
const db = require('../db');
const { openingState } = require('./catalogService');

db.exec(`
  CREATE TABLE IF NOT EXISTS cart_item (
    user_id INTEGER NOT NULL REFERENCES user(user_id) ON DELETE CASCADE,
    item_id INTEGER NOT NULL REFERENCES menu_item(item_id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity BETWEEN 1 AND 20),
    PRIMARY KEY(user_id,item_id)
  );
  CREATE TABLE IF NOT EXISTS customer_order (
    order_id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_number TEXT NOT NULL UNIQUE,
    user_id INTEGER NOT NULL REFERENCES user(user_id) ON DELETE CASCADE,
    restaurant_id INTEGER NOT NULL REFERENCES restaurant(restaurant_id),
    status TEXT NOT NULL DEFAULT 'Placed' CHECK(status IN ('Placed','Confirmed','Preparing','Ready','Completed')),
    fulfilment TEXT NOT NULL CHECK(fulfilment = 'pickup'),
    customer_name TEXT NOT NULL,
    contact_phone TEXT NOT NULL DEFAULT '',
    pickup_notes TEXT NOT NULL DEFAULT '',
    total_cents INTEGER NOT NULL CHECK(total_cents >= 0),
    idempotency_key TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(user_id,idempotency_key)
  );
  CREATE TABLE IF NOT EXISTS order_item (
    order_item_id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL REFERENCES customer_order(order_id) ON DELETE CASCADE,
    item_id INTEGER REFERENCES menu_item(item_id) ON DELETE SET NULL,
    item_name TEXT NOT NULL,
    unit_price_cents INTEGER NOT NULL CHECK(unit_price_cents >= 0),
    quantity INTEGER NOT NULL CHECK(quantity BETWEEN 1 AND 20)
  );
  CREATE INDEX IF NOT EXISTS idx_order_user ON customer_order(user_id,order_id);
  CREATE INDEX IF NOT EXISTS idx_order_restaurant ON customer_order(restaurant_id,order_id);
`);

function cartFor(userId) {
  const items = db.prepare(`SELECT c.item_id,c.quantity,m.item_name,m.price,m.is_available,m.restaurant_id,r.name AS restaurant_name,r.is_active
    FROM cart_item c JOIN menu_item m USING(item_id) JOIN restaurant r USING(restaurant_id)
    WHERE c.user_id = ? ORDER BY c.item_id`).all(userId).map(i => ({ ...i, unit_price_cents: Math.round(i.price * 100), line_total_cents: Math.round(i.price * 100) * i.quantity, available: Boolean(i.is_available && i.is_active) }));
  const venue = items.length ? db.prepare('SELECT restaurant_id,name,address,pickup_minutes,opening_hours,is_active,open_minute,close_minute FROM restaurant WHERE restaurant_id = ?').get(items[0].restaurant_id) : null;
  const restaurant = venue ? { ...venue, is_open: openingState(venue) } : null;
  const subtotal = items.reduce((sum, i) => sum + i.line_total_cents, 0);
  const revision = createHash('sha256').update(JSON.stringify(items.map(i => [i.item_id, i.quantity, i.unit_price_cents, i.available, i.restaurant_id]))).digest('hex');
  return { restaurant, items, item_count: items.reduce((sum, i) => sum + i.quantity, 0), subtotal_cents: subtotal, total_cents: subtotal, currency: 'AUD', revision, can_checkout: Boolean(items.length && restaurant?.is_open && items.every(i => i.available)) };
}
function orderDetails(order) {
  return { ...order, restaurant_name: db.prepare('SELECT name FROM restaurant WHERE restaurant_id = ?').get(order.restaurant_id)?.name, items: db.prepare('SELECT item_id,item_name,unit_price_cents,quantity,unit_price_cents * quantity AS line_total_cents FROM order_item WHERE order_id = ? ORDER BY order_item_id').all(order.order_id), payment_status: 'No payment collected', currency: 'AUD' };
}
function transaction(action) {
  db.exec('BEGIN IMMEDIATE');
  try { const result = action(); db.exec('COMMIT'); return result; }
  catch (error) { db.exec('ROLLBACK'); throw error; }
}
function placeOrder(userId, input) {
  return transaction(() => {
    const existing = db.prepare('SELECT * FROM customer_order WHERE user_id = ? AND idempotency_key = ?').get(userId, input.idempotency_key);
    if (existing) return { order: orderDetails(existing), created: false };
    const cart = cartFor(userId);
    if (!cart.items.length) throw Object.assign(new Error('Your cart is empty.'), { status: 400 });
    if (cart.revision !== input.cart_revision) throw Object.assign(new Error('Your cart or menu prices changed. Review the updated cart before ordering.'), { status: 409 });
    if (!cart.can_checkout) throw Object.assign(new Error('A menu item is unavailable or the restaurant is closed. Update your cart before ordering.'), { status: 409 });
    const number = 'SD-' + new Date().toISOString().slice(0, 10).replaceAll('-', '') + '-' + randomUUID().slice(0, 8).toUpperCase();
    const id = Number(db.prepare('INSERT INTO customer_order (order_number,user_id,restaurant_id,fulfilment,customer_name,contact_phone,pickup_notes,total_cents,idempotency_key) VALUES (?,?,?,?,?,?,?,?,?)').run(number, userId, cart.restaurant.restaurant_id, 'pickup', input.customer_name.trim(), input.contact_phone?.trim() || '', input.pickup_notes?.trim() || '', cart.total_cents, input.idempotency_key).lastInsertRowid);
    for (const item of cart.items) db.prepare('INSERT INTO order_item (order_id,item_id,item_name,unit_price_cents,quantity) VALUES (?,?,?,?,?)').run(id, item.item_id, item.item_name, item.unit_price_cents, item.quantity);
    db.prepare('DELETE FROM cart_item WHERE user_id = ?').run(userId);
    return { order: orderDetails(db.prepare('SELECT * FROM customer_order WHERE order_id = ?').get(id)), created: true };
  });
}
module.exports = { cartFor, orderDetails, transaction, placeOrder };

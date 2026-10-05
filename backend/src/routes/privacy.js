const express = require('express');
const bcrypt = require('bcryptjs');
const { body } = require('express-validator');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const router = express.Router();
const { orderDetails } = require('../services/orderService');
router.use(requireAuth);
router.get('/export', (req, res) => {
  const userId = req.user.user_id;
  res.json({
    exported_at: new Date().toISOString(),
    profile: db.prepare('SELECT username, email, role, created_at, notifications_enabled, privacy_accepted_at FROM user WHERE user_id = ?').get(userId),
    preferences: db.prepare('SELECT cuisine_type, dietary_req, price_range, radius_km FROM preference WHERE user_id = ?').get(userId) || null,
    recommendations: db.prepare('SELECT restaurant_id, score, timestamp, is_viewed FROM recommendation WHERE user_id = ?').all(userId),
    notifications: db.prepare('SELECT restaurant_id, message, sent_at, is_read, push_status FROM notification WHERE user_id = ?').all(userId),
    feedback: db.prepare('SELECT restaurant_id, rating, comment, submitted_at FROM feedback WHERE user_id = ?').all(userId),
    favourites: db.prepare('SELECT restaurant_id, saved_at FROM favourite WHERE user_id = ?').all(userId),
    cart: db.prepare('SELECT item_id,quantity FROM cart_item WHERE user_id = ?').all(userId),
    orders: db.prepare('SELECT * FROM customer_order WHERE user_id = ? ORDER BY order_id DESC').all(userId).map(orderDetails).map(({ idempotency_key, ...order }) => order),
    push_devices: db.prepare('SELECT COUNT(*) AS count FROM push_subscription WHERE user_id = ?').get(userId).count,
    location_history: 'Precise coordinates are processed for each request and are not stored.',
  });
});
router.get('/settings', (req, res) => res.json(db.prepare('SELECT notifications_enabled FROM user WHERE user_id = ?').get(req.user.user_id)));
router.patch('/settings', body('notifications_enabled').custom(v => typeof v === 'boolean'), validate, (req, res) => {
  db.prepare('UPDATE user SET notifications_enabled = ? WHERE user_id = ?').run(Number(req.body.notifications_enabled), req.user.user_id);
  if (!req.body.notifications_enabled) db.prepare('DELETE FROM push_subscription WHERE user_id = ?').run(req.user.user_id);
  res.json({ notifications_enabled: req.body.notifications_enabled });
});
router.delete('/history', (req, res) => {
  db.exec('BEGIN');
  try {
    db.prepare('DELETE FROM recommendation WHERE user_id = ?').run(req.user.user_id);
    db.prepare('DELETE FROM notification WHERE user_id = ?').run(req.user.user_id);
    db.exec('COMMIT');
    res.json({ ok: true });
  } catch (err) { db.exec('ROLLBACK'); throw err; }
});
router.delete('/account', [body('password').isString().isLength({ max: 72 }), body('confirmation').equals('DELETE')], validate, async (req, res) => {
  const user = db.prepare('SELECT * FROM user WHERE user_id = ?').get(req.user.user_id);
  if (!(await bcrypt.compare(req.body.password, user.password_hash))) return res.status(401).json({ error: 'Password did not match.' });
  db.exec('BEGIN');
  try {
    for (const table of ['preference', 'recommendation', 'notification', 'feedback']) db.prepare('DELETE FROM ' + table + ' WHERE user_id = ?').run(user.user_id);
    db.prepare('DELETE FROM user WHERE user_id = ?').run(user.user_id);
    db.exec('COMMIT');
    res.clearCookie('smartdine_session', { path: '/' });
    res.json({ ok: true });
  } catch (err) { db.exec('ROLLBACK'); throw err; }
});
module.exports = router;

const express = require('express');
const { body } = require('express-validator');
const { requireAuth, requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { pushConfigured } = require('../services/notificationService');
const db = require('../db');
const router = express.Router();
const validEndpoint = endpoint => {
  try {
    const url = new URL(endpoint);
    return url.protocol === 'https:' && !url.username && !url.password && !url.port &&
      (['fcm.googleapis.com', 'updates.push.services.mozilla.com', 'push.services.mozilla.com', 'web.push.apple.com'].includes(url.hostname) || url.hostname.endsWith('.notify.windows.com'));
  } catch { return false; }
};
router.use(requireAuth, requireRole('customer'));
router.get('/config', (req, res) => res.json({ enabled: pushConfigured(), publicKey: process.env.VAPID_PUBLIC_KEY || null }));
router.post('/subscribe', [
  body('endpoint').isString().isLength({ max: 2000 }).custom(validEndpoint),
  body('keys.p256dh').isString().matches(/^[A-Za-z0-9_-]{87}=$|^[A-Za-z0-9_-]{87}$/),
  body('keys.auth').isString().matches(/^[A-Za-z0-9_-]{22}(==)?$/),
], validate, (req, res) => {
  if (!pushConfigured()) return res.status(503).json({ error: 'Browser push is not configured.' });
  if (!db.prepare('SELECT notifications_enabled FROM user WHERE user_id = ?').get(req.user.user_id).notifications_enabled) return res.status(409).json({ error: 'Enable offers before subscribing.' });
  const existing = db.prepare('SELECT user_id FROM push_subscription WHERE endpoint = ?').get(req.body.endpoint);
  if (existing && existing.user_id !== req.user.user_id) return res.status(409).json({ error: 'This browser subscription belongs to another account. Unsubscribe first.' });
  db.prepare(`INSERT INTO push_subscription (user_id, endpoint, p256dh, auth) VALUES (?, ?, ?, ?)
    ON CONFLICT(endpoint) DO UPDATE SET p256dh = excluded.p256dh, auth = excluded.auth`).run(req.user.user_id, req.body.endpoint, req.body.keys.p256dh, req.body.keys.auth);
  res.status(201).json({ ok: true });
});
router.delete('/subscribe', body('endpoint').isString(), validate, (req, res) => {
  db.prepare('DELETE FROM push_subscription WHERE user_id = ? AND endpoint = ?').run(req.user.user_id, req.body.endpoint);
  res.json({ ok: true });
});
module.exports = router;


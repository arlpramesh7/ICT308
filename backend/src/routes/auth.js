const express = require('express');
const bcrypt = require('bcryptjs');
const { body } = require('express-validator');
const db = require('../db');
const { validate } = require('../middleware/validation');
const { requireAuth, issueSession } = require('../middleware/auth');
const router = express.Router();
const emailRule = () => body('email').isString().trim().isEmail().isLength({ max: 254 }).toLowerCase();
const publicUser = user => ({ user_id: user.user_id, username: user.username, display_name: user.display_name || user.username, email: user.email, role: user.role });

router.post('/register', [
  body('username').isString().trim().isLength({ min: 3, max: 50 }), emailRule(),
  body('password').isString().isLength({ min: 10, max: 72 }).custom(v => Buffer.byteLength(v) <= 72).withMessage('Use a password of 10 to 72 bytes.'),
  body('role').optional().equals('customer').withMessage('Staff accounts must be provisioned by an administrator.'),
  body('privacy_accepted').custom(v => v === true).withMessage('Please acknowledge the privacy notice.'),
], validate, async (req, res) => {
  const { username, email, password } = req.body;
  if (db.prepare('SELECT 1 FROM user WHERE email = ? COLLATE NOCASE OR username = ?').get(email, username)) return res.status(409).json({ error: 'Username or email already registered.' });
  const hash = await bcrypt.hash(password, 12);
  try {
    const info = db.prepare("INSERT INTO user (username, email, password_hash, role, privacy_accepted_at) VALUES (?, ?, ?, 'customer', datetime('now'))").run(username, email, hash);
    const user = db.prepare('SELECT * FROM user WHERE user_id = ?').get(info.lastInsertRowid);
    res.status(201).json({ ...publicUser(user), token: issueSession(res, user) });
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(409).json({ error: 'Username or email already registered.' });
    throw err;
  }
});

router.post('/login', [emailRule(), body('password').isString().isLength({ min: 1, max: 72 })], validate, async (req, res) => {
  const user = db.prepare('SELECT * FROM user WHERE email = ? COLLATE NOCASE AND is_active = 1').get(req.body.email);
  if (user?.locked_until && Date.parse(user.locked_until + 'Z') > Date.now()) return res.status(429).json({ error: 'Account locked. Try again in 15 minutes.' });
  if (!user || !(await bcrypt.compare(req.body.password, user.password_hash))) {
    if (user) {
      db.prepare(`UPDATE user SET failed_logins = CASE WHEN locked_until IS NOT NULL AND locked_until <= datetime('now') THEN 1 ELSE failed_logins + 1 END,
        locked_until = CASE WHEN (CASE WHEN locked_until IS NOT NULL AND locked_until <= datetime('now') THEN 1 ELSE failed_logins + 1 END) >= 5 THEN datetime('now', '+15 minutes') ELSE NULL END WHERE user_id = ?`).run(user.user_id);
    }
    return res.status(401).json({ error: 'Invalid email or password.' });
  }
  // Recheck after asynchronous bcrypt to respect concurrent lockout or account removal.
  const fresh = db.prepare('SELECT * FROM user WHERE user_id = ? AND is_active = 1').get(user.user_id);
  if (!fresh) return res.status(401).json({ error: 'Invalid email or password.' });
  if (fresh.locked_until && Date.parse(fresh.locked_until + 'Z') > Date.now()) return res.status(429).json({ error: 'Account locked. Try again in 15 minutes.' });
  db.prepare('UPDATE user SET failed_logins = 0, locked_until = NULL WHERE user_id = ?').run(user.user_id);
  res.json({ ...publicUser(fresh), token: issueSession(res, fresh) });
});

router.get('/me', requireAuth, (req, res) => res.json(publicUser(req.user)));
router.post('/logout', requireAuth, (req, res) => {
  db.prepare('UPDATE user SET token_version = token_version + 1 WHERE user_id = ?').run(req.user.user_id);
  res.clearCookie('smartdine_session', { path: '/' });
  res.json({ ok: true });
});
module.exports = router;

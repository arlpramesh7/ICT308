const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const db = require('../db');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();
const SALT_ROUNDS = 12; // matches "Bcrypt password hashing (cost factor 12)" in the security design

// FR1: Users must be able to register and log into the system
router.post(
  '/register',
  [
    body('username').isString().trim().isLength({ min: 3 }),
    body('email').isEmail(),
    body('password').isString().isLength({ min: 8 }),
    body('role').optional().isIn(['customer', 'staff', 'owner']),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { username, email, password, role } = req.body;
    const existing = db.prepare('SELECT user_id FROM user WHERE email = ? OR username = ?').get(email, username);
    if (existing) return res.status(409).json({ error: 'Username or email already registered' });

    const passwordHash = bcrypt.hashSync(password, SALT_ROUNDS);
    const info = db
      .prepare('INSERT INTO user (username, email, password_hash, role) VALUES (?, ?, ?, ?)')
      .run(username, email, passwordHash, role || 'customer');

    const token = jwt.sign({ user_id: info.lastInsertRowid, role: role || 'customer' }, JWT_SECRET, {
      expiresIn: '1h', // matches "JWT-based authentication with token expiry (1 hour)"
    });

    res.status(201).json({ token, user_id: info.lastInsertRowid, username, role: role || 'customer' });
  }
);

// Track failed login attempts in-memory for the prototype (per-email lockout after 5 attempts)
const failedAttempts = new Map();

router.post(
  '/login',
  [body('email').isEmail(), body('password').isString()],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, password } = req.body;
    const attempts = failedAttempts.get(email) || 0;
    if (attempts >= 5) {
      return res.status(429).json({ error: 'Account locked after 5 failed attempts. Try again later.' });
    }

    const user = db.prepare('SELECT * FROM user WHERE email = ? AND is_active = 1').get(email);
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      failedAttempts.set(email, attempts + 1);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    failedAttempts.delete(email);
    const token = jwt.sign({ user_id: user.user_id, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ token, user_id: user.user_id, username: user.username, role: user.role });
  }
);

module.exports = router;

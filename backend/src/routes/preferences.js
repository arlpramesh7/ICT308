const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// FR2: Users must be able to set food and dietary preferences
router.put(
  '/',
  requireAuth,
  [
    // express-validator's .optional() treats only `undefined` as absent by
    // default, so an explicit null -- which the client sends when the user
    // clears a preference -- was rejected with "Invalid value" even though the
    // handler below already coerces null correctly. { values: 'null' } makes
    // both undefined and null acceptable, so a preference can be cleared.
    body('cuisine_type').optional({ values: 'null' }).isString(),
    body('dietary_req').optional({ values: 'null' }).isString(),
    body('price_range').optional({ values: 'null' }).isString(),
    body('radius_km').optional({ values: 'null' }).isFloat({ min: 0.1, max: 50 }),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    // node:sqlite throws on `undefined` bind params (better-sqlite3 treated it as NULL) —
    // coerce any unset optional field to null explicitly.
    const cuisine_type = req.body.cuisine_type ?? null;
    const dietary_req = req.body.dietary_req ?? null;
    const price_range = req.body.price_range ?? null;
    const radius_km = req.body.radius_km || 5;
    const userId = req.user.user_id;

    const existing = db.prepare('SELECT pref_id FROM preference WHERE user_id = ?').get(userId);
    if (existing) {
      db.prepare(
        `UPDATE preference SET cuisine_type = ?, dietary_req = ?, price_range = ?, radius_km = ?
         WHERE user_id = ?`
      ).run(cuisine_type, dietary_req, price_range, radius_km, userId);
    } else {
      db.prepare(
        `INSERT INTO preference (user_id, cuisine_type, dietary_req, price_range, radius_km)
         VALUES (?, ?, ?, ?, ?)`
      ).run(userId, cuisine_type, dietary_req, price_range, radius_km);
    }

    const saved = db.prepare('SELECT * FROM preference WHERE user_id = ?').get(userId);
    res.json(saved);
  }
);

router.get('/', requireAuth, (req, res) => {
  const pref = db.prepare('SELECT * FROM preference WHERE user_id = ?').get(req.user.user_id);
  res.json(pref || null);
});

module.exports = router;

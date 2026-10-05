const express = require('express');
const { body } = require('express-validator');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const router = express.Router();
router.use(requireAuth, requireRole('customer'));
router.put('/', [
  body('cuisine_type').optional({ values: 'null' }).isIn(['Indian', 'Japanese', 'Italian', 'Vegetarian', 'Steak', 'Korean']),
  body('dietary_req').optional({ values: 'null' }).isIn(['vegetarian', 'vegan']),
  body('price_range').optional({ values: 'null' }).isIn(['$', '$$', '$$$', '$$$$']),
  body('radius_km').optional().custom(v => typeof v === 'number' && Number.isFinite(v) && v >= 0.1 && v <= 50),
], validate, (req, res) => {
  const b = req.body;
  db.prepare(`INSERT INTO preference (user_id, cuisine_type, dietary_req, price_range, radius_km) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET cuisine_type = excluded.cuisine_type, dietary_req = excluded.dietary_req, price_range = excluded.price_range, radius_km = excluded.radius_km`).run(req.user.user_id, b.cuisine_type ?? null, b.dietary_req ?? null, b.price_range ?? null, b.radius_km ?? 5);
  res.json(db.prepare('SELECT * FROM preference WHERE user_id = ?').get(req.user.user_id));
});
router.get('/', (req, res) => res.json(db.prepare('SELECT * FROM preference WHERE user_id = ?').get(req.user.user_id) || null));
module.exports = router;


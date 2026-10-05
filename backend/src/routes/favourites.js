const express = require('express');
const { param } = require('express-validator');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { presentRestaurant } = require('../services/catalogService');
const router = express.Router();
router.use(requireAuth, requireRole('customer'));
router.get('/', (req, res) => res.json(db.prepare('SELECT r.*, f.saved_at FROM favourite f JOIN restaurant r USING (restaurant_id) WHERE f.user_id = ? AND r.is_active = 1 ORDER BY f.saved_at DESC, r.restaurant_id').all(req.user.user_id).map(r => presentRestaurant(db, r))));
router.put('/:id', param('id').isInt({ min: 1 }), validate, (req, res) => {
  const id = Number(req.params.id);
  if (!db.prepare('SELECT 1 FROM restaurant WHERE restaurant_id = ? AND is_active = 1').get(id)) return res.status(404).json({ error: 'Restaurant not found.' });
  db.prepare('INSERT OR IGNORE INTO favourite (user_id,restaurant_id) VALUES (?,?)').run(req.user.user_id, id);
  res.json({ restaurant_id: id, saved: true });
});
router.delete('/:id', param('id').isInt({ min: 1 }), validate, (req, res) => {
  db.prepare('DELETE FROM favourite WHERE user_id = ? AND restaurant_id = ?').run(req.user.user_id, Number(req.params.id));
  res.json({ restaurant_id: Number(req.params.id), saved: false });
});
module.exports = router;

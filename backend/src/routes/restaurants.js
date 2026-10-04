const express = require('express');
const { body, param } = require('express-validator');
const db = require('../db');
const { requireAuth, requireRole, requireVenue } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { promotionActive } = require('../services/notificationService');
const router = express.Router();
const idRule = param('id').isInt({ min: 1 });
const boolean = field => body(field).optional().custom(v => typeof v === 'boolean');
const menuRules = optional => [
  body('item_name').optional({ values: optional ? 'undefined' : undefined }).custom(v => typeof v === 'string' && v.trim().length > 0 && v.trim().length <= 100),
  body('price').optional({ values: optional ? 'undefined' : undefined }).custom(v => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 9999 && Math.abs(Math.round(v * 100) - v * 100) < 0.00001),
  body('category').optional().isIn(['Main', 'Starter', 'Side', 'Dessert', 'Drink']),
  body('description').optional().isString().isLength({ max: 500 }),
  boolean('vegetarian'), boolean('vegan'), boolean('is_available'),
];
function audit(req, action, target) {
  db.prepare('INSERT INTO audit_event (user_id, restaurant_id, action, target_id) VALUES (?, ?, ?, ?)').run(req.user.user_id, Number(req.params.id), action, target || null);
}
function venueExists(req, res, next) {
  if (!db.prepare('SELECT 1 FROM restaurant WHERE restaurant_id = ? AND is_active = 1').get(Number(req.params.id))) return res.status(404).json({ error: 'Restaurant not found.' });
  next();
}
router.get('/', (req, res) => res.json(db.prepare('SELECT * FROM restaurant WHERE is_active = 1').all().map(r => ({ ...r, promotion_active: Number(promotionActive(r)) }))));
router.get('/managed', requireAuth, requireRole('staff', 'owner'), (req, res) => {
  res.json(db.prepare('SELECT r.* FROM restaurant r JOIN restaurant_member m USING (restaurant_id) WHERE m.user_id = ? AND r.is_active = 1').all(req.user.user_id));
});
router.get('/:id/menu', idRule, validate, venueExists, (req, res) => res.json(db.prepare('SELECT * FROM menu_item WHERE restaurant_id = ? AND is_available = 1 ORDER BY category, item_name').all(Number(req.params.id))));
router.get('/:id/manage', requireAuth, requireRole('staff', 'owner'), idRule, validate, requireVenue(), venueExists, (req, res) => {
  res.json({
    restaurant: db.prepare('SELECT * FROM restaurant WHERE restaurant_id = ?').get(Number(req.params.id)),
    menu: db.prepare('SELECT * FROM menu_item WHERE restaurant_id = ? ORDER BY category, item_name').all(Number(req.params.id)),
    audit: db.prepare('SELECT action, target_id, occurred_at FROM audit_event WHERE restaurant_id = ? ORDER BY event_id DESC LIMIT 10').all(Number(req.params.id)),
  });
});
router.post('/:id/menu', requireAuth, requireRole('staff', 'owner'), idRule, ...menuRules(false), validate, requireVenue(), venueExists, (req, res) => {
  const b = req.body;
  if (typeof b.item_name !== 'string' || typeof b.price !== 'number') return res.status(400).json({ error: 'Name and price are required.' });
  if (b.vegan && !b.vegetarian) return res.status(400).json({ error: 'Vegan items must also be vegetarian.' });
  const info = db.prepare('INSERT INTO menu_item (restaurant_id, item_name, price, category, description, vegetarian, vegan, is_available) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(Number(req.params.id), b.item_name.trim(), b.price, b.category || 'Main', b.description || '', Number(Boolean(b.vegetarian)), Number(Boolean(b.vegan)), Number(b.is_available !== false));
  audit(req, 'menu.create', Number(info.lastInsertRowid));
  res.status(201).json(db.prepare('SELECT * FROM menu_item WHERE item_id = ?').get(info.lastInsertRowid));
});
router.patch('/:id/menu/:itemId', requireAuth, requireRole('staff', 'owner'), idRule, param('itemId').isInt({ min: 1 }), ...menuRules(true), validate, requireVenue(), venueExists, (req, res) => {
  const item = db.prepare('SELECT * FROM menu_item WHERE item_id = ? AND restaurant_id = ?').get(Number(req.params.itemId), Number(req.params.id));
  if (!item) return res.status(404).json({ error: 'Menu item not found.' });
  const keys = ['item_name', 'price', 'category', 'description', 'vegetarian', 'vegan', 'is_available'];
  if (!keys.some(key => key in req.body)) return res.status(400).json({ error: 'No menu changes supplied.' });
  const updated = { ...item, ...Object.fromEntries(keys.filter(key => key in req.body).map(key => [key, req.body[key]])) };
  if (updated.vegan && !updated.vegetarian) return res.status(400).json({ error: 'Vegan items must also be vegetarian.' });
  db.prepare('UPDATE menu_item SET item_name = ?, price = ?, category = ?, description = ?, vegetarian = ?, vegan = ?, is_available = ? WHERE item_id = ?').run(updated.item_name.trim(), updated.price, updated.category, updated.description, Number(Boolean(updated.vegetarian)), Number(Boolean(updated.vegan)), Number(Boolean(updated.is_available)), item.item_id);
  audit(req, 'menu.update', item.item_id);
  res.json(db.prepare('SELECT * FROM menu_item WHERE item_id = ?').get(item.item_id));
});
router.delete('/:id/menu/:itemId', requireAuth, requireRole('staff', 'owner'), idRule, param('itemId').isInt({ min: 1 }), validate, requireVenue(), (req, res) => {
  const info = db.prepare('DELETE FROM menu_item WHERE item_id = ? AND restaurant_id = ?').run(Number(req.params.itemId), Number(req.params.id));
  if (!info.changes) return res.status(404).json({ error: 'Menu item not found.' });
  audit(req, 'menu.delete', Number(req.params.itemId));
  res.json({ ok: true });
});
router.patch('/:id/promotion', requireAuth, requireRole('staff', 'owner'), idRule,
  body('promotion_text').isString().trim().isLength({ max: 240 }),
  body('promotion_active').custom(v => typeof v === 'boolean'),
  body('promotion_start').optional({ values: 'null' }).isISO8601({ strict: true }),
  body('promotion_end').optional({ values: 'null' }).isISO8601({ strict: true }),
  validate, requireVenue(), venueExists, (req, res) => {
    const b = req.body;
    const start = b.promotion_start ? new Date(b.promotion_start).toISOString() : null;
    const end = b.promotion_end ? new Date(b.promotion_end).toISOString() : null;
    if ((start && end && start >= end) || (b.promotion_active && (!start || !end || !b.promotion_text))) return res.status(400).json({ error: 'An active offer needs text and an end time after its start time.' });
    db.prepare('UPDATE restaurant SET promotion_text = ?, promotion_active = ?, promotion_start = ?, promotion_end = ? WHERE restaurant_id = ?').run(b.promotion_text, Number(b.promotion_active), start, end, Number(req.params.id));
    audit(req, 'promotion.update');
    res.json(db.prepare('SELECT * FROM restaurant WHERE restaurant_id = ?').get(Number(req.params.id)));
  });
module.exports = router;


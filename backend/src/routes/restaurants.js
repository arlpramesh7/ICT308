const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM restaurant WHERE is_active = 1').all());
});

router.get('/:id/menu', (req, res) => {
  const menu = db
    .prepare('SELECT * FROM menu_item WHERE restaurant_id = ? AND is_available = 1')
    .all(req.params.id);
  res.json(menu);
});

// FR8: Restaurant staff must be able to update menu, promotions, and availability
router.post(
  '/:id/menu',
  requireAuth,
  requireRole('staff', 'owner'),
  [body('item_name').isString().notEmpty(), body('price').isFloat({ min: 0 }), body('category').optional().isString()],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { item_name, price, category } = req.body;
    const info = db
      .prepare('INSERT INTO menu_item (restaurant_id, item_name, price, category) VALUES (?, ?, ?, ?)')
      .run(req.params.id, item_name, price, category || null);
    res.status(201).json({ item_id: info.lastInsertRowid, item_name, price, category });
  }
);

router.patch(
  '/:id/menu/:itemId',
  requireAuth,
  requireRole('staff', 'owner'),
  [
    body('price').optional().isFloat({ min: 0 }),
    body('is_available').optional().isBoolean(),
    body('item_name').optional().isString(),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const item = db.prepare('SELECT * FROM menu_item WHERE item_id = ? AND restaurant_id = ?').get(
      req.params.itemId,
      req.params.id
    );
    if (!item) return res.status(404).json({ error: 'Menu item not found' });

    const updated = { ...item, ...req.body };
    db.prepare(
      'UPDATE menu_item SET item_name = ?, price = ?, category = ?, is_available = ? WHERE item_id = ?'
    ).run(updated.item_name, updated.price, updated.category, updated.is_available ? 1 : 0, item.item_id);

    res.json(db.prepare('SELECT * FROM menu_item WHERE item_id = ?').get(item.item_id));
  }
);

module.exports = router;

const express = require('express');
const { body, param } = require('express-validator');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { cartFor, transaction } = require('../services/orderService');
const router = express.Router();
router.use(requireAuth, requireRole('customer'));
const quantityRule = body('quantity').custom(v => Number.isSafeInteger(v) && v >= 1 && v <= 20);
function save(req, res, increment) {
  const itemId = Number(increment ? req.body.item_id : req.params.id), userId = req.user.user_id;
  try {
    const cart = transaction(() => {
      const item = db.prepare('SELECT m.*,r.is_active FROM menu_item m JOIN restaurant r USING(restaurant_id) WHERE m.item_id = ?').get(itemId);
      if (!item) throw Object.assign(new Error('Menu item not found.'), { status: 404 });
      if (!item.is_available || !item.is_active) throw Object.assign(new Error('This item is currently unavailable.'), { status: 409 });
      const cart = cartFor(userId);
      if (cart.restaurant && cart.restaurant.restaurant_id !== item.restaurant_id) throw Object.assign(new Error('Your cart contains items from another restaurant. Clear it before switching restaurants.'), { status: 409 });
      const old = cart.items.find(i => i.item_id === itemId)?.quantity || 0;
      const quantity = increment ? old + req.body.quantity : req.body.quantity;
      if (quantity > 20 || cart.item_count - old + quantity > 50) throw Object.assign(new Error('Maximum 20 per item and 50 items per order.'), { status: 400 });
      db.prepare('INSERT INTO cart_item (user_id,item_id,quantity) VALUES (?,?,?) ON CONFLICT(user_id,item_id) DO UPDATE SET quantity=excluded.quantity').run(userId, itemId, quantity);
      return cartFor(userId);
    });
    res.json(cart);
  } catch (error) { if (error.status) return res.status(error.status).json({ error: error.message }); throw error; }
}
router.get('/', (req, res) => res.json(cartFor(req.user.user_id)));
router.post('/items', body('item_id').custom(v => Number.isSafeInteger(v) && v > 0), quantityRule, validate, (req, res) => save(req, res, true));
router.put('/items/:id', param('id').isInt({ min: 1 }), quantityRule, validate, (req, res) => save(req, res, false));
router.delete('/items/:id', param('id').isInt({ min: 1 }), validate, (req, res) => { db.prepare('DELETE FROM cart_item WHERE user_id = ? AND item_id = ?').run(req.user.user_id, Number(req.params.id)); res.json(cartFor(req.user.user_id)); });
router.delete('/', (req, res) => { db.prepare('DELETE FROM cart_item WHERE user_id = ?').run(req.user.user_id); res.json(cartFor(req.user.user_id)); });
module.exports = router;

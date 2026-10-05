const express = require('express');
const { body, param, query } = require('express-validator');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { placeOrder, orderDetails, transaction } = require('../services/orderService');
const { validPhone } = require('../services/phoneValidation');
const router = express.Router();
router.use(requireAuth);
router.post('/', requireRole('customer'),
  body('customer_name').isString().trim().isLength({ min: 2, max: 80 }),
  body('contact_phone').optional().custom(validPhone).withMessage('Enter a valid phone number or leave this field blank.'),
  body('pickup_notes').optional().isString().isLength({ max: 500 }),
  body('fulfilment').custom(v => v === 'pickup'), body('cart_revision').isString().matches(/^[a-f0-9]{64}$/), body('idempotency_key').isString().isUUID(), validate,
  (req, res) => { try { const result = placeOrder(req.user.user_id, req.body); res.status(result.created ? 201 : 200).json(result.order); } catch (error) { if (error.status) return res.status(error.status).json({ error: error.message }); throw error; } });
router.get('/', requireRole('customer'), (req, res) => res.json(db.prepare('SELECT * FROM customer_order WHERE user_id = ? ORDER BY order_id DESC').all(req.user.user_id).map(orderDetails)));
router.get('/managed', requireRole('staff', 'owner'), query('restaurant_id').isInt({ min: 1 }), validate, (req, res) => {
  const id = Number(req.query.restaurant_id);
  if (!db.prepare('SELECT 1 FROM restaurant_member WHERE user_id = ? AND restaurant_id = ?').get(req.user.user_id, id)) return res.status(403).json({ error: 'This restaurant is not assigned to your account.' });
  res.json(db.prepare('SELECT * FROM customer_order WHERE restaurant_id = ? ORDER BY order_id DESC LIMIT 100').all(id).map(orderDetails));
});
router.get('/:id', requireRole('customer'), param('id').isInt({ min: 1 }), validate, (req, res) => {
  const order = db.prepare('SELECT * FROM customer_order WHERE order_id = ? AND user_id = ?').get(Number(req.params.id), req.user.user_id);
  if (!order) return res.status(404).json({ error: 'Order not found.' });
  res.json(orderDetails(order));
});
router.patch('/:id/status', requireRole('staff', 'owner'), param('id').isInt({ min: 1 }), body('status').isIn(['Confirmed', 'Preparing', 'Ready', 'Completed']), validate, (req, res) => {
  try {
    const order = transaction(() => {
      const order = db.prepare('SELECT * FROM customer_order WHERE order_id = ?').get(Number(req.params.id));
      if (!order) throw Object.assign(new Error('Order not found.'), { status: 404 });
      if (!db.prepare('SELECT 1 FROM restaurant_member WHERE user_id = ? AND restaurant_id = ?').get(req.user.user_id, order.restaurant_id)) throw Object.assign(new Error('This restaurant is not assigned to your account.'), { status: 403 });
      const next = { Placed: 'Confirmed', Confirmed: 'Preparing', Preparing: 'Ready', Ready: 'Completed' }[order.status];
      if (next !== req.body.status) throw Object.assign(new Error('Order status changed. Refresh and use the next available status.'), { status: 409 });
      db.prepare("UPDATE customer_order SET status = ?, updated_at = datetime('now') WHERE order_id = ?").run(next, order.order_id);
      db.prepare('INSERT INTO audit_event (user_id,restaurant_id,action,target_id) VALUES (?,?,?,?)').run(req.user.user_id, order.restaurant_id, 'order.' + next.toLowerCase(), order.order_id);
      return orderDetails(db.prepare('SELECT * FROM customer_order WHERE order_id = ?').get(order.order_id));
    }); res.json(order);
  } catch (error) { if (error.status) return res.status(error.status).json({ error: error.message }); throw error; }
});
module.exports = router;

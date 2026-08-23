/**
 * Restaurant owner analytics (FR10).
 *
 * Access is restricted to the staff and owner roles: engagement data is
 * commercially sensitive and, although it is aggregated, it should not be
 * readable by customers.
 */
const express = require('express');
const { param, validationResult } = require('express-validator');
const { requireAuth, requireRole } = require('../middleware/auth');
const { dashboard } = require('../services/analyticsService');

const router = express.Router();

// FR10: the owner should be able to view analytics (visits, engagement).
router.get(
  '/restaurants/:restaurantId',
  requireAuth,
  requireRole('staff', 'owner'),
  [param('restaurantId').isInt({ min: 1 })],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const result = dashboard(Number(req.params.restaurantId));
    if (!result) return res.status(404).json({ error: 'Restaurant not found' });
    res.json(result);
  }
);

module.exports = router;

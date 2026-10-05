/**
 * Customer feedback and ratings (FR9).
 *
 * The feedback table existed in the Iteration 1 schema but had no endpoints,
 * so the rating loop described in the design report was not closed: customers
 * could not rate a venue, and the recommendation engine had no rating signal
 * to use. These routes close that loop, and the scoring service consumes the
 * aggregate they produce.
 */
const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { ratingsByRestaurant } = require('../services/analyticsService');

const router = express.Router();

// FR9: submit a rating and optional comment for a venue.
router.post(
  '/:restaurantId',
  requireAuth,
  requireRole('customer'),
  [
    param('restaurantId').isInt({ min: 1 }),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be a whole number from 1 to 5'),
    body('comment').optional({ nullable: true }).isString().isLength({ max: 500 }),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const restaurantId = Number(req.params.restaurantId);
    const restaurant = db
      .prepare('SELECT restaurant_id FROM restaurant WHERE restaurant_id = ? AND is_active = 1')
      .get(restaurantId);
    if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' });

    // node:sqlite throws on `undefined` bind parameters, so an absent optional
    // comment is coerced to null explicitly (same class of defect fixed in
    // preferences.js during Iteration 1).
    const comment = req.body.comment ?? null;

    const existing = db.prepare('SELECT feedback_id FROM feedback WHERE user_id = ? AND restaurant_id = ? ORDER BY feedback_id DESC LIMIT 1').get(req.user.user_id, restaurantId);
    let feedbackId;
    if (existing) {
      db.prepare("UPDATE feedback SET rating = ?, comment = ?, submitted_at = datetime('now') WHERE feedback_id = ?").run(Number(req.body.rating), comment, existing.feedback_id);
      feedbackId = existing.feedback_id;
    } else {
    const info = db
      .prepare('INSERT INTO feedback (user_id, restaurant_id, rating, comment) VALUES (?, ?, ?, ?)')
      .run(req.user.user_id, restaurantId, req.body.rating, comment);
      feedbackId = Number(info.lastInsertRowid);
    }

    const aggregate = ratingsByRestaurant().get(restaurantId);

    res.status(existing ? 200 : 201).json({
      feedback_id: feedbackId,
      restaurant_id: restaurantId,
      rating: req.body.rating,
      comment,
      restaurant_average: aggregate ? Number(aggregate.average.toFixed(2)) : null,
      restaurant_rating_count: aggregate ? aggregate.count : 0,
    });
  }
);

// Public: read the ratings for a venue.
router.get('/:restaurantId', [param('restaurantId').isInt({ min: 1 }), query('page').optional().isInt({ min: 1, max: 100000 }), query('page_size').optional().isInt({ min: 1, max: 50 })], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const restaurantId = Number(req.params.restaurantId);
  if (!db.prepare('SELECT 1 FROM restaurant WHERE restaurant_id = ? AND is_active = 1').get(restaurantId)) return res.status(404).json({ error: 'Restaurant not found.' });
  const aggregate = ratingsByRestaurant().get(restaurantId);
  const page = Number(req.query.page || 1), pageSize = Number(req.query.page_size || 20);

  res.json({
    restaurant_id: restaurantId,
    average_rating: aggregate ? Number(aggregate.average.toFixed(2)) : null,
    rating_count: aggregate ? aggregate.count : 0,
    page,
    page_size: pageSize,
    has_next: page * pageSize < (aggregate?.count || 0),
    reviews: db
      .prepare(
        `SELECT f.feedback_id, f.rating, f.comment, f.submitted_at
         FROM current_feedback f
         WHERE f.restaurant_id = ? ORDER BY f.submitted_at DESC, f.feedback_id DESC LIMIT ? OFFSET ?`
      )
      .all(restaurantId, pageSize, (page - 1) * pageSize),
  });
});

router.get('/:restaurantId/mine', requireAuth, requireRole('customer'), param('restaurantId').isInt({ min: 1 }), (req, res) => {
  if (!validationResult(req).isEmpty()) return res.status(400).json({ error: 'Invalid restaurant.' });
  res.json(db.prepare('SELECT rating, comment FROM current_feedback WHERE user_id = ? AND restaurant_id = ?').get(req.user.user_id, Number(req.params.restaurantId)) || null);
});

// The customer's own submitted ratings.
router.get('/', requireAuth, (req, res) => {
  res.json(
    db
      .prepare(
        `SELECT f.feedback_id, f.rating, f.comment, f.submitted_at, r.name AS restaurant_name
         FROM feedback f JOIN restaurant r ON r.restaurant_id = f.restaurant_id
         WHERE f.user_id = ? ORDER BY f.feedback_id DESC`
      )
      .all(req.user.user_id)
  );
});

module.exports = router;

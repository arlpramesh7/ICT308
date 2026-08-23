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
const { body, param, validationResult } = require('express-validator');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { ratingsByRestaurant } = require('../services/analyticsService');

const router = express.Router();

// FR9: submit a rating and optional comment for a venue.
router.post(
  '/:restaurantId',
  requireAuth,
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

    const info = db
      .prepare('INSERT INTO feedback (user_id, restaurant_id, rating, comment) VALUES (?, ?, ?, ?)')
      .run(req.user.user_id, restaurantId, req.body.rating, comment);

    const aggregate = ratingsByRestaurant().get(restaurantId);

    res.status(201).json({
      feedback_id: Number(info.lastInsertRowid),
      restaurant_id: restaurantId,
      rating: req.body.rating,
      comment,
      restaurant_average: aggregate ? Number(aggregate.average.toFixed(2)) : null,
      restaurant_rating_count: aggregate ? aggregate.count : 0,
    });
  }
);

// Public: read the ratings for a venue.
router.get('/:restaurantId', [param('restaurantId').isInt({ min: 1 })], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const restaurantId = Number(req.params.restaurantId);
  const aggregate = ratingsByRestaurant().get(restaurantId);

  res.json({
    restaurant_id: restaurantId,
    average_rating: aggregate ? Number(aggregate.average.toFixed(2)) : null,
    rating_count: aggregate ? aggregate.count : 0,
    reviews: db
      .prepare(
        `SELECT f.rating, f.comment, f.submitted_at, u.username
         FROM feedback f JOIN user u ON u.user_id = f.user_id
         WHERE f.restaurant_id = ? ORDER BY f.feedback_id DESC LIMIT 20`
      )
      .all(restaurantId),
  });
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

const express = require('express');
const { body, param, validationResult } = require('express-validator');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { distanceMetres } = require('../utils/geo');
const { scoreRestaurant } = require('../services/scoringService');
const { ratingsByRestaurant } = require('../services/analyticsService');

const router = express.Router();

/**
 * Cooldown between two geofence notifications for the same customer and venue.
 *
 * Iteration 1 inserted a notification row on every location update while the
 * customer was inside the fence. A customer sitting at a desk within 200 m of
 * the venue would therefore accumulate a notification per GPS ping, which is
 * both a poor user experience and the fastest way to have an app uninstalled.
 * Thirty minutes is shorter than a typical lunch decision window but long
 * enough that lingering nearby is not punished.
 */
const NOTIFICATION_COOLDOWN_MINUTES = 30;

/**
 * Window within which repeated location updates do not create duplicate
 * recommendation impressions.
 *
 * The FR10 analytics measure how often a venue was surfaced to a customer.
 * Recording a fresh impression on every ping inflated that count without any
 * new customer intent behind it, making the engagement rate meaningless.
 */
const IMPRESSION_DEDUPE_MINUTES = 10;

// FR3 + FR4 + FR5 + FR6 + FR7: submit GPS location, evaluate geofences,
// generate ranked recommendations, and notify on promotions in range.
router.post(
  '/update',
  requireAuth,
  [body('latitude').isFloat({ min: -90, max: 90 }), body('longitude').isFloat({ min: -180, max: 180 })],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { latitude, longitude } = req.body;
    const userId = req.user.user_id;

    const preference = db.prepare('SELECT * FROM preference WHERE user_id = ?').get(userId);
    const restaurants = db.prepare('SELECT * FROM restaurant WHERE is_active = 1').all();
    const ratings = ratingsByRestaurant(); // FR9 feeds back into FR5

    const radiusKm = preference?.radius_km || 5;

    const recentNotification = db.prepare(
      `SELECT 1 FROM notification
       WHERE user_id = ? AND restaurant_id = ? AND sent_at > datetime('now', ?)
       LIMIT 1`
    );
    const recentImpression = db.prepare(
      `SELECT 1 FROM recommendation
       WHERE user_id = ? AND restaurant_id = ? AND timestamp > datetime('now', ?)
       LIMIT 1`
    );
    const insertNotification = db.prepare(
      'INSERT INTO notification (user_id, restaurant_id, message) VALUES (?, ?, ?)'
    );
    const insertRecommendation = db.prepare(
      'INSERT INTO recommendation (user_id, restaurant_id, score) VALUES (?, ?, ?)'
    );

    const results = [];
    const excluded = [];

    for (const r of restaurants) {
      const distance = distanceMetres(latitude, longitude, r.latitude, r.longitude);
      const withinGeofence = distance <= r.geofence_radius;                 // FR4
      const withinDiscoveryRadius = distance <= radiusKm * 1000;

      // FR5. Returns null when the customer's dietary requirement rules the
      // venue out entirely, rather than ranking it low -- surfacing a venue
      // that cannot feed the customer is a failure, not a weak match.
      const scored = scoreRestaurant(
        distance, radiusKm, r, preference, ratings.get(r.restaurant_id) || {}
      );

      if (scored === null) {
        excluded.push({
          restaurant_id: r.restaurant_id,
          name: r.name,
          reason: `Does not meet dietary requirement: ${preference.dietary_req}`,
        });
        continue;
      }

      // FR7: notify on an active promotion inside the fence, subject to cooldown.
      let notification = null;
      if (withinGeofence && r.promotion_active && r.promotion_text) {
        const suppressed = recentNotification.get(
          userId, r.restaurant_id, `-${NOTIFICATION_COOLDOWN_MINUTES} minutes`
        );
        if (!suppressed) {
          const message = `You're ${Math.round(distance)} m from ${r.name} — ${r.promotion_text}`;
          const info = insertNotification.run(userId, r.restaurant_id, message);
          notification = { notif_id: Number(info.lastInsertRowid), message };
        }
      }

      // Record the impression for the FR10 analytics, deduplicated.
      if (withinDiscoveryRadius) {
        const alreadyCounted = recentImpression.get(
          userId, r.restaurant_id, `-${IMPRESSION_DEDUPE_MINUTES} minutes`
        );
        if (!alreadyCounted) {
          insertRecommendation.run(userId, r.restaurant_id, scored.score);
        }
      }

      results.push({
        restaurant_id: r.restaurant_id,
        name: r.name,
        cuisine_type: r.cuisine_type,
        price_range: r.price_range,
        distance_metres: Math.round(distance),
        walk_minutes: Math.max(1, Math.round(distance / (5000 / 60))),
        within_geofence: withinGeofence,
        within_discovery_radius: withinDiscoveryRadius,
        recommendation_score: withinDiscoveryRadius ? scored.score : null,
        // Per-term contributions, so the interface can explain the ranking
        // rather than presenting an unexplained number. This supports the
        // algorithmic transparency commitment in the design report.
        score_breakdown: withinDiscoveryRadius ? scored.breakdown : null,
        promotion: r.promotion_active ? r.promotion_text : null,
        average_rating: ratings.get(r.restaurant_id)
          ? Number(ratings.get(r.restaurant_id).average.toFixed(1))
          : null,
        notification,
        // FR6: coordinates for the client map view, plus a directions link.
        directions: {
          latitude: r.latitude,
          longitude: r.longitude,
          address: r.address,
          maps_url: `https://www.google.com/maps/dir/?api=1&origin=${latitude},${longitude}&destination=${r.latitude},${r.longitude}&travelmode=walking`,
        },
      });
    }

    results.sort((a, b) => (b.recommendation_score ?? -1) - (a.recommendation_score ?? -1));

    res.json({
      recommendations: results,
      // Reported rather than silently dropped, so the exclusion is visible and
      // auditable during the demonstration.
      excluded_for_dietary_requirements: excluded,
    });
  }
);

/**
 * Mark a recommendation as opened by the customer (FR10).
 *
 * Without this the is_viewed column was never set, so the engagement rate on
 * the owner dashboard was always zero. The client calls this when a customer
 * opens a venue from the recommendation list.
 */
router.post(
  '/recommendations/:restaurantId/viewed',
  requireAuth,
  [param('restaurantId').isInt({ min: 1 })],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const info = db
      .prepare(
        `UPDATE recommendation SET is_viewed = 1
         WHERE rec_id = (
           SELECT rec_id FROM recommendation
           WHERE user_id = ? AND restaurant_id = ?
           ORDER BY rec_id DESC LIMIT 1)`
      )
      .run(req.user.user_id, Number(req.params.restaurantId));

    if (info.changes === 0) {
      return res.status(404).json({ error: 'No recommendation found for this restaurant' });
    }
    res.json({ restaurant_id: Number(req.params.restaurantId), is_viewed: true });
  }
);

router.get('/notifications', requireAuth, (req, res) => {
  const notifications = db
    .prepare(
      `SELECT n.*, r.name AS restaurant_name
       FROM notification n JOIN restaurant r ON r.restaurant_id = n.restaurant_id
       WHERE n.user_id = ? ORDER BY n.sent_at DESC`
    )
    .all(req.user.user_id);
  res.json(notifications);
});

router.patch(
  '/notifications/:notifId/read',
  requireAuth,
  [param('notifId').isInt({ min: 1 })],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    db.prepare('UPDATE notification SET is_read = 1 WHERE notif_id = ? AND user_id = ?')
      .run(Number(req.params.notifId), req.user.user_id);
    res.json({ notif_id: Number(req.params.notifId), is_read: true });
  }
);

module.exports = router;

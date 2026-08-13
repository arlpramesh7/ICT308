const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { distanceMetres, scoreRestaurant } = require('../utils/geo');

const router = express.Router();

// FR3 + FR4 + FR5 + FR7: submit GPS location, trigger geofencing,
// generate a scored recommendation, and send a notification when in range.
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

    const results = restaurants.map((r) => {
      const distance = distanceMetres(latitude, longitude, r.latitude, r.longitude);
      const withinGeofence = distance <= r.geofence_radius; // FR4
      const withinDiscoveryRadius = distance <= (preference?.radius_km || 5) * 1000;
      const score = scoreRestaurant(distance, preference?.radius_km || 5, r, preference); // FR5

      let notification = null;
      if (withinGeofence) {
        // FR7: push notification when within geofence range
        const message = `You're near ${r.name}! Check out today's offers.`;
        const info = db
          .prepare('INSERT INTO notification (user_id, restaurant_id, message) VALUES (?, ?, ?)')
          .run(userId, r.restaurant_id, message);
        notification = { notif_id: info.lastInsertRowid, message };
      }

      if (withinDiscoveryRadius) {
        db.prepare(
          'INSERT INTO recommendation (user_id, restaurant_id, score) VALUES (?, ?, ?)'
        ).run(userId, r.restaurant_id, score);
      }

      return {
        restaurant_id: r.restaurant_id,
        name: r.name,
        distance_metres: Math.round(distance),
        within_geofence: withinGeofence,
        within_discovery_radius: withinDiscoveryRadius,
        recommendation_score: withinDiscoveryRadius ? score : null,
        notification,
        // FR6: directions data for the client map view
        directions: { latitude: r.latitude, longitude: r.longitude, address: r.address },
      };
    });

    results.sort((a, b) => (b.recommendation_score || -1) - (a.recommendation_score || -1));
    res.json({ recommendations: results });
  }
);

router.get('/notifications', requireAuth, (req, res) => {
  const notifications = db
    .prepare('SELECT * FROM notification WHERE user_id = ? ORDER BY sent_at DESC')
    .all(req.user.user_id);
  res.json(notifications);
});

module.exports = router;

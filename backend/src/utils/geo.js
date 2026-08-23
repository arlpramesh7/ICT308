/**
 * Geospatial helpers.
 *
 * This module deliberately contains only distance mathematics. The
 * recommendation scoring that previously lived here moved to
 * src/services/scoringService.js during Iteration 1, so that geometry and
 * business policy are not mixed in one file: distance is a fact about the
 * world, whereas how much proximity should matter relative to cuisine or
 * rating is a product decision that changes independently and needs its own
 * tests.
 */

// Haversine formula: great-circle distance between two lat/lng points, in metres.
// At Sydney CBD scale the error from modelling the Earth as a sphere rather
// than an ellipsoid is well under a metre, so Vincenty's formulae are not
// justified here.
function distanceMetres(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/** Geofence test (FR4): is the position inside the venue's trigger radius? */
function isWithinGeofence(lat, lon, restaurant) {
  return distanceMetres(lat, lon, restaurant.latitude, restaurant.longitude) <= restaurant.geofence_radius;
}

/** Estimated walking time in minutes at 5 km/h. */
function walkingMinutes(distance) {
  return Math.max(1, Math.round(distance / (5000 / 60)));
}

module.exports = { distanceMetres, isWithinGeofence, walkingMinutes };

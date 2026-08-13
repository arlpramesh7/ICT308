// Haversine formula: great-circle distance between two lat/lng points, in metres.
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

// Recommendation score: closer distance + matching preferences = higher score (0-100).
// Weighting: 60% proximity, 25% cuisine match, 15% price match. Implements FR5,
// prioritised per the requirements analysis (proximity + preferences drive recommendations).
function scoreRestaurant(distance, radiusKm, restaurant, preference) {
  const maxDistance = radiusKm * 1000;
  const proximityScore = Math.max(0, 1 - distance / maxDistance) * 60;

  let cuisineScore = 0;
  if (preference?.cuisine_type && restaurant.cuisine_type) {
    cuisineScore = preference.cuisine_type.toLowerCase() === restaurant.cuisine_type.toLowerCase() ? 25 : 5;
  } else {
    cuisineScore = 15; // no preference set — neutral score
  }

  let priceScore = 0;
  if (preference?.price_range && restaurant.price_range) {
    priceScore = preference.price_range === restaurant.price_range ? 15 : 5;
  } else {
    priceScore = 10;
  }

  return Math.round(proximityScore + cuisineScore + priceScore);
}

module.exports = { distanceMetres, scoreRestaurant };

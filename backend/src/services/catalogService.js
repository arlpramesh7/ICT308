const { promotionActive } = require('./promotion');

function openingState(restaurant, now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-AU', { timeZone: 'Australia/Sydney', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now);
  const minute = Number(parts.find(p => p.type === 'hour').value) * 60 + Number(parts.find(p => p.type === 'minute').value);
  const open = restaurant.open_minute ?? 660, close = restaurant.close_minute ?? 1320;
  return Boolean(restaurant.is_active && (open <= close ? minute >= open && minute < close : minute >= open || minute < close));
}

function presentRestaurant(db, restaurant) {
  const rating = db.prepare('SELECT AVG(rating) AS average, COUNT(*) AS count FROM current_feedback WHERE restaurant_id = ?').get(restaurant.restaurant_id);
  return { ...restaurant, promotion_active: Number(promotionActive(restaurant)), average_rating: rating.average === null ? null : Number(rating.average.toFixed(1)), rating_count: rating.count, is_open: openingState(restaurant), fulfilment: 'pickup' };
}

module.exports = { openingState, presentRestaurant };

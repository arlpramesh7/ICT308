function promotionActive(restaurant, now = Date.now()) {
  return Boolean(restaurant.promotion_active && restaurant.promotion_text &&
    (!restaurant.promotion_start || Date.parse(restaurant.promotion_start) <= now) &&
    (!restaurant.promotion_end || Date.parse(restaurant.promotion_end) > now));
}
module.exports = { promotionActive };

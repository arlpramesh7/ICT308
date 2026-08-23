/**
 * Owner analytics service (FR10).
 *
 * Aggregates data the rest of the system already writes -- recommendation
 * impressions and customer feedback -- so the dashboard introduces no new
 * collection. That matters for the privacy position in section 7.1 of the
 * design report: the owner sees engagement in aggregate and never sees an
 * individual customer's location or identity.
 *
 * Kept separate from the route handler so the aggregation can be reasoned
 * about, and tested, without Express in the way.
 */
const db = require('../db');

/**
 * Mean rating and rating count per venue, keyed by restaurant_id.
 * Used both by the dashboard and by the rating term of the scoring service.
 */
function ratingsByRestaurant() {
  const rows = db
    .prepare(
      `SELECT restaurant_id, AVG(rating) AS average, COUNT(*) AS count
       FROM feedback GROUP BY restaurant_id`
    )
    .all();
  const map = new Map();
  for (const row of rows) {
    map.set(row.restaurant_id, { average: row.average, count: row.count });
  }
  return map;
}

/** Aggregate metrics for one venue. */
function dashboard(restaurantId) {
  const restaurant = db
    .prepare('SELECT * FROM restaurant WHERE restaurant_id = ?')
    .get(restaurantId);
  if (!restaurant) return null;

  const impressions = db
    .prepare(
      `SELECT COUNT(*) AS total,
              SUM(is_viewed) AS viewed,
              COUNT(DISTINCT user_id) AS unique_users,
              AVG(score) AS average_score
       FROM recommendation WHERE restaurant_id = ?`
    )
    .get(restaurantId);

  const ratings = ratingsByRestaurant().get(restaurantId);
  const total = impressions.total || 0;
  const viewed = impressions.viewed || 0;

  return {
    restaurant: {
      restaurant_id: restaurant.restaurant_id,
      name: restaurant.name,
      cuisine_type: restaurant.cuisine_type,
      promotion_active: Boolean(restaurant.promotion_active),
      promotion_text: restaurant.promotion_text,
    },
    metrics: {
      // How many times the venue was surfaced to a customer.
      impressions: total,
      // How many of those the customer actually opened.
      views: viewed,
      unique_users: impressions.unique_users || 0,
      // The headline number for the owner: the share of times being surfaced
      // that converted into the customer looking at the venue.
      engagement_rate: total > 0 ? Number((viewed / total).toFixed(3)) : 0,
      average_relevance_score: impressions.average_score
        ? Number(impressions.average_score.toFixed(1))
        : 0,
      average_rating: ratings ? Number(ratings.average.toFixed(2)) : null,
      rating_count: ratings ? ratings.count : 0,
      menu_items: db
        .prepare('SELECT COUNT(*) AS c FROM menu_item WHERE restaurant_id = ? AND is_available = 1')
        .get(restaurantId).c,
      notifications_sent: db
        .prepare('SELECT COUNT(*) AS c FROM notification WHERE restaurant_id = ?')
        .get(restaurantId).c,
    },
    // Impressions bucketed by hour of day -- the "peaks of activity" chart
    // described in section 3.4 of the design report.
    hourly_activity: db
      .prepare(
        `SELECT strftime('%H', timestamp) AS hour, COUNT(*) AS count
         FROM recommendation WHERE restaurant_id = ?
         GROUP BY hour ORDER BY hour`
      )
      .all(restaurantId),
    rating_distribution: db
      .prepare(
        `SELECT rating, COUNT(*) AS count FROM feedback
         WHERE restaurant_id = ? GROUP BY rating ORDER BY rating`
      )
      .all(restaurantId),
    recent_feedback: db
      .prepare(
        `SELECT f.rating, f.comment, f.submitted_at, u.username
         FROM feedback f JOIN user u ON u.user_id = f.user_id
         WHERE f.restaurant_id = ? ORDER BY f.feedback_id DESC LIMIT 8`
      )
      .all(restaurantId),
  };
}

module.exports = { dashboard, ratingsByRestaurant };

/**
 * Recommendation scoring service (FR5).
 *
 * Extracted from utils/geo.js into its own service during Iteration 1 so the
 * scoring model can be unit tested without starting the Express application or
 * touching the database. Every function here is pure: it takes plain objects
 * and returns a number, which is what makes tests/scoring.test.js possible.
 *
 * WHY A WEIGHTED LINEAR MODEL RATHER THAN MACHINE LEARNING
 * --------------------------------------------------------
 * The design report lists ML-based recommendation as future work. It is not
 * appropriate for Iteration 1 for three reasons:
 *   1. Cold start -- the pilot has one partner venue and no interaction
 *      history, so a collaborative model has nothing to learn from.
 *   2. Explainability -- every score decomposes into named contributions, so
 *      the app can tell a user why a venue was suggested and the owner can see
 *      why theirs ranked where it did.
 *   3. Auditability -- section 7.1 of the design report commits to algorithmic
 *      fairness, with visibility determined only by proximity, preference match
 *      and rating. Fixed, inspectable weights make that commitment checkable;
 *      a learned model would not.
 *
 * WHAT CHANGED FROM THE PREVIOUS MODEL
 * ------------------------------------
 * The Iteration 1 scoring in utils/geo.js weighted proximity (60), cuisine (25)
 * and price (15). It had two defects this service fixes:
 *   - dietary_req was captured by FR2 but never used, so a customer who set a
 *     vegetarian requirement was still recommended venues that could not feed
 *     them. Dietary requirements are now a hard exclusion, not a weak signal.
 *   - customer ratings (FR9) had no influence, so the feedback loop described
 *     in the design report did not exist.
 *
 * The score remains on a 0-100 scale so the existing frontend match bar and
 * any stored recommendation rows stay comparable.
 */

/** Weights out of 100. Asserted below so an edit cannot silently rescale. */
const WEIGHTS = Object.freeze({
  proximity: 35,
  cuisine: 20,
  dietary: 15,
  price: 10,
  rating: 15,
  promotion: 5,
});

const TOTAL_WEIGHT = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);
if (TOTAL_WEIGHT !== 100) {
  throw new Error(`Scoring weights must total 100, got ${TOTAL_WEIGHT}`);
}

/** Dietary requirements that exclude a venue which is not vegetarian friendly. */
const PLANT_BASED = ['vegetarian', 'vegan'];

/**
 * Proximity term, 0..1.
 *
 * Linear decay from 1 at the customer's position to 0 at the edge of their
 * discovery radius. Linear rather than exponential because it is intuitive to
 * explain and, across the one-to-two kilometre range of a CBD lunch decision,
 * ranks candidates almost identically to an exponential curve.
 */
function proximityTerm(distanceMetres, radiusKm) {
  const maxDistance = Math.max(1, radiusKm * 1000);
  return Math.max(0, Math.min(1, 1 - distanceMetres / maxDistance));
}

/** Cuisine term, 0..1. Returns a neutral 0.6 when the customer set no preference. */
function cuisineTerm(restaurantCuisine, preferredCuisine) {
  if (!preferredCuisine) return 0.6;
  if (!restaurantCuisine) return 0.3;
  return preferredCuisine.trim().toLowerCase() === restaurantCuisine.trim().toLowerCase() ? 1 : 0.2;
}

/**
 * Dietary term.
 *
 * Returns null -- not a low score -- when the customer requires plant-based
 * food and the venue cannot provide it. Surfacing a venue that cannot feed the
 * customer is a failure of the recommendation, not a weak match, so the caller
 * removes the candidate from the result set entirely.
 */
function dietaryTerm(restaurant, dietaryReq) {
  if (!dietaryReq) return 1;

  const requirements = String(dietaryReq)
    .split(/[,;]/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  if (requirements.length === 0) return 1;

  const needsPlantBased = requirements.some((r) => PLANT_BASED.includes(r));
  if (needsPlantBased && !restaurant.vegetarian_friendly) return null; // hard exclusion

  return 1;
}

/** Price term, 0..1, comparing price bands such as "$", "$$", "$$$". */
function priceTerm(restaurantPrice, preferredPrice) {
  if (!preferredPrice || !restaurantPrice) return 0.6;
  const gap = Math.abs(String(restaurantPrice).length - String(preferredPrice).length);
  return Math.max(0, 1 - gap / 3);
}

/**
 * Rating term, 0..1, from the venue's mean customer rating (FR9).
 *
 * The mean is shrunk toward a neutral prior of 3.0 using Bayesian damping, so
 * a venue with a single five-star review cannot outrank a venue with fifty
 * reviews averaging 4.5. CONFIDENCE_K is the number of ratings at which the
 * observed mean carries half the weight.
 */
const CONFIDENCE_K = 5;
const PRIOR_MEAN = 3.0;

function ratingTerm(averageRating, ratingCount) {
  if (!ratingCount || !averageRating) return (PRIOR_MEAN - 1) / 4; // no data -> neutral
  const damped =
    (averageRating * ratingCount + PRIOR_MEAN * CONFIDENCE_K) / (ratingCount + CONFIDENCE_K);
  return Math.max(0, Math.min(1, (damped - 1) / 4));
}

/** Promotion term, 0 or 1 -- a small nudge for a venue running an active offer (FR7). */
function promotionTerm(restaurant) {
  return restaurant.promotion_active && restaurant.promotion_text ? 1 : 0;
}

/**
 * Score one venue for one customer.
 *
 * @param {number} distanceMetres  distance from the customer to the venue
 * @param {number} radiusKm        the customer's discovery radius
 * @param {object} restaurant      row from the restaurant table
 * @param {object|null} preference row from the preference table, or null
 * @param {{average: number, count: number}} [ratings] aggregate feedback
 * @returns {{score: number, breakdown: object}|null} null if hard-excluded
 */
function scoreRestaurant(distanceMetres, radiusKm, restaurant, preference, ratings = {}) {
  const dietary = dietaryTerm(restaurant, preference?.dietary_req);
  if (dietary === null) return null; // customer cannot eat here

  const terms = {
    proximity: proximityTerm(distanceMetres, radiusKm),
    cuisine: cuisineTerm(restaurant.cuisine_type, preference?.cuisine_type),
    dietary,
    price: priceTerm(restaurant.price_range, preference?.price_range),
    rating: ratingTerm(ratings.average, ratings.count),
    promotion: promotionTerm(restaurant),
  };

  const breakdown = {};
  let score = 0;
  for (const [key, weight] of Object.entries(WEIGHTS)) {
    const contribution = weight * terms[key];
    breakdown[key] = Math.round(contribution * 10) / 10;
    score += contribution;
  }

  return { score: Math.round(score), breakdown };
}

module.exports = {
  WEIGHTS,
  scoreRestaurant,
  proximityTerm,
  cuisineTerm,
  dietaryTerm,
  priceTerm,
  ratingTerm,
  promotionTerm,
};

/**
 * Unit tests for the recommendation scoring service (FR5).
 *
 * Uses Node's built-in test runner, so the suite adds no dependency to the
 * project. Run with:  npm test
 *
 * The scoring service is pure, so these tests need no database and no running
 * server -- which is the reason the scoring logic was extracted out of the
 * route handler in the first place.
 */
const test = require('node:test');
const assert = require('node:assert');

const {
  WEIGHTS,
  scoreRestaurant,
  proximityTerm,
  cuisineTerm,
  dietaryTerm,
  priceTerm,
  ratingTerm,
  promotionTerm,
} = require('../src/services/scoringService');

/* --------------------------- fixtures --------------------------- */

const spiceTailor = {
  restaurant_id: 1,
  name: 'The Spice Tailor',
  cuisine_type: 'Indian',
  price_range: '$$',
  vegetarian_friendly: 1,
  promotion_active: 0,
  promotion_text: null,
};

const steakhouse = {
  restaurant_id: 2,
  name: 'Chophouse',
  cuisine_type: 'Steak',
  price_range: '$$$$',
  vegetarian_friendly: 0,
  promotion_active: 0,
  promotion_text: null,
};

/* ------------------------- weight integrity ------------------------- */

test('weights total exactly 100', () => {
  const total = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);
  assert.strictEqual(total, 100);
});

/* --------------------------- proximity --------------------------- */

test('proximity is 1 at the customer position and 0 at the radius edge', () => {
  assert.strictEqual(proximityTerm(0, 2), 1);
  assert.strictEqual(proximityTerm(2000, 2), 0);
});

test('proximity decays linearly and never goes negative', () => {
  assert.ok(Math.abs(proximityTerm(1000, 2) - 0.5) < 1e-9);
  assert.strictEqual(proximityTerm(999999, 2), 0);
});

/* ---------------------------- cuisine ---------------------------- */

test('cuisine match scores full, mismatch scores low, no preference is neutral', () => {
  assert.strictEqual(cuisineTerm('Indian', 'Indian'), 1);
  assert.strictEqual(cuisineTerm('Indian', 'indian'), 1, 'match should be case-insensitive');
  assert.strictEqual(cuisineTerm('Steak', 'Indian'), 0.2);
  assert.strictEqual(cuisineTerm('Indian', null), 0.6);
});

/* ---------------------------- dietary ---------------------------- */

test('a vegetarian requirement excludes a venue that is not vegetarian friendly', () => {
  assert.strictEqual(dietaryTerm(steakhouse, 'vegetarian'), null);
  assert.strictEqual(dietaryTerm(spiceTailor, 'vegetarian'), 1);
});

test('dietary requirements are parsed from a comma separated list', () => {
  assert.strictEqual(dietaryTerm(steakhouse, 'halal, vegan'), null);
  assert.strictEqual(dietaryTerm(steakhouse, 'halal'), 1, 'halal alone is not a plant-based exclusion');
});

test('no dietary requirement never excludes anything', () => {
  assert.strictEqual(dietaryTerm(steakhouse, null), 1);
  assert.strictEqual(dietaryTerm(steakhouse, ''), 1);
});

/* ----------------------------- price ----------------------------- */

test('price term rewards a matching band and penalises distance between bands', () => {
  assert.strictEqual(priceTerm('$$', '$$'), 1);
  assert.ok(priceTerm('$$$$', '$') < priceTerm('$$$', '$$'));
});

/* ---------------------------- ratings ---------------------------- */

test('a venue with no ratings receives the neutral prior', () => {
  assert.ok(Math.abs(ratingTerm(undefined, 0) - 0.5) < 1e-9);
});

test('Bayesian damping stops one five-star review outranking a well reviewed venue', () => {
  const oneFiveStar = ratingTerm(5.0, 1);
  const fiftyAtFourAndAHalf = ratingTerm(4.5, 50);
  assert.ok(
    fiftyAtFourAndAHalf > oneFiveStar,
    `expected 50x4.5 (${fiftyAtFourAndAHalf}) to beat 1x5.0 (${oneFiveStar})`,
  );
});

test('rating term stays within 0 and 1 at both extremes', () => {
  assert.ok(ratingTerm(1.0, 200) >= 0);
  assert.ok(ratingTerm(5.0, 200) <= 1);
});

/* --------------------------- promotion --------------------------- */

test('promotion term only fires when a promotion is both active and set', () => {
  assert.strictEqual(promotionTerm({ promotion_active: 1, promotion_text: '20% off' }), 1);
  assert.strictEqual(promotionTerm({ promotion_active: 1, promotion_text: null }), 0);
  assert.strictEqual(promotionTerm({ promotion_active: 0, promotion_text: '20% off' }), 0);
});

/* ------------------------ composite scoring ------------------------ */

test('a scored venue returns a 0-100 score and a breakdown that sums to it', () => {
  const result = scoreRestaurant(100, 2, spiceTailor, { cuisine_type: 'Indian', price_range: '$$' });
  assert.ok(result.score >= 0 && result.score <= 100);
  const summed = Object.values(result.breakdown).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(summed - result.score) <= 1, 'breakdown should reconstruct the score');
});

test('the breakdown names every weighted term, for explainability', () => {
  const result = scoreRestaurant(100, 2, spiceTailor, null);
  assert.deepStrictEqual(Object.keys(result.breakdown).sort(), Object.keys(WEIGHTS).sort());
});

test('a nearer venue outscores an identical venue further away', () => {
  const near = scoreRestaurant(50, 2, spiceTailor, null);
  const far = scoreRestaurant(1500, 2, spiceTailor, null);
  assert.ok(near.score > far.score);
});

test('REGRESSION: a vegetarian customer is never recommended a non-vegetarian venue', () => {
  // This is the defect found during Iteration 1: dietary_req was captured by
  // FR2 but ignored by the scoring model, so this call previously returned a
  // score instead of excluding the venue.
  const preference = { cuisine_type: 'Steak', price_range: '$$$$', dietary_req: 'vegetarian' };
  const result = scoreRestaurant(10, 2, steakhouse, preference);
  assert.strictEqual(result, null, 'a non-vegetarian venue must be excluded, not merely ranked low');
});

test('an active promotion lifts a venue above an otherwise identical one', () => {
  const promoted = { ...spiceTailor, promotion_active: 1, promotion_text: '20% off curries' };
  const plain = scoreRestaurant(300, 2, spiceTailor, null);
  const withPromo = scoreRestaurant(300, 2, promoted, null);
  assert.ok(withPromo.score > plain.score);
});

test('ratings influence the ranking of two otherwise identical venues', () => {
  const wellRated = scoreRestaurant(300, 2, spiceTailor, null, { average: 4.8, count: 40 });
  const poorlyRated = scoreRestaurant(300, 2, spiceTailor, null, { average: 2.0, count: 40 });
  assert.ok(wellRated.score > poorlyRated.score);
});

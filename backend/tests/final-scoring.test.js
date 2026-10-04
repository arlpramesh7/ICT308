const test = require('node:test');
const assert = require('node:assert/strict');
const { dietaryTerm, scoreRestaurant } = require('../src/services/scoringService');
const { promotionActive } = require('../src/services/promotion');
test('vegan customers are not matched to vegetarian-only restaurants', () => assert.equal(dietaryTerm({ vegetarian_friendly: 1, vegan_friendly: 0 }, 'vegan'), null));
test('vegan suitability is independent and explicitly checked', () => assert.equal(dietaryTerm({ vegetarian_friendly: 1, vegan_friendly: 1 }, 'vegan'), 1));
test('unknown dietary constraints are not silently treated as suitable', () => assert.equal(dietaryTerm({ vegetarian_friendly: 1 }, 'gluten-free'), null));
test('future promotions are excluded', () => assert.equal(promotionActive({ promotion_active: 1, promotion_text: 'offer', promotion_start: '2030-01-01T00:00:00Z' }, Date.parse('2026-10-04')), false));
test('expired promotions are excluded at the exact end boundary', () => assert.equal(promotionActive({ promotion_active: 1, promotion_text: 'offer', promotion_end: '2026-10-04T00:00:00Z' }, Date.parse('2026-10-04')), false));
test('promotion includes its start boundary', () => assert.equal(promotionActive({ promotion_active: 1, promotion_text: 'offer', promotion_start: '2026-10-04T00:00:00Z', promotion_end: '2026-10-05T00:00:00Z' }, Date.parse('2026-10-04')), true));
test('invalid promotion dates cannot activate an offer', () => assert.equal(promotionActive({ promotion_active: 1, promotion_text: 'offer', promotion_start: 'invalid' }), false));
test('scores stay bounded across all supported budgets and diets', () => {
  for (const price of ['$', '$$', '$$$', '$$$$']) for (const distance of [0, 100, 2000, 999999]) {
    const result = scoreRestaurant(distance, 2, { cuisine_type: 'Indian', price_range: price, vegetarian_friendly: 1, vegan_friendly: 1 }, { dietary_req: 'vegan', price_range: '$$' });
    assert.ok(result.score >= 0 && result.score <= 100);
  }
});

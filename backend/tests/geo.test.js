/**
 * Unit tests for the geospatial helpers (FR3, FR4).
 * Run with: npm test
 */
const test = require('node:test');
const assert = require('node:assert');
const { distanceMetres, isWithinGeofence, walkingMinutes } = require('../src/utils/geo');

const SPICE_TAILOR = { latitude: -33.8672, longitude: 151.2085, geofence_radius: 200 };

test('distance between a point and itself is zero', () => {
  assert.strictEqual(distanceMetres(-33.8672, 151.2085, -33.8672, 151.2085), 0);
});

test('distance is symmetric', () => {
  const ab = distanceMetres(-33.8672, 151.2085, -33.8741, 151.2062);
  const ba = distanceMetres(-33.8741, 151.2062, -33.8672, 151.2085);
  assert.ok(Math.abs(ab - ba) < 1e-6);
});

test('one degree of latitude is approximately 111 km', () => {
  const d = distanceMetres(0, 0, 1, 0);
  assert.ok(Math.abs(d - 111_195) < 500, `expected ~111195 m, got ${Math.round(d)}`);
});

test('Sydney CBD to Melbourne CBD is approximately 713 km', () => {
  const d = distanceMetres(-33.8688, 151.2093, -37.8136, 144.9631);
  assert.ok(Math.abs(d - 713_000) < 15_000, `expected ~713 km, got ${Math.round(d / 1000)} km`);
});

test('a point 14 m from the venue is inside the 200 m geofence', () => {
  // Roughly 14 m north of The Spice Tailor.
  assert.strictEqual(isWithinGeofence(-33.86707, 151.2085, SPICE_TAILOR), true);
});

test('a point 800 m from the venue is outside the 200 m geofence', () => {
  assert.strictEqual(isWithinGeofence(-33.8741, 151.2062, SPICE_TAILOR), false);
});

test('walking time is at least one minute and scales with distance', () => {
  assert.strictEqual(walkingMinutes(5), 1);
  assert.ok(walkingMinutes(2000) > walkingMinutes(500));
});

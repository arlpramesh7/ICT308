// Uses Node's built-in SQLite module (node:sqlite) — no native compilation
// required, so no Python / Visual Studio Build Tools needed on Windows.
// Available without a flag from Node 22.5+; older versions need
// `node --experimental-sqlite src/app.js` (see package.json "start" script).
const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'db', 'smartdine.sqlite');
const SCHEMA_PATH = path.join(__dirname, '..', 'db', 'schema.sql');

const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA foreign_keys = ON');

// Initialise schema
const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
db.exec(schema);

// Seed the pilot restaurant (The Spice Tailor, Sydney CBD) if not present
const existing = db.prepare('SELECT COUNT(*) AS c FROM restaurant').get();
if (existing.c === 0) {
  db.prepare(`
    INSERT INTO restaurant (name, address, latitude, longitude, geofence_radius, cuisine_type, price_range)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run('The Spice Tailor', '3 Spring St, Sydney NSW 2000', -33.8672, 151.2085, 200, 'Indian', '$$');

  const restaurantId = db.prepare('SELECT restaurant_id FROM restaurant WHERE name = ?').get('The Spice Tailor').restaurant_id;

  const items = [
    ['Butter Chicken', 24.5, 'Main', 1],
    ['Vegetable Biryani', 19.0, 'Main', 1],
    ['Garlic Naan', 5.5, 'Side', 1],
    ['Mango Lassi', 6.0, 'Drink', 1],
  ];
  const insertItem = db.prepare(
    'INSERT INTO menu_item (restaurant_id, item_name, price, category, is_available) VALUES (?, ?, ?, ?, ?)'
  );
  for (const item of items) insertItem.run(restaurantId, ...item);

  console.log('Seeded pilot restaurant: The Spice Tailor');
}

module.exports = db;

// Uses Node's built-in SQLite module (node:sqlite) — no native compilation
// required, so no Python / Visual Studio Build Tools needed on Windows.
// The supported and tested runtime is Node.js 24.
const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'db', 'smartdine.sqlite');
const SCHEMA_PATH = path.join(__dirname, '..', 'db', 'schema.sql');

if (DB_PATH !== ':memory:') fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA foreign_keys = ON');
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA busy_timeout = 5000');

// Initialise schema
const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
db.exec(schema);

/**
 * Lightweight migration step.
 *
 * schema.sql uses CREATE TABLE IF NOT EXISTS, so columns added to it later are
 * never applied to a database file that already exists. Anyone who ran an
 * earlier build has such a file. This checks the live table definition and adds
 * only what is missing, so an existing database is upgraded in place rather
 * than having to be deleted — which would also destroy the recommendation and
 * notification history the FR10 analytics reads from.
 */
function addColumnIfMissing(table, column, definition) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all();
  if (columns.some((c) => c.name === column)) return false;
  db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  return true;
}

const migrations = [
  // Required by the dietary hard-exclusion rule in the scoring service (FR2, FR5).
  addColumnIfMissing('restaurant', 'vegetarian_friendly', 'INTEGER NOT NULL DEFAULT 0'),
  // FR8 asks staff to manage "menu, promotions, and availability"; promotions
  // had no storage in Iteration 1.
  addColumnIfMissing('restaurant', 'promotion_text', 'TEXT'),
  addColumnIfMissing('restaurant', 'promotion_active', 'INTEGER NOT NULL DEFAULT 0'),
  addColumnIfMissing('restaurant', 'vegan_friendly', 'INTEGER NOT NULL DEFAULT 0 CHECK (vegan_friendly IN (0,1))'),
  addColumnIfMissing('restaurant', 'promotion_start', 'TEXT'),
  addColumnIfMissing('restaurant', 'promotion_end', 'TEXT'),
  addColumnIfMissing('menu_item', 'description', "TEXT NOT NULL DEFAULT ''"),
  addColumnIfMissing('menu_item', 'vegetarian', 'INTEGER NOT NULL DEFAULT 0 CHECK (vegetarian IN (0,1))'),
  addColumnIfMissing('menu_item', 'vegan', 'INTEGER NOT NULL DEFAULT 0 CHECK (vegan IN (0,1))'),
  addColumnIfMissing('user', 'failed_logins', 'INTEGER NOT NULL DEFAULT 0'),
  addColumnIfMissing('user', 'locked_until', 'TEXT'),
  addColumnIfMissing('user', 'token_version', 'INTEGER NOT NULL DEFAULT 0'),
  addColumnIfMissing('user', 'privacy_accepted_at', 'TEXT'),
  addColumnIfMissing('user', 'notifications_enabled', 'INTEGER NOT NULL DEFAULT 1 CHECK (notifications_enabled IN (0,1))'),
  addColumnIfMissing('notification', 'push_status', "TEXT NOT NULL DEFAULT 'in_app'"),
  addColumnIfMissing('restaurant', 'cover_image', "TEXT NOT NULL DEFAULT ''"),
  addColumnIfMissing('restaurant', 'description', "TEXT NOT NULL DEFAULT ''"),
  addColumnIfMissing('restaurant', 'opening_hours', "TEXT NOT NULL DEFAULT 'Daily 11:00 am - 10:00 pm'"),
  addColumnIfMissing('restaurant', 'open_minute', 'INTEGER NOT NULL DEFAULT 660'),
  addColumnIfMissing('restaurant', 'close_minute', 'INTEGER NOT NULL DEFAULT 1320'),
  addColumnIfMissing('restaurant', 'pickup_minutes', 'INTEGER NOT NULL DEFAULT 20'),
].filter(Boolean);

if (migrations.length > 0) {
  console.log(`Applied ${migrations.length} schema migration(s).`);
}

// Indexes supporting the proximity filter and the FR10 analytics aggregates.
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_restaurant_coords ON restaurant(latitude, longitude);
  CREATE INDEX IF NOT EXISTS idx_recommendation_restaurant ON recommendation(restaurant_id, timestamp);
  CREATE INDEX IF NOT EXISTS idx_notification_user ON notification(user_id, sent_at);
  CREATE INDEX IF NOT EXISTS idx_feedback_restaurant ON feedback(restaurant_id);
  CREATE VIEW IF NOT EXISTS current_feedback AS SELECT * FROM feedback WHERE feedback_id IN (SELECT MAX(feedback_id) FROM feedback GROUP BY user_id, restaurant_id);
  CREATE INDEX IF NOT EXISTS idx_recommendation_user_venue ON recommendation(user_id, restaurant_id, timestamp);
  CREATE INDEX IF NOT EXISTS idx_notification_user_venue ON notification(user_id, restaurant_id, sent_at);
  CREATE TABLE IF NOT EXISTS restaurant_member (
    user_id INTEGER NOT NULL REFERENCES user(user_id) ON DELETE CASCADE,
    restaurant_id INTEGER NOT NULL REFERENCES restaurant(restaurant_id) ON DELETE CASCADE,
    PRIMARY KEY(user_id, restaurant_id)
  );
  CREATE TABLE IF NOT EXISTS push_subscription (
    subscription_id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES user(user_id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS audit_event (
    event_id INTEGER PRIMARY KEY,
    user_id INTEGER REFERENCES user(user_id) ON DELETE SET NULL,
    restaurant_id INTEGER REFERENCES restaurant(restaurant_id),
    action TEXT NOT NULL,
    target_id INTEGER,
    occurred_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

/**
 * Seed data.
 *
 * Iteration 1 seeded only the pilot venue. A recommendation engine ranking a
 * list of one cannot demonstrate ranking, so the seed now includes competing
 * Sydney CBD venues at varying distances, cuisines, price bands and dietary
 * suitability. The Spice Tailor remains the pilot partner and keeps its
 * original coordinates and 200 m geofence.
 */
const PILOT = {
  name: 'The Spice Tailor',
  address: '3 Spring St, Sydney NSW 2000',
  latitude: -33.8672,
  longitude: 151.2085,
  geofence_radius: 200,
  cuisine_type: 'Indian',
  price_range: '$$',
  vegetarian_friendly: 1,
  promotion_text: '20% off all curries - demonstration offer',
  promotion_active: 1,
};

const COMPETITORS = [
  { name: 'Nikkei Bar', address: '88 George St, Sydney NSW 2000',
    latitude: -33.8659, longitude: 151.2093, geofence_radius: 200,
    cuisine_type: 'Japanese', price_range: '$$$', vegetarian_friendly: 1,
    promotion_text: null, promotion_active: 0 },
  { name: 'Trattoria Bianco', address: '21 Bathurst St, Sydney NSW 2000',
    latitude: -33.8741, longitude: 151.2062, geofence_radius: 200,
    cuisine_type: 'Italian', price_range: '$$', vegetarian_friendly: 1,
    promotion_text: 'Free garlic bread with any main', promotion_active: 1 },
  { name: 'Green Fork', address: '5 Market St, Sydney NSW 2000',
    latitude: -33.8703, longitude: 151.2069, geofence_radius: 200,
    cuisine_type: 'Vegetarian', price_range: '$$', vegetarian_friendly: 1,
    promotion_text: null, promotion_active: 0 },
  { name: 'Chophouse', address: '25 Bligh St, Sydney NSW 2000',
    latitude: -33.8648, longitude: 151.2103, geofence_radius: 200,
    cuisine_type: 'Steak', price_range: '$$$$', vegetarian_friendly: 0,
    promotion_text: null, promotion_active: 0 },
  { name: 'Seoul Grill', address: '140 Liverpool St, Sydney NSW 2000',
    latitude: -33.8776, longitude: 151.2091, geofence_radius: 200,
    cuisine_type: 'Korean', price_range: '$$$', vegetarian_friendly: 0,
    promotion_text: null, promotion_active: 0 },
];

const MENU_BY_RESTAURANT = {
  'The Spice Tailor': [
    ['Butter Chicken', 24.5, 'Main', 1],
    ['Vegetable Biryani', 19.0, 'Main', 1],
    ['Paneer Tikka Masala', 22.5, 'Main', 1],
    ['Garlic Naan', 5.5, 'Side', 1],
    ['Mango Lassi', 6.0, 'Drink', 1],
  ],
  'Nikkei Bar': [
    ['Salmon Tiradito', 28.0, 'Main', 1],
    ['Vegetable Tempura', 14.0, 'Side', 1],
  ],
  'Trattoria Bianco': [
    ['Cacio e Pepe', 24.0, 'Main', 1],
    ['Margherita Pizza', 21.0, 'Main', 1],
  ],
  'Green Fork': [
    ['Harvest Grain Bowl', 19.5, 'Main', 1],
    ['Roasted Cauliflower Steak', 21.0, 'Main', 1],
  ],
  Chophouse: [['Dry-Aged Sirloin', 46.0, 'Main', 1]],
  'Seoul Grill': [
    ['Bibimbap', 23.0, 'Main', 1],
    ['Kimchi Jjigae', 22.0, 'Main', 1],
  ],
};

const insertRestaurant = db.prepare(`
  INSERT INTO restaurant
    (name, address, latitude, longitude, geofence_radius, cuisine_type, price_range,
     vegetarian_friendly, promotion_text, promotion_active)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
const insertItem = db.prepare(
  'INSERT INTO menu_item (restaurant_id, item_name, price, category, is_available) VALUES (?, ?, ?, ?, ?)'
);
const findByName = db.prepare('SELECT restaurant_id FROM restaurant WHERE name = ?');

/** Insert a venue and its menu only if that venue is not already present. */
function seedRestaurant(r) {
  if (findByName.get(r.name)) return false;
  const info = insertRestaurant.run(
    r.name, r.address, r.latitude, r.longitude, r.geofence_radius,
    r.cuisine_type, r.price_range, r.vegetarian_friendly, r.promotion_text, r.promotion_active
  );
  const restaurantId = Number(info.lastInsertRowid);
  for (const item of MENU_BY_RESTAURANT[r.name] || []) {
    insertItem.run(restaurantId, ...item);
  }
  return true;
}

const seeded = process.env.DEMO_DATA === 'false' ? [] : [PILOT, ...COMPETITORS].filter(seedRestaurant);
if (seeded.length > 0) {
  console.log(`Seeded ${seeded.length} restaurant(s): ${seeded.map((r) => r.name).join(', ')}`);
}

for (const venue of seeded) {
  if (['The Spice Tailor', 'Green Fork'].includes(venue.name)) db.prepare('UPDATE restaurant SET vegan_friendly = 1 WHERE name = ?').run(venue.name);
  const id = findByName.get(venue.name).restaurant_id;
  db.prepare("UPDATE menu_item SET vegetarian = 1 WHERE restaurant_id = ? AND item_name NOT IN ('Butter Chicken','Salmon Tiradito','Dry-Aged Sirloin','Bibimbap','Kimchi Jjigae')").run(id);
  db.prepare("UPDATE menu_item SET vegan = 1 WHERE restaurant_id = ? AND item_name IN ('Vegetable Biryani','Harvest Grain Bowl','Roasted Cauliflower Steak')").run(id);
}

require('./catalog').enrichCatalog(db);
module.exports = db;

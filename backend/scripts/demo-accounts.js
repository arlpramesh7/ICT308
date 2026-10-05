const bcrypt = require('bcryptjs');

const password = 'SmartDine-Demo26!';
const restaurants = ['The Spice Tailor', 'Nikkei Bar', 'Trattoria Bianco', 'Green Fork', 'Chophouse', 'Seoul Grill'];
const slug = name => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const accounts = [
  { name: 'Prajwal Shrestha', email: 'customer@smartdine.test', role: 'customer' },
  { name: 'The Spice Tailor Staff', email: 'staff@smartdine.test', role: 'staff', restaurant: restaurants[0] },
  { name: 'The Spice Tailor Owner', email: 'owner@smartdine.test', role: 'owner', restaurant: restaurants[0] },
  ...restaurants.flatMap(restaurant => ['staff', 'owner'].map(role => ({
    name: restaurant + ' ' + (role === 'staff' ? 'Staff' : 'Owner'),
    email: role + '.' + slug(restaurant) + '@smartdine.test', role, restaurant,
  }))),
];

function seedDemoAccounts(db) {
  if (process.env.NODE_ENV === 'production' || process.env.DEMO_DATA === 'false') {
    throw new Error('Local demonstration accounts are disabled in this environment.');
  }
  let hash;
  db.exec('BEGIN IMMEDIATE');
  try {
    for (const account of accounts) {
      const venue = account.restaurant && db.prepare('SELECT restaurant_id FROM restaurant WHERE name = ? AND is_active = 1').get(account.restaurant);
      if (account.restaurant && !venue) throw new Error('Required demonstration restaurant missing: ' + account.restaurant);
      let user = db.prepare('SELECT * FROM user WHERE email = ? COLLATE NOCASE').get(account.email);
      if (user && (user.role !== account.role || !user.is_active)) throw new Error('Existing account role/activity conflicts with demonstration setup: ' + account.email);
      if (user && venue) {
        const memberships = db.prepare('SELECT restaurant_id FROM restaurant_member WHERE user_id = ?').all(user.user_id);
        if (memberships.some(m => m.restaurant_id !== venue.restaurant_id)) throw new Error('Existing restaurant membership conflicts with demonstration setup: ' + account.email);
        if (!bcrypt.compareSync(password, user.password_hash)) throw new Error('Existing demonstration password differs; preserved without reset: ' + account.email);
      }
      if (!user) {
        hash ||= bcrypt.hashSync(password, 12);
        const username = db.prepare('SELECT 1 FROM user WHERE username = ?').get(account.name) ? account.email : account.name;
        if (db.prepare('SELECT 1 FROM user WHERE username = ?').get(username)) throw new Error('Demonstration username collision: ' + account.email);
        const info = db.prepare('INSERT INTO user (username, display_name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)').run(username, account.name, account.email, hash, account.role);
        user = { user_id: Number(info.lastInsertRowid) };
      }
      db.prepare('UPDATE user SET display_name = ? WHERE user_id = ?').run(account.name, user.user_id);
      if (venue) db.prepare('INSERT OR IGNORE INTO restaurant_member (user_id, restaurant_id) VALUES (?, ?)').run(user.user_id, venue.restaurant_id);
    }
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
  return accounts;
}

module.exports = { accounts, restaurants, password, seedDemoAccounts };

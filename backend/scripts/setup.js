const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const webpush = require('web-push');
const envPath = path.join(__dirname, '../.env');
if (!fs.existsSync(envPath)) {
  const keys = webpush.generateVAPIDKeys();
  fs.writeFileSync(envPath, [
    'NODE_ENV=development', 'HOST=127.0.0.1', 'PORT=4000', 'APP_ORIGIN=http://localhost:4000',
    'JWT_SECRET=' + crypto.randomBytes(48).toString('hex'),
    'VAPID_PUBLIC_KEY=' + keys.publicKey, 'VAPID_PRIVATE_KEY=' + keys.privateKey,
    'VAPID_SUBJECT=https://github.com/arlpramesh7/ICT308', 'DEMO_DATA=true', '',
  ].join('\n'), { mode: 0o600, flag: 'wx' });
  console.log('Created local configuration with unique secrets.');
}
require('../src/config');
if (process.env.NODE_ENV === 'production') throw new Error('Demo setup is disabled in production.');
const db = require('../src/db');
const accounts = [
  ['Customer Demo', 'customer@smartdine.test', 'customer'],
  ['Staff Demo', 'staff@smartdine.test', 'staff'],
  ['Owner Demo', 'owner@smartdine.test', 'owner'],
];
const password = 'SmartDine-Demo26!';
const hash = bcrypt.hashSync(password, 12);
for (const [name, email, role] of accounts) {
  if (!db.prepare('SELECT 1 FROM user WHERE email = ?').get(email)) {
    const info = db.prepare('INSERT INTO user (username, email, password_hash, role) VALUES (?, ?, ?, ?)').run(name, email, hash, role);
    if (role !== 'customer') {
      const venue = db.prepare("SELECT restaurant_id FROM restaurant WHERE name = 'The Spice Tailor'").get();
      if (venue) db.prepare('INSERT INTO restaurant_member (user_id, restaurant_id) VALUES (?, ?)').run(info.lastInsertRowid, venue.restaurant_id);
    }
  }
}
db.close();
console.log('Demo ready. Accounts: customer@smartdine.test, staff@smartdine.test, owner@smartdine.test');
console.log('Demo-only password: ' + password);
console.log('Run npm start, then open http://localhost:4000');


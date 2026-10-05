const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
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
const { seedDemoAccounts, password } = require('./demo-accounts');
const accounts = seedDemoAccounts(db);
require('./seed-reviews').seedReviews();
db.close();
console.log('Local demonstration accounts ready:');
for (const account of accounts) console.log(account.name + ': ' + account.email);
console.log('Demo-only password: ' + password);
console.log('Run npm start, then open http://localhost:4000');

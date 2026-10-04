const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });

const secret = process.env.JWT_SECRET;
if (!secret || secret.length < 32 || secret.startsWith('replace_')) {
  throw new Error('JWT_SECRET must contain at least 32 characters. Run npm run setup first.');
}

module.exports = {
  secret,
  production: process.env.NODE_ENV === 'production',
  port: Number(process.env.PORT || 4000),
  host: process.env.HOST || '127.0.0.1',
  origin: process.env.APP_ORIGIN || 'http://localhost:4000',
};

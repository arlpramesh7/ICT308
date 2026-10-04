const config = require('./config');
const path = require('node:path');
const express = require('express');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
const { requireJson } = require('./middleware/validation');
const app = express();
app.disable('x-powered-by');
app.use(helmet({
  contentSecurityPolicy: { directives: {
    defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'"],
    imgSrc: ["'self'", 'data:'], connectSrc: ["'self'"],
    frameSrc: ['https://www.google.com'], upgradeInsecureRequests: config.production ? [] : null,
  } },
  strictTransportSecurity: config.production ? undefined : false,
}));
app.use(express.json({ limit: '32kb' }));
app.use('/api', requireJson, (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  const origin = req.headers.origin;
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && origin && origin !== config.origin) return res.status(403).json({ error: 'Request origin is not allowed.' });
  next();
});
const testing = process.env.NODE_ENV === 'test';
app.use('/api', rateLimit({ windowMs: 60000, limit: testing ? Number(process.env.TEST_RATE_LIMIT || 1000) : 100, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Too many requests. Try again in a minute.' } }));
app.use('/api/auth', rateLimit({ windowMs: 60000, limit: testing ? 1000 : 20, skip: req => req.path === '/me', standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Too many sign-in requests. Try again in a minute.' } }));
app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'SmartDine', version: '2.0.0' }));
for (const name of ['auth', 'preferences', 'location', 'restaurants', 'feedback', 'analytics', 'privacy', 'push']) app.use('/api/' + name, require('./routes/' + name));
app.use('/api', (req, res) => res.status(404).json({ error: 'Endpoint not found.' }));
app.get('/assets/lucide.js', (req, res) => res.sendFile(path.join(__dirname, '../node_modules/lucide/dist/umd/lucide.js')));
app.use(express.static(path.join(__dirname, '../../frontend')));
app.use((err, req, res, next) => {
  const status = err.status === 413 ? 413 : err.type === 'entity.parse.failed' ? 400 : 500;
  if (status === 500) console.error('Request failed:', err.message);
  res.status(status).json({ error: status === 413 ? 'Request too large.' : status === 400 ? 'Invalid JSON.' : 'Internal server error.' });
});
if (require.main === module) {
  const server = app.listen(config.port, config.host, () => console.log('SmartDine running at ' + config.origin));
  for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => server.close(() => { require('./db').close(); process.exit(0); }));
}
module.exports = app;

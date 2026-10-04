const jwt = require('jsonwebtoken');
const db = require('../db');
const config = require('../config');
const JWT_OPTIONS = { issuer: 'smartdine', audience: 'smartdine-client', algorithms: ['HS256'] };

function requireAuth(req, res, next) {
  const bearer = req.headers.authorization;
  const cookie = (req.headers.cookie || '').split(';').map(v => v.trim()).find(v => v.startsWith('smartdine_session='));
  const token = bearer?.startsWith('Bearer ') ? bearer.slice(7) : cookie?.slice('smartdine_session='.length);
  if (!token) return res.status(401).json({ error: 'Please sign in to continue.' });
  try {
    const payload = jwt.verify(token, config.secret, JWT_OPTIONS);
    const user = db.prepare('SELECT user_id, username, email, role, token_version FROM user WHERE user_id = ? AND is_active = 1').get(payload.user_id);
    if (!user || user.token_version !== payload.version) throw new Error('Session revoked');
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) return res.status(403).json({ error: 'You do not have permission for this action.' });
    next();
  };
}

function requireVenue(paramName = 'id') {
  return (req, res, next) => {
    const id = Number(req.params[paramName]);
    if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ error: 'Invalid restaurant ID.' });
    const membership = db.prepare('SELECT 1 FROM restaurant_member WHERE user_id = ? AND restaurant_id = ?').get(req.user.user_id, id);
    if (!membership) return res.status(403).json({ error: 'This restaurant is not assigned to your account.' });
    next();
  };
}

function issueSession(res, user) {
  const token = jwt.sign({ user_id: user.user_id, version: user.token_version }, config.secret, { expiresIn: '1h', issuer: JWT_OPTIONS.issuer, audience: JWT_OPTIONS.audience, algorithm: 'HS256' });
  res.cookie('smartdine_session', token, { httpOnly: true, secure: config.production, sameSite: 'strict', path: '/', maxAge: 3600000 });
  return token;
}

module.exports = { requireAuth, requireRole, requireVenue, issueSession, JWT_SECRET: config.secret };


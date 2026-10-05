const { validationResult } = require('express-validator');

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'Please check the supplied values.', errors: errors.array().map(e => ({ field: e.path, message: e.msg })) });
  next();
}

function requireJson(req, res, next) {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && !req.is('application/json')) return res.status(415).json({ error: 'Use application/json for this request.' });
  next();
}

module.exports = { validate, requireJson };

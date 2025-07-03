const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const parts = authHeader.split(' ');

  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    logger.warn('Authorization header missing or malformed', { ip: req.ip, path: req.originalUrl });
    res.set('WWW-Authenticate', 'Bearer');
    return res.status(401).json({ message: 'Authorization required' });
  }

  const token = parts[1];
  const secret = process.env.JWT_SECRET || 'fallback-secret';

  jwt.verify(token, secret, (err, payload) => {
    if (err) {
      const isExpired = err.name === 'TokenExpiredError';
      logger.warn('Token verification failed', {
        error: err.name,
        expired: isExpired,
        ip: req.ip,
        path: req.originalUrl
      });
      const status = isExpired ? 401 : 403;
      if (status === 401) {
        res.set('WWW-Authenticate', 'Bearer');
      }
      const message = isExpired ? 'Token expired' : 'Token invalid';
      return res.status(status).json({ message });
    }

    req.user = payload;
    next();
  });
}

module.exports = { authenticate: authenticateToken };
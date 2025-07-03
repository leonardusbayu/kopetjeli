const jwt = require('jsonwebtoken');
const config = require('../config/config');
const logger = require('../config/logger');

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const parts = authHeader.split(' ');

  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    logger.warn('Authorization header missing or malformed', { ip: req.ip, path: req.originalUrl });
    res.set('WWW-Authenticate', 'Bearer');
    return res.status(401).json({ message: req.__('error.authorization_required') });
  }

  const token = parts[1];

  jwt.verify(token, config.jwt.secret, (err, payload) => {
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
      const messageKey = isExpired ? 'error.token_expired' : 'error.token_invalid';
      return res.status(status).json({ message: req.__(messageKey) });
    }

    req.user = payload;
    next();
  });
}

module.exports = authenticateToken;
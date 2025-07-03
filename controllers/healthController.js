const logger = require('../utils/logger');

const check = (req, res) => {
  const health = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  };

  logger.info('Health check requested', { ip: req.ip });
  res.status(200).json(health);
};

module.exports = { check };
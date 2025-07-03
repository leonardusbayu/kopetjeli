const logger = require('../config/logger');

function handleError(err, req, res, next) {
  const env = process.env.NODE_ENV || 'development';
  if (res.headersSent) {
    return next(err);
  }

  const defaultMessage = req.t ? req.t('errors.internalServerError') : 'Internal Server Error';

  let statusCode = err.statusCode || (typeof err.status === 'number' ? err.status : 500);
  if (typeof statusCode !== 'number') {
    statusCode = 500;
  }

  let message = err.message || defaultMessage;
  let errors;

  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    statusCode = 400;
    message = req.t ? req.t('errors.invalidJson') : 'Invalid JSON payload';
  } else if (err.name === 'ValidationError') {
    statusCode = 400;
    message = req.t ? req.t('errors.validationFailed') : 'Validation failed';
    errors = Object.values(err.errors).map(e => ({ field: e.path, message: e.message }));
  }

  const status = statusCode < 500 ? 'fail' : 'error';
  if (statusCode === 500 && env === 'production') {
    message = defaultMessage;
  }

  const logPayload = {
    message,
    statusCode,
    path: req.originalUrl,
    method: req.method,
    params: req.params
  };
  if (env !== 'production') {
    logPayload.stack = err.stack;
    logPayload.query = req.query;
    logPayload.body = req.body;
  }

  logger.error(logPayload);

  const response = { status, message };
  if (errors) {
    response.errors = errors;
  }
  if (env !== 'production') {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
}

module.exports = handleError;
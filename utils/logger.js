const fs = require('fs');
const path = require('path');
const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf, metadata, errors, colorize } = format;

const logDir = process.env.LOG_DIR || path.resolve(__dirname, '../logs');
// Create log directory at startup; recursive ensures idempotency
fs.mkdirSync(logDir, { recursive: true });

const logLevel = process.env.LOG_LEVEL || 'info';

const logFormat = printf(info => {
  const { timestamp, level, message, metadata: metaObj, stack } = info;
  const msg = stack || message;
  const meta = metaObj && Object.keys(metaObj).length ? ` ${JSON.stringify(metaObj)}` : '';
  return `${timestamp} [${level}]: ${msg}${meta}`;
});

const logger = createLogger({
  level: logLevel,
  format: combine(
    errors({ stack: true }),
    timestamp(),
    metadata({ fillExcept: ['message', 'level', 'timestamp', 'label'] }),
    logFormat
  ),
  transports: [
    new transports.Console({
      level: logLevel,
      format: combine(colorize(), timestamp(), logFormat),
      handleExceptions: true
    }),
    new transports.File({
      filename: path.join(logDir, 'app.log'),
      level: logLevel,
      maxsize: 5 * 1024 * 1024,
      maxFiles: 5,
      handleExceptions: true
    })
  ],
  exitOnError: false
});

process.on('unhandledRejection', reason => {
  logger.error('Unhandled Rejection', { reason });
  setImmediate(() => process.exit(1));
});

module.exports = logger;
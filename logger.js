const fs = require('fs')
const path = require('path')
const { createLogger, format, transports } = require('winston')
let logger

function initLogger(config = {}) {
  const defaultFile = { enabled: false, filename: 'app.log', dirname: 'logs' }
  const defaultConsole = { enabled: true }
  const {
    level = 'info',
    file: fileConfig = {},
    console: consoleConfig = {},
    json = false
  } = config

  const fileOpts = { ...defaultFile, ...fileConfig }
  const consoleOpts = { ...defaultConsole, ...consoleConfig }

  const formats = [
    format.errors({ stack: true }),
    format.timestamp()
  ]

  if (json) {
    formats.push(format.json())
  } else {
    formats.push(format.printf(({ timestamp, level, message, stack, ...meta }) => {
      const msg = stack || message
      const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : ''
      return `${timestamp} [${level}]: ${msg}${metaStr}`
    }))
  }

  const transportList = []

  if (consoleOpts.enabled) {
    transportList.push(new transports.Console({
      level,
      format: format.combine(format.colorize(), ...formats)
    }))
  }

  if (fileOpts.enabled) {
    const logDir = path.resolve(fileOpts.dirname)
    try {
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true })
      }
    } catch (err) {
      console.warn(`Failed to create log directory "${logDir}":`, err)
    }
    try {
      transportList.push(new transports.File({
        level,
        filename: path.join(logDir, fileOpts.filename),
        format: format.combine(...formats)
      }))
    } catch (err) {
      console.warn('Failed to create file transport:', err)
    }
  }

  try {
    logger = createLogger({
      level,
      transports: transportList,
      exitOnError: false
    })
  } catch (err) {
    console.error('Failed to initialize logger:', err)
    logger = { log: (lvl, msg) => console.log(`[${lvl}]: ${msg}`) }
  }
}

function log(level, message) {
  if (!logger) initLogger()
  logger.log(level, message)
}

function info(message) {
  log('info', message)
}

function warn(message) {
  log('warn', message)
}

function error(message) {
  log('error', message)
}

function debug(message) {
  log('debug', message)
}

module.exports = { initLogger, log, info, warn, error, debug }
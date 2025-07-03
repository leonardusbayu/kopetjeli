const express = require('express')
const http = require('http')
const config = require('./config')
const logger = require('./logger')
const db = require('./db')
const routes = require('./routes')
const { setupMiddlewares, shutdown } = require('./serverUtils')

let server

async function start(port = config.server.port) {
  try {
    await db.connect()
    const app = express()
    setupMiddlewares(app)
    app.use('/api', routes)
    server = http.createServer(app)
    await new Promise((resolve, reject) => {
      server.on('error', err => {
        logger.error({ err }, 'Server error')
        reject(err)
      })
      server.listen(port, resolve)
    })
    logger.info({ port }, 'Server started')
    return server
  } catch (err) {
    logger.error({ err }, 'Failed to start server')
    throw err
  }
}

module.exports = { start, shutdown }
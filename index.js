const express = require('express')
require('dotenv').config()
const config = require('./config')
const logger = require('./utils/logger')
const { connect, disconnect } = require('./services/db')
const i18n = require('./utils/i18n')
const importService = require('./services/importService')
const routes = require('./routes')
const { v4: uuidv4 } = require('uuid')
const { shutdown } = require('./utils/shutdown')

let server

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

process.on('unhandledRejection', async (reason) => {
  logger.error('Unhandled Rejection', { reason })
  await shutdown()
})

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { error })
  process.exit(1)
})

async function main() {
  await i18n.init()
  await connect()
  await importService.importAll()

  const app = express()

  app.use(i18n.middleware())
  app.use(express.json())
  app.use((req, res, next) => {
    const requestId = req.headers['x-request-id'] || uuidv4()
    req.logger = logger.child({ requestId })
    res.setHeader('X-Request-Id', requestId)
    next()
  })

  app.use(config.api.basePath, routes)

  // Error-handling middleware
  app.use((err, req, res, next) => {
    req.logger.error('Error handling request', { error: err })
    const status = err.status || 500
    const message = err.message || 'Internal Server Error'
    res.status(status).json({ error: message })
  })

  server = app.listen(config.api.port, () => {
    logger.info(`Server listening on port ${config.api.port}`)
  })

  // provide server to shutdown handler
  shutdown.setServer(server)
}

main().catch(async (error) => {
  logger.error('Failed to start application', { error })
  await shutdown()
})
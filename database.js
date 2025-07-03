const { Pool } = require('pg')
const { EventEmitter } = require('events')
const logger = require('./logger')

const database = new EventEmitter()
let pool = null

function redactOptions(options) {
  const redacted = { ...options }
  if (redacted.connectionString) {
    redacted.connectionString = '****'
  }
  if (redacted.password) {
    redacted.password = '****'
  }
  return redacted
}

database.connect = async function(config) {
  if (pool) {
    logger.warn('Database connection already initialized')
    return
  }
  const options = config.connectionString
    ? { connectionString: config.connectionString }
    : {
        host: config.host,
        port: config.port,
        user: config.user,
        password: config.password,
        database: config.database,
        max: config.max || 10,
        idleTimeoutMillis: config.idleTimeoutMillis || 30000,
        connectionTimeoutMillis: config.connectionTimeoutMillis || 2000
      }
  pool = new Pool(options)
  pool.on('error', (err) => {
    logger.error('Unexpected error on idle database client', { error: err })
    database.emit('error', err)
  })
  try {
    const client = await pool.connect()
    client.release()
    logger.info('Database connection pool created', { options: redactOptions(options) })
  } catch (err) {
    logger.error('Error establishing database connection', { error: err })
    await pool.end().catch(() => {})
    pool = null
    throw err
  }
}

database.query = async function(sql, params = []) {
  if (!pool) {
    throw new Error('Database not initialized. Call connect(config) first.')
  }
  const start = Date.now()
  try {
    const result = await pool.query(sql, params)
    const duration = Date.now() - start
    logger.info('Executed database query', {
      sql,
      params,
      duration,
      rowCount: result.rowCount
    })
    return result.rows
  } catch (error) {
    logger.error('Database query error', { sql, params, error })
    throw error
  }
}

database.close = async function() {
  if (!pool) {
    logger.warn('Database pool not initialized or already closed')
    return
  }
  try {
    await pool.end()
    logger.info('Database connection pool has been closed')
  } catch (error) {
    logger.error('Error closing database connection pool', { error })
    throw error
  } finally {
    pool = null
  }
}

module.exports = database
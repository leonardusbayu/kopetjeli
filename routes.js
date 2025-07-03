const express = require('express')
const createError = require('http-errors')
const helmet = require('helmet')
const cors = require('cors')
const rateLimit = require('express-rate-limit')
const i18n = require('i18n')
const { authenticate } = require('./middleware/auth')
const { requestLogger } = require('./middleware/logger')
const errorHandler = require('./middleware/errorHandler')
const healthController = require('./controllers/healthController')
const authController = require('./controllers/authController')
const userController = require('./controllers/userController')
const importController = require('./controllers/importController')
const config = require('./config')

function initializeRoutes(app) {
  // Security headers
  app.use(helmet())

  // CORS configuration with allowlist
  const allowedOrigins = config.cors && config.cors.allowedOrigins ? config.cors.allowedOrigins : []
  const corsOptions = {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true)
      } else {
        callback(new Error('Not allowed by CORS'))
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true
  }
  app.use(cors(corsOptions))

  // Internationalization
  app.use(i18n.init)

  // Request logging and body parsing
  app.use(requestLogger)
  app.use(express.json())
  app.use(express.urlencoded({ extended: false }))

  // Health check endpoint
  app.get('/health', healthController.check)

  const router = express.Router()

  // Rate limiter for login to mitigate brute-force attacks
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // limit each IP to 10 requests per window
    message: { error: 'Too many login attempts from this IP, please try again after 15 minutes' }
  })

  router.post('/auth/login', loginLimiter, authController.login)

  // Protected routes
  router.use(authenticate)

  router
    .route('/users')
    .get(userController.list)
    .post(userController.create)

  router
    .route('/users/:id')
    .get(userController.get)
    .put(userController.update)
    .delete(userController.remove)

  router.post('/import', importController.importData)

  app.use('/api/v1', router)

  // 404 handler
  app.use((req, res, next) => next(createError(404, 'Not Found')))

  // Global error handler
  app.use(errorHandler)
}

module.exports = { initializeRoutes }
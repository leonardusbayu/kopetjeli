const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const rateLimit = require('express-rate-limit');

const logger = require('./utils/logger');
const { authenticate } = require('./middleware/auth');
const errorHandler = require('./middleware/errorHandler');
const healthController = require('./controllers/healthController');
const authController = require('./controllers/authController');
const userController = require('./controllers/userController');

async function createApp() {
  const app = express();

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  }));

  // CORS
  app.use(cors({
    origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['http://localhost:3000'],
    credentials: true
  }));

  // Logging
  app.use(morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim())
    }
  }));

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Static files
  app.use(express.static(path.join(__dirname, 'public')));

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: { error: 'Too many requests from this IP, please try again later.' }
  });
  app.use('/api', limiter);

  // Health check
  app.get('/health', healthController.check);

  // API routes
  const apiRouter = express.Router();

  // Auth routes (no authentication required)
  apiRouter.post('/auth/login', authController.login);

  // Protected routes
  apiRouter.use(authenticate);
  
  // User routes
  apiRouter.get('/users', userController.list);
  apiRouter.get('/users/:id', userController.get);
  apiRouter.post('/users', userController.create);
  apiRouter.put('/users/:id', userController.update);
  apiRouter.delete('/users/:id', userController.remove);

  app.use('/api/v1', apiRouter);

  // 404 handler
  app.use((req, res) => {
    if (req.path.startsWith('/api')) {
      res.status(404).json({ error: 'API endpoint not found' });
    } else {
      res.sendFile(path.join(__dirname, 'public', 'index.html'));
    }
  });

  // Error handler
  app.use(errorHandler);

  return app;
}

async function startServer() {
  try {
    const app = await createApp();
    const port = process.env.SERVER_PORT || 3000;
    
    const server = app.listen(port, () => {
      logger.info(`Server started on port ${port}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`Web interface: http://localhost:${port}`);
      logger.info(`API base URL: http://localhost:${port}/api/v1`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully');
      server.close(() => {
        logger.info('Process terminated');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT received, shutting down gracefully');
      server.close(() => {
        logger.info('Process terminated');
        process.exit(0);
      });
    });

    return server;
  } catch (error) {
    logger.error('Failed to start server', { error: error.message, stack: error.stack });
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { createApp, startServer };
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const yaml = require('yamljs');
const path = require('path');
const i18n = require('i18n');
const config = require('./config');
const logger = require('./utils/logger');
const database = require('./database');
const routes = require('./routes');
const setupMiddlewares = require('./setupMiddlewares');

async function createApp(config) {
  const app = express();
  app.locals.config = config;

  setupMiddlewares(app, config);
  configureSwagger(app);
  setupRoutes(app);

  try {
    await database.connect(config.database);
    logger.info('Database connection established');
  } catch (err) {
    logger.error('Database connection error', err);
    process.exit(1);
  }

  return app;
}

function setupRoutes(app) {
  app.get('/health', (req, res) => res.status(200).json({ status: 'OK' }));
  app.use('/api', routes);
  app.use((req, res) => res.status(404).json({ error: 'Not Found' }));
  app.use((err, req, res, next) => {
    logger.error(err.stack || err);
    res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
  });
}

function configureSwagger(app) {
  try {
    const swaggerDocument = yaml.load(path.join(__dirname, 'swagger.yaml'));
    app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, { explorer: true }));
  } catch (err) {
    logger.error('Failed to load Swagger document', err);
  }
}

module.exports = createApp;
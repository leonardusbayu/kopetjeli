const { loadEnvConfig, loadIniConfig } = require('../configloader');
const validateConfig = require('../configvalidator');

// Load environment variables
loadEnvConfig();

// Configuration schema for validation
const configSchema = {
  type: 'object',
  properties: {
    app: {
      type: 'object',
      properties: {
        name: { type: 'string', default: 'ModularExpressAPI' },
        environment: { type: 'string', default: 'development' },
        version: { type: 'string', default: '1.0.0' },
        baseUrl: { type: 'string', default: 'http://localhost:3000' }
      }
    },
    server: {
      type: 'object',
      properties: {
        host: { type: 'string', default: 'localhost' },
        port: { type: 'integer', default: 3000 },
        timeout: { type: 'integer', default: 120000 }
      }
    },
    database: {
      type: 'object',
      properties: {
        dialect: { type: 'string', default: 'postgres' },
        host: { type: 'string', default: 'localhost' },
        port: { type: 'integer', default: 5432 },
        username: { type: 'string', default: 'postgres' },
        password: { type: 'string', default: 'password' },
        database: { type: 'string', default: 'modular_api' }
      }
    },
    jwt: {
      type: 'object',
      properties: {
        secret: { type: 'string', default: 'fallback-secret' },
        expiresIn: { type: 'string', default: '1h' }
      }
    }
  }
};

async function loadConfig() {
  try {
    // Load INI configuration
    const iniConfig = await loadIniConfig('config.ini');
    
    // Substitute environment variables
    const config = JSON.parse(JSON.stringify(iniConfig, (key, value) => {
      if (typeof value === 'string' && value.startsWith('${') && value.endsWith('}')) {
        const envVar = value.slice(2, -1);
        return process.env[envVar] || value;
      }
      return value;
    }));

    // Validate configuration
    return validateConfig(config, configSchema);
  } catch (error) {
    console.warn('Failed to load INI config, using environment variables:', error.message);
    
    // Fallback to environment variables
    const envConfig = {
      app: {
        name: process.env.APP_NAME || 'ModularExpressAPI',
        environment: process.env.NODE_ENV || 'development',
        version: '1.0.0',
        baseUrl: process.env.BASE_URL || 'http://localhost:3000'
      },
      server: {
        host: process.env.SERVER_HOST || 'localhost',
        port: parseInt(process.env.SERVER_PORT) || 3000,
        timeout: 120000
      },
      database: {
        dialect: 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 5432,
        username: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'password',
        database: process.env.DB_NAME || 'modular_api'
      },
      jwt: {
        secret: process.env.JWT_SECRET || 'fallback-secret',
        expiresIn: '1h'
      },
      cors: {
        origins: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['http://localhost:3000']
      }
    };

    return validateConfig(envConfig, configSchema);
  }
}

module.exports = loadConfig();
const Mocha = require('mocha');
const glob = require('glob');
const { promisify } = require('util');
const path = require('path');
const config = require('./config');
const logger = require('./utils/logger');
const db = require('./utils/database');

const globAsync = promisify(glob);

async function setup() {
  try {
    logger.info('Setting up test environment');
    await db.connect(config.database.test);
    // clear test database
    const collections = await db.getCollections();
    await Promise.all(collections.map(name => db.clearCollection(name)));
    logger.info('Test database initialized');
  } catch (err) {
    logger.error('Error during setup', err);
    throw err;
  }
}

async function teardown() {
  try {
    logger.info('Tearing down test environment');
    await db.disconnect();
    logger.info('Test environment torn down');
  } catch (err) {
    logger.error('Error during teardown', err);
    throw err;
  }
}

async function runTests() {
  process.on('unhandledRejection', async reason => {
    logger.error('Unhandled Rejection:', reason);
    try {
      await teardown();
    } catch (err) {
      logger.error('Error during teardown in unhandledRejection', err);
    } finally {
      process.exit(1);
    }
  });

  try {
    await setup();

    const mocha = new Mocha({
      timeout: config.testTimeout || 5000,
      reporter: config.testReporter || 'spec'
    });

    const pattern = config.testPattern || 'tests/**/*.spec.js';
    let files = [];
    try {
      files = await globAsync(pattern);
    } catch (err) {
      logger.error(`Error finding test files with pattern: ${pattern}`, err);
    }

    if (files.length === 0) {
      logger.warn(`No test files found for pattern: ${pattern}`);
    } else {
      files.forEach(file => mocha.addFile(path.resolve(file)));
    }

    mocha.run(async failures => {
      try {
        await teardown();
      } catch (err) {
        logger.error('Error in teardown after tests', err);
      } finally {
        process.exit(failures ? 1 : 0);
      }
    });
  } catch (err) {
    logger.error('Error running tests', err);
    try {
      await teardown();
    } catch (e) {
      logger.error('Error in teardown after failure', e);
    } finally {
      process.exit(1);
    }
  }
}

if (require.main === module) {
  runTests();
}

module.exports = { setup, teardown, runTests };
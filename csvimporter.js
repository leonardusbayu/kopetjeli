const fs = require('fs');
const path = require('path');
const csvParser = require('csv-parser');
const logger = require('../config/logger');
const db = require('../models');

async function parseCsv(filePath, options = {}) {
  return new Promise((resolve, reject) => {
    const results = [];
    const fullPath = path.resolve(filePath);
    fs.createReadStream(fullPath)
      .on('error', err => {
        logger.error(`Error reading CSV file ${fullPath}: ${err.message}`);
        reject(err);
      })
      .pipe(csvParser(options.csvOptions || {}))
      .on('data', data => results.push(data))
      .on('end', () => {
        logger.info(`Parsed ${results.length} records from ${fullPath}`);
        resolve(results);
      })
      .on('error', err => {
        logger.error(`Error parsing CSV file ${fullPath}: ${err.message}`);
        reject(err);
      });
  });
}

async function importCsv(filePath, options = {}) {
  const {
    model,
    mapping,
    transform,
    batchSize = 1000,
    transactionOptions = {},
    csvOptions = {}
  } = options;

  let Model = model;
  if (typeof model === 'string') {
    Model = db[model];
  }
  if (!Model || typeof Model.bulkCreate !== 'function') {
    throw new Error('Invalid model specified for CSV import');
  }

  const sequelize = db.sequelize || Model.sequelize;
  const transaction = await sequelize.transaction(transactionOptions);

  const fullPath = path.resolve(filePath);
  let inserted = 0;
  let batch = [];
  let rowIndex = 0;

  try {
    const readStream = fs.createReadStream(fullPath);
    readStream.on('error', err => {
      throw new Error(`Error reading CSV file ${fullPath}: ${err.message}`);
    });

    const parser = readStream.pipe(csvParser(csvOptions));
    parser.on('error', err => {
      throw new Error(`Error parsing CSV file ${fullPath}: ${err.message}`);
    });

    for await (const row of parser) {
      rowIndex++;
      let item = {};

      if (mapping && typeof mapping === 'object') {
        Object.keys(mapping).forEach(targetField => {
          const sourceField = mapping[targetField];
          item[targetField] = row[sourceField];
        });
      } else {
        item = { ...row };
      }

      if (typeof transform === 'function') {
        try {
          item = transform(item);
        } catch (err) {
          throw new Error(`Error transforming row ${rowIndex}: ${err.message}`);
        }
      }

      batch.push(item);

      if (batch.length >= batchSize) {
        const created = await Model.bulkCreate(batch, { transaction });
        inserted += created.length;
        batch = [];
      }
    }

    if (batch.length > 0) {
      const created = await Model.bulkCreate(batch, { transaction });
      inserted += created.length;
    }

    await transaction.commit();
    logger.info(`Imported ${inserted} records into ${Model.name} from ${fullPath}`);
    return { inserted };
  } catch (err) {
    await transaction.rollback();
    logger.error(`Error importing CSV to ${Model.name}: ${err.message}`);
    throw err;
  }
}

module.exports = {
  parseCsv,
  importCsv
};
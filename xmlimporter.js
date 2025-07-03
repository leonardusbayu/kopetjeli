const fs = require('fs')
const { promises: fsp } = require('fs')
const XmlStream = require('xml-stream')
const { Parser } = require('xml2js')
const get = require('lodash.get')
const logger = require('../config/logger')

async function parseXml(filePath) {
  const xml = await fsp.readFile(filePath, 'utf8')
  const parser = new Parser({ explicitArray: false, mergeAttrs: true, trim: true })
  return parser.parseStringPromise(xml)
}

async function importXml(filePath, options = {}) {
  const {
    recordPath,
    transform = r => r,
    validate = () => true,
    model = null,
    batchSize = 100,
    logger: customLogger = null
  } = options
  const log = customLogger || logger

  if (!recordPath) {
    const msg = 'The recordPath option is required for streaming XML import'
    log.error(msg, { filePath })
    throw new Error(msg)
  }

  if (model && typeof model.bulkCreate !== 'function') {
    const msg = 'Invalid model: bulkCreate method not found'
    log.error(msg, { filePath, model })
    throw new Error(msg)
  }

  const recordPathArray = Array.isArray(recordPath) ? recordPath : recordPath.split('.')
  const recordTag = recordPathArray[recordPathArray.length - 1]

  let total = 0
  let success = 0
  const failures = []
  let batch = []

  return new Promise((resolve, reject) => {
    const fileStream = fs.createReadStream(filePath, { encoding: 'utf8' })
    const xml = new XmlStream(fileStream)

    xml.on('endElement: ' + recordTag, async rawRecord => {
      xml.pause()
      total++

      // merge attributes if any
      if (rawRecord.$) {
        Object.assign(rawRecord, rawRecord.$)
        delete rawRecord.$
      }

      let record
      try {
        record = transform(rawRecord)
      } catch (err) {
        failures.push({ record: rawRecord, error: `Transform error: ${err.stack || err.message}` })
        xml.resume()
        return
      }

      let isValid
      try {
        isValid = validate(record)
        if (!isValid) {
          failures.push({ record, error: 'Validation failed' })
          xml.resume()
          return
        }
      } catch (err) {
        failures.push({ record, error: `Validation error: ${err.stack || err.message}` })
        xml.resume()
        return
      }

      batch.push(record)

      if (batch.length >= batchSize) {
        try {
          if (model) {
            await model.bulkCreate(batch)
          }
          success += batch.length
        } catch (err) {
          for (const r of batch) {
            failures.push({ record: r, error: `DB error: ${err.stack || err.message}` })
          }
        } finally {
          batch = []
          xml.resume()
        }
      } else {
        xml.resume()
      }
    })

    xml.on('end', async () => {
      if (batch.length) {
        try {
          if (model) {
            await model.bulkCreate(batch)
          }
          success += batch.length
        } catch (err) {
          for (const r of batch) {
            failures.push({ record: r, error: `DB error: ${err.stack || err.message}` })
          }
        }
      }
      log.info('XML import completed', { filePath, total, success, failures: failures.length })
      resolve({ total, success, failures })
    })

    xml.on('error', err => {
      log.error('XML streaming parse failed', { filePath, error: err })
      reject(err)
    })

    fileStream.on('error', err => {
      log.error('File read failed', { filePath, error: err })
      reject(err)
    })
  })
}

module.exports = {
  parseXml,
  importXml
}
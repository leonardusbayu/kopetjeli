const Ajv = require('ajv');
const addFormats = require('ajv-formats');

const ajv = new Ajv({
  allErrors: true,
  removeAdditional: 'failing',
  useDefaults: true,
  coerceTypes: true,
  strict: false
});
addFormats(ajv);

const validatorCache = new WeakMap();

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function validateConfig(config, schema) {
  if (config === null || typeof config !== 'object') {
    throw new TypeError('Invalid config: expected a non-null object');
  }
  if (schema === null || typeof schema !== 'object') {
    throw new TypeError('Invalid schema: expected a non-null object');
  }

  let validate = validatorCache.get(schema);
  if (!validate) {
    validate = ajv.compile(schema);
    validatorCache.set(schema, validate);
  }

  const clonedConfig = deepClone(config);
  const valid = validate(clonedConfig);

  if (!valid && validate.errors) {
    const errors = validate.errors.map(err => {
      const path = err.instancePath || '';
      return `${path} ${err.message}`.trim();
    });
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }

  return clonedConfig;
}

module.exports = validateConfig;
const fs = require('fs').promises;
const path = require('path');
const dotenv = require('dotenv');
const ini = require('ini');

let loadedEnvPath = null;

function loadEnvConfig(envFilePath) {
  const filePath = envFilePath
    ? path.isAbsolute(envFilePath)
      ? envFilePath
      : path.resolve(process.cwd(), envFilePath)
    : path.resolve(process.cwd(), '.env');

  if (loadedEnvPath === null) {
    const result = dotenv.config({ path: filePath });
    if (result.error) {
      throw new Error(`Failed to load env file at ${filePath}: ${result.error.message}`);
    }
    loadedEnvPath = filePath;
    return process.env;
  }

  if (loadedEnvPath !== filePath) {
    throw new Error(
      `Environment already loaded from ${loadedEnvPath}, cannot load from ${filePath}`
    );
  }

  return process.env;
}

async function loadIniConfig(filePath) {
  if (!filePath) {
    throw new Error('INI config file path must be provided.');
  }

  const resolvedPath = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(process.cwd(), filePath);

  let data;
  try {
    data = await fs.readFile(resolvedPath, 'utf-8');
  } catch (err) {
    throw new Error(`Failed to read INI config file at ${resolvedPath}: ${err.message}`);
  }

  try {
    return ini.parse(data);
  } catch (err) {
    throw new Error(`Failed to parse INI config file at ${resolvedPath}: ${err.message}`);
  }
}

module.exports = {
  loadEnvConfig,
  loadIniConfig
};
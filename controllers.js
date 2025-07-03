const resourceService = require('../services/resourceService');
const logger = require('../logger');
const { validationResult } = require('express-validator');

const ALLOWED_QUERY = ['page', 'limit', 'sort', 'name', 'status'];
const ALLOWED_BODY = ['name', 'description', 'status'];

const pick = (source, allowed) =>
  allowed.reduce((obj, key) => {
    if (source[key] !== undefined) {
      obj[key] = source[key];
    }
    return obj;
  }, {});

const handleError = (error, req, res, context) => {
  if (error.name === 'ValidationError') {
    logger.warn(`${context} validation error`, { error });
    return res.status(400).json({ message: req.t('error.validation_failed'), details: error.details || [] });
  }
  if (error.code === 'ER_DUP_ENTRY' || error.code === 11000 || error.code === '23505') {
    logger.warn(`${context} duplicate resource`, { error });
    return res.status(409).json({ message: req.t('error.duplicate_resource') });
  }
  if (error.name === 'CastError') {
    logger.warn(`${context} invalid id format`, { error });
    return res.status(400).json({ message: req.t('error.invalid_id') });
  }
  logger.error(`${context} failed`, { error, trace: error.stack });
  return res.status(500).json({ message: req.t('error.unexpected') });
};

const getAll = async (req, res) => {
  const filters = pick(req.query, ALLOWED_QUERY);
  try {
    const items = await resourceService.getAll(filters);
    res.status(200).json(items);
  } catch (error) {
    return handleError(error, req, res, 'getAll');
  }
};

const getById = async (req, res) => {
  const { id } = req.params;
  try {
    const item = await resourceService.getById(id);
    if (!item) {
      logger.warn(`Resource not found: id=${id}`);
      return res.status(404).json({ message: req.t('error.resource_not_found') });
    }
    res.status(200).json(item);
  } catch (error) {
    return handleError(error, req, res, `getById id=${id}`);
  }
};

const create = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn('Validation failed on create', { errors: errors.array() });
    return res.status(400).json({ message: req.t('error.validation_failed'), details: errors.array() });
  }
  const data = pick(req.body, ALLOWED_BODY);
  try {
    const newItem = await resourceService.create(data);
    const location = `${req.baseUrl}/${newItem.id}`;
    res.location(location).status(201).json(newItem);
  } catch (error) {
    return handleError(error, req, res, 'create');
  }
};

const update = async (req, res) => {
  const { id } = req.params;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn('Validation failed on update', { id, errors: errors.array() });
    return res.status(400).json({ message: req.t('error.validation_failed'), details: errors.array() });
  }
  const data = pick(req.body, ALLOWED_BODY);
  try {
    const updatedItem = await resourceService.update(id, data);
    if (!updatedItem) {
      logger.warn(`Resource not found: id=${id}`);
      return res.status(404).json({ message: req.t('error.resource_not_found') });
    }
    res.status(200).json(updatedItem);
  } catch (error) {
    return handleError(error, req, res, `update id=${id}`);
  }
};

const remove = async (req, res) => {
  const { id } = req.params;
  try {
    const deleted = await resourceService.remove(id);
    if (!deleted) {
      logger.warn(`Resource not found: id=${id}`);
      return res.status(404).json({ message: req.t('error.resource_not_found') });
    }
    res.status(204).end();
  } catch (error) {
    return handleError(error, req, res, `remove id=${id}`);
  }
};

module.exports = { getAll, getById, create, update, remove };
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

// Mock user data (in a real app, this would come from a database)
const users = [
  {
    id: 1,
    username: 'admin',
    email: 'admin@example.com',
    passwordHash: '$2b$10$KbQiMZc5eYQAh8FERp7uIOyc5oFSyIEbX8kdkC9Ypb6uRWWsB8IXe', // password: admin123
    role: 'admin'
  },
  {
    id: 2,
    username: 'user',
    email: 'user@example.com',
    passwordHash: '$2b$10$D.uYKQZkqEwfnlQGzcxFOOuv2G/O3y.17K0O3XKUyPN4QBJ9SyKpC', // password: user123
    role: 'user'
  }
];

const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    const user = users.find(u => u.username === username);
    if (!user) {
      logger.warn('Login attempt with invalid username', { username, ip: req.ip });
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      logger.warn('Login attempt with invalid password', { username, ip: req.ip });
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '1h' }
    );

    logger.info('User logged in successfully', { username, ip: req.ip });
    res.json({ 
      token, 
      user: { 
        id: user.id, 
        username: user.username, 
        email: user.email, 
        role: user.role 
      } 
    });
  } catch (error) {
    logger.error('Login error', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = { login };
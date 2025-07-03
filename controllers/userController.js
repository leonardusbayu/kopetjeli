const logger = require('../utils/logger');

// Mock user data
const users = [
  {
    id: 1,
    username: 'admin',
    email: 'admin@example.com',
    role: 'admin',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: 2,
    username: 'user',
    email: 'user@example.com',
    role: 'user',
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-02')
  },
  {
    id: 3,
    username: 'manager',
    email: 'manager@example.com',
    role: 'manager',
    createdAt: new Date('2024-01-03'),
    updatedAt: new Date('2024-01-03')
  }
];

const list = async (req, res) => {
  try {
    logger.info('Fetching user list', { requestedBy: req.user?.username });
    res.json(users.map(user => ({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    })));
  } catch (error) {
    logger.error('Error fetching users', { error: error.message });
    res.status(500).json({ message: 'Internal server error' });
  }
};

const get = async (req, res) => {
  try {
    const { id } = req.params;
    const user = users.find(u => u.id === parseInt(id));
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    logger.info('Fetching user details', { userId: id, requestedBy: req.user?.username });
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    });
  } catch (error) {
    logger.error('Error fetching user', { error: error.message });
    res.status(500).json({ message: 'Internal server error' });
  }
};

const create = async (req, res) => {
  try {
    const { username, email, role = 'user' } = req.body;
    
    if (!username || !email) {
      return res.status(400).json({ message: 'Username and email are required' });
    }

    const newUser = {
      id: users.length + 1,
      username,
      email,
      role,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    users.push(newUser);
    logger.info('User created', { userId: newUser.id, createdBy: req.user?.username });
    res.status(201).json(newUser);
  } catch (error) {
    logger.error('Error creating user', { error: error.message });
    res.status(500).json({ message: 'Internal server error' });
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const userIndex = users.findIndex(u => u.id === parseInt(id));
    
    if (userIndex === -1) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { username, email, role } = req.body;
    const user = users[userIndex];

    if (username) user.username = username;
    if (email) user.email = email;
    if (role) user.role = role;
    user.updatedAt = new Date();

    logger.info('User updated', { userId: id, updatedBy: req.user?.username });
    res.json(user);
  } catch (error) {
    logger.error('Error updating user', { error: error.message });
    res.status(500).json({ message: 'Internal server error' });
  }
};

const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const userIndex = users.findIndex(u => u.id === parseInt(id));
    
    if (userIndex === -1) {
      return res.status(404).json({ message: 'User not found' });
    }

    users.splice(userIndex, 1);
    logger.info('User deleted', { userId: id, deletedBy: req.user?.username });
    res.status(204).send();
  } catch (error) {
    logger.error('Error deleting user', { error: error.message });
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = { list, get, create, update, remove };
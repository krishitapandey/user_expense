const db = require('../../database/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { SECRET } = require('../../middleware/auth');
const { UserSchema } = require('./user.schema');

const UserService = {
  async register(inputData) {
    const validated = UserSchema.parse(inputData);
    const existing = await db('users').where({ email: validated.email }).first();
    if (existing) throw new Error('USER_EXISTS');

    const hashedPassword = await bcrypt.hash(validated.password, 10);
    const id = `u_${Date.now()}`;

    await db('users').insert({
      id,
      name: validated.name,
      email: validated.email,
      password: hashedPassword,
      role: validated.role
    });

    return { id, name: validated.name, email: validated.email, role: validated.role };
  },

  async login(email, password) {
    const user = await db('users').where({ email }).first();
    if (!user) throw new Error('INVALID_CREDENTIALS');

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new Error('INVALID_CREDENTIALS');

    const token = jwt.sign({ id: user.id, role: user.role }, SECRET, { expiresIn: '1d' });
    return { token, user: { id: user.id, name: user.name, role: user.role } };
  }
};

module.exports = UserService;
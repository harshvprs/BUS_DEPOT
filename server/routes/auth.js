const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

router.post('/login', async (req, res) => {
  try {
    const { employee_id, password } = req.body;
    if (!employee_id || !password) {
      return res.status(400).json({ error: 'Employee ID and password are required' });
    }

    const { rows } = await db.query(
      'SELECT id, name, employee_id, role, depot_id, password_hash, is_active FROM users WHERE employee_id = $1',
      [employee_id.toUpperCase()]
    );

    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    if (!user.is_active) return res.status(403).json({ error: 'Account deactivated. Contact admin.' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user.id, name: user.name, employee_id: user.employee_id, role: user.role, depot_id: user.depot_id },
      JWT_SECRET, { expiresIn: '24h' }
    );

    res.json({
      token,
      user: { id: user.id, name: user.name, employee_id: user.employee_id, role: user.role, depot_id: user.depot_id }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { authMiddleware, roleGuard } = require('../middleware/auth');

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      const { search } = req.query;
      let sql = `SELECT u.id, u.name, u.employee_id, u.phone, u.role, u.is_active, u.created_at,
                   (SELECT r.route_name FROM shifts s JOIN routes r ON s.route_id = r.id
                    WHERE s.employee_id = u.id AND s.date = CURRENT_DATE LIMIT 1) as current_route
                 FROM users u WHERE u.role = 'employee'`;
      const params = [];
      if (search) {
        sql += ` AND (u.name ILIKE $1 OR u.employee_id ILIKE $1)`;
        params.push(`%${search}%`);
      }
      sql += ' ORDER BY u.employee_id';
      const { rows } = await db.query(sql, params);
      res.json(rows);
    } else {
      const { rows } = await db.query(
        'SELECT id, name, employee_id, phone, role, is_active, created_at FROM users WHERE id = $1',
        [req.user.id]
      );
      res.json(rows[0]);
    }
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.post('/', authMiddleware, roleGuard('admin'), async (req, res) => {
  try {
    const { name, employee_id, phone, password } = req.body;
    if (!name || !employee_id || !password) return res.status(400).json({ error: 'Name, employee ID, and password are required' });

    const existing = await db.query('SELECT id FROM users WHERE employee_id = $1', [employee_id.toUpperCase()]);
    if (existing.rows.length > 0) return res.status(409).json({ error: 'Employee ID already exists' });

    const hash = await bcrypt.hash(password, 10);
    const { rows } = await db.query(
      `INSERT INTO users (name, employee_id, role, phone, password_hash, depot_id) VALUES ($1, $2, 'employee', $3, $4, $5) RETURNING id, name, employee_id, phone, role, is_active`,
      [name, employee_id.toUpperCase(), phone || null, hash, req.user.depot_id]
    );
    res.status(201).json(rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.put('/:id', authMiddleware, roleGuard('admin'), async (req, res) => {
  try {
    const { name, phone, is_active } = req.body;
    const existing = await db.query("SELECT * FROM users WHERE id = $1 AND role = 'employee'", [req.params.id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Employee not found' });
    const emp = existing.rows[0];

    const { rows } = await db.query(
      'UPDATE users SET name = $1, phone = $2, is_active = $3 WHERE id = $4 RETURNING id, name, employee_id, phone, role, is_active',
      [name ?? emp.name, phone ?? emp.phone, is_active !== undefined ? is_active : emp.is_active, req.params.id]
    );
    res.json(rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;

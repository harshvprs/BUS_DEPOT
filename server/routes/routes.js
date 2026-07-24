const express = require('express');
const db = require('../db');
const { authMiddleware, roleGuard } = require('../middleware/auth');

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT id, depot_id, route_name, route_code, required_staff_count FROM routes ORDER BY route_code');
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.post('/', authMiddleware, roleGuard('admin'), async (req, res) => {
  try {
    const { route_name, route_code, required_staff_count } = req.body;
    if (!route_name) return res.status(400).json({ error: 'Route name is required' });
    const { rows } = await db.query(
      `INSERT INTO routes (depot_id, route_name, route_code, required_staff_count) VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.user.depot_id, route_name, route_code || null, required_staff_count || 2]
    );
    res.status(201).json(rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.put('/:id', authMiddleware, roleGuard('admin'), async (req, res) => {
  try {
    const { route_name, route_code, required_staff_count } = req.body;
    const existing = await db.query('SELECT * FROM routes WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Route not found' });
    const r = existing.rows[0];
    const { rows } = await db.query(
      'UPDATE routes SET route_name = $1, route_code = $2, required_staff_count = $3 WHERE id = $4 RETURNING *',
      [route_name ?? r.route_name, route_code ?? r.route_code, required_staff_count ?? r.required_staff_count, req.params.id]
    );
    res.json(rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;

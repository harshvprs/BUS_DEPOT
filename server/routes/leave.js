const express = require('express');
const db = require('../db');
const { authMiddleware, roleGuard } = require('../middleware/auth');

const router = express.Router();

router.post('/', authMiddleware, roleGuard('employee'), async (req, res) => {
  try {
    const { leave_type, start_date, end_date, reason } = req.body;
    if (!leave_type || !start_date || !end_date) return res.status(400).json({ error: 'Leave type, start date, and end date are required' });
    if (new Date(start_date) > new Date(end_date)) return res.status(400).json({ error: 'Start date must be before end date' });
    if (new Date(start_date) < new Date(new Date().toISOString().split('T')[0])) return res.status(400).json({ error: 'Cannot apply for leave in the past' });

    const year = new Date().getFullYear();
    const { rows: usedRows } = await db.query(
      `SELECT COALESCE(SUM(end_date - start_date + 1), 0) as days_used
       FROM leave_requests WHERE employee_id = $1 AND status = 'approved' AND EXTRACT(YEAR FROM start_date) = $2`,
      [req.user.id, year]
    );

    const daysRequested = Math.ceil((new Date(end_date) - new Date(start_date)) / (1000 * 60 * 60 * 24)) + 1;
    const balance = 12 - parseInt(usedRows[0].days_used);
    if (daysRequested > balance) {
      return res.status(400).json({ error: `Insufficient leave balance. ${balance} days remaining, requesting ${daysRequested} days.` });
    }

    const { rows: leaveRows } = await db.query(
      `INSERT INTO leave_requests (employee_id, leave_type, start_date, end_date, reason) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.user.id, leave_type, start_date, end_date, reason || null]
    );
    const leave = leaveRows[0];

    const { rows: admins } = await db.query("SELECT id FROM users WHERE role = 'admin'");
    for (const a of admins) {
      await db.query('INSERT INTO notifications (user_id, message) VALUES ($1, $2)', [a.id, `New leave request from ${req.user.name}: ${leave_type} (${start_date} to ${end_date})`]);
    }

    res.status(201).json(leave);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.get('/', authMiddleware, async (req, res) => {
  try {
    const { status: filterStatus } = req.query;
    if (req.user.role === 'admin') {
      let sql = `SELECT lr.*, u.name, u.employee_id as emp_id FROM leave_requests lr JOIN users u ON lr.employee_id = u.id`;
      const params = [];
      if (filterStatus) { sql += ` WHERE lr.status = $1`; params.push(filterStatus); }
      sql += ` ORDER BY CASE lr.status WHEN 'pending' THEN 0 ELSE 1 END, lr.applied_on DESC`;
      const { rows } = await db.query(sql, params);
      res.json(rows);
    } else {
      let sql = `SELECT * FROM leave_requests WHERE employee_id = $1`;
      const params = [req.user.id];
      if (filterStatus) { sql += ` AND status = $2`; params.push(filterStatus); }
      sql += ' ORDER BY applied_on DESC';
      const { rows } = await db.query(sql, params);
      res.json(rows);
    }
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.get('/balance', authMiddleware, async (req, res) => {
  try {
    const empId = req.query.employee_id ? parseInt(req.query.employee_id) : req.user.id;
    const year = new Date().getFullYear();
    const { rows } = await db.query(
      `SELECT COALESCE(SUM(end_date - start_date + 1), 0) as days_used
       FROM leave_requests WHERE employee_id = $1 AND status = 'approved' AND EXTRACT(YEAR FROM start_date) = $2`,
      [empId, year]
    );
    const daysUsed = parseInt(rows[0].days_used);
    res.json({ total: 12, used: daysUsed, remaining: 12 - daysUsed });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.put('/:id/:action', authMiddleware, roleGuard('admin'), async (req, res) => {
  try {
    const { action } = req.params;
    if (!['approve', 'reject'].includes(action)) return res.status(400).json({ error: 'Invalid action' });
    const status = action === 'approve' ? 'approved' : 'rejected';
    const { admin_comment } = req.body;

    const leaveRes = await db.query('SELECT * FROM leave_requests WHERE id = $1', [req.params.id]);
    if (leaveRes.rows.length === 0) return res.status(404).json({ error: 'Leave request not found' });
    const leave = leaveRes.rows[0];

    let warnings = [];
    if (action === 'approve') {
      const { rows: routeCheck } = await db.query(
        `SELECT r.route_name, r.route_code, r.required_staff_count, s.date,
                COUNT(DISTINCT s2.employee_id) as assigned_count
         FROM shifts s
         JOIN routes r ON s.route_id = r.id
         LEFT JOIN shifts s2 ON s2.route_id = s.route_id AND s2.date = s.date AND s2.employee_id != $1
         WHERE s.employee_id = $2 AND s.date BETWEEN $3 AND $4
         GROUP BY r.id, s.date, r.route_name, r.route_code, r.required_staff_count
         HAVING COUNT(DISTINCT s2.employee_id) < r.required_staff_count`,
        [leave.employee_id, leave.employee_id, leave.start_date, leave.end_date]
      );
      warnings = routeCheck.map(r => `Route ${r.route_code} will be understaffed on ${new Date(r.date).toLocaleDateString()}: ${r.assigned_count}/${r.required_staff_count} staff`);
    }

    await db.query('UPDATE leave_requests SET status = $1, admin_comment = $2 WHERE id = $3', [status, admin_comment || null, req.params.id]);
    await db.query('INSERT INTO notifications (user_id, message) VALUES ($1, $2)', [leave.employee_id, `Your ${leave.leave_type} request (${new Date(leave.start_date).toLocaleDateString()} to ${new Date(leave.end_date).toLocaleDateString()}) has been ${status}${admin_comment ? ': ' + admin_comment : ''}`]);

    const updated = await db.query('SELECT * FROM leave_requests WHERE id = $1', [req.params.id]);
    res.json({ ...updated.rows[0], warnings });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;

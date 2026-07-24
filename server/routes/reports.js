const express = require('express');
const db = require('../db');
const { authMiddleware, roleGuard } = require('../middleware/auth');

const router = express.Router();

router.get('/dashboard', authMiddleware, roleGuard('admin'), async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const [{ rows: staffRows }, { rows: presentRows }, { rows: leaveRows }, { rows: understaffedRows }] = await Promise.all([
      db.query("SELECT COUNT(*) as count FROM users WHERE role = 'employee' AND is_active = true"),
      db.query(`SELECT COUNT(DISTINCT employee_id) as count FROM attendance WHERE date = $1 AND status IN ('present','late')`, [today]),
      db.query(`SELECT COUNT(DISTINCT employee_id) as count FROM leave_requests WHERE status = 'approved' AND $1 BETWEEN start_date AND end_date`, [today]),
      db.query(
        `SELECT COUNT(*) as count FROM (
          SELECT r.id FROM routes r
          LEFT JOIN shifts s ON s.route_id = r.id AND s.date = $1
          LEFT JOIN attendance a ON a.shift_id = s.id AND a.status IN ('present','late')
          GROUP BY r.id
          HAVING COUNT(DISTINCT a.employee_id) < r.required_staff_count
        ) sub`, [today]
      )
    ]);

    res.json({
      total_staff: parseInt(staffRows[0].count),
      present_today: parseInt(presentRows[0].count),
      on_leave: parseInt(leaveRows[0].count),
      understaffed_routes: parseInt(understaffedRows[0].count),
    });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.get('/attendance-trend', authMiddleware, roleGuard('admin'), async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT a.date,
              SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present,
              SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as late,
              SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent,
              COUNT(*) as total
       FROM attendance a WHERE a.date >= CURRENT_DATE - INTERVAL '30 days'
       GROUP BY a.date ORDER BY a.date`
    );
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.get('/employee-attendance', authMiddleware, roleGuard('admin'), async (req, res) => {
  try {
    const { from, to } = req.query;
    const startDate = from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = to || new Date().toISOString().split('T')[0];

    const { rows } = await db.query(
      `SELECT u.name, u.employee_id,
              SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present,
              SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as late,
              SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent,
              COUNT(a.id) as total
       FROM users u
       LEFT JOIN attendance a ON a.employee_id = u.id AND a.date BETWEEN $1 AND $2
       WHERE u.role = 'employee' AND u.is_active = true
       GROUP BY u.id, u.name, u.employee_id ORDER BY u.name`,
      [startDate, endDate]
    );
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.get('/punctuality', authMiddleware, roleGuard('admin'), async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as on_time,
              SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late,
              SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent
       FROM attendance WHERE date >= CURRENT_DATE - INTERVAL '30 days'`
    );
    res.json(rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.get('/download/attendance', authMiddleware, roleGuard('admin'), async (req, res) => {
  try {
    const { from, to } = req.query;
    const startDate = from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = to || new Date().toISOString().split('T')[0];

    const { rows } = await db.query(
      `SELECT u.employee_id, u.name, a.date, a.status, a.check_in_time, a.check_out_time, r.route_name
       FROM attendance a JOIN users u ON a.employee_id = u.id
       LEFT JOIN shifts s ON a.shift_id = s.id LEFT JOIN routes r ON s.route_id = r.id
       WHERE a.date BETWEEN $1 AND $2 ORDER BY a.date, u.name`,
      [startDate, endDate]
    );

    const csv = 'Employee ID,Name,Date,Status,Check In,Check Out,Route\n' +
      rows.map(r => `${r.employee_id},${r.name},${r.date.toLocaleDateString('en-CA')},${r.status},${r.check_in_time || ''},${r.check_out_time || ''},${r.route_name || ''}`).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=attendance_${startDate}_to_${endDate}.csv`);
    res.send(csv);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.get('/download/leave', authMiddleware, roleGuard('admin'), async (req, res) => {
  try {
    const { from, to } = req.query;
    const startDate = from || `${new Date().getFullYear()}-01-01`;
    const endDate = to || new Date().toISOString().split('T')[0];

    const { rows } = await db.query(
      `SELECT u.employee_id, u.name, lr.leave_type, lr.start_date, lr.end_date, lr.reason, lr.status, lr.applied_on
       FROM leave_requests lr JOIN users u ON lr.employee_id = u.id
       WHERE lr.start_date BETWEEN $1 AND $2 ORDER BY lr.applied_on DESC`,
      [startDate, endDate]
    );

    const csv = 'Employee ID,Name,Leave Type,Start Date,End Date,Reason,Status,Applied On\n' +
      rows.map(r => `${r.employee_id},${r.name},${r.leave_type},${r.start_date.toLocaleDateString('en-CA')},${r.end_date.toLocaleDateString('en-CA')},"${(r.reason || '').replace(/"/g, '""')}",${r.status},${r.applied_on}`).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=leave_report_${startDate}_to_${endDate}.csv`);
    res.send(csv);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;

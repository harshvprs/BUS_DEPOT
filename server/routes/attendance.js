const express = require('express');
const crypto = require('crypto');
const db = require('../db');
const { authMiddleware, roleGuard } = require('../middleware/auth');
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const router = express.Router();
const QR_SECRET = process.env.JWT_SECRET;
const GRACE_PERIOD_MINUTES = 15;

router.post('/generate-qr', authMiddleware, roleGuard('admin'), (req, res) => {
  try {
    const depotId = req.user.depot_id;
    const date = new Date().toISOString().split('T')[0];
    const timestamp = Date.now();
    const payload = `${depotId}:${date}:${timestamp}`;
    const hmac = crypto.createHmac('sha256', QR_SECRET).update(payload).digest('hex').slice(0, 16);
    res.json({ qr_data: `${payload}:${hmac}`, expires_at: new Date(timestamp + 15 * 60 * 1000).toISOString(), depot_id: depotId, date });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.post('/checkin', authMiddleware, roleGuard('employee'), async (req, res) => {
  try {
    const { qr_token } = req.body;
    if (!qr_token) return res.status(400).json({ error: 'QR token is required' });

    const parts = qr_token.split(':');
    if (parts.length !== 4) return res.status(400).json({ error: 'Invalid QR code' });

    const [depotId, date, timestamp, receivedHmac] = parts;
    const payload = `${depotId}:${date}:${timestamp}`;
    const expectedHmac = crypto.createHmac('sha256', QR_SECRET).update(payload).digest('hex').slice(0, 16);
    if (receivedHmac !== expectedHmac) return res.status(400).json({ error: 'Invalid QR code' });
    if (Date.now() - parseInt(timestamp) > 15 * 60 * 1000) return res.status(400).json({ error: 'QR code has expired. Ask admin to regenerate.' });

    const today = new Date().toISOString().split('T')[0];
    if (date !== today) return res.status(400).json({ error: 'QR code is not for today' });

    const shiftResult = await db.query('SELECT id, start_time FROM shifts WHERE employee_id = $1 AND date = $2', [req.user.id, today]);
    if (shiftResult.rows.length === 0) return res.status(400).json({ error: 'No shift assigned for today' });
    const shift = shiftResult.rows[0];

    const existingResult = await db.query('SELECT id FROM attendance WHERE employee_id = $1 AND date = $2 AND check_in_time IS NOT NULL', [req.user.id, today]);
    if (existingResult.rows.length > 0) return res.status(400).json({ error: 'Already checked in today' });

    const now = new Date();
    const [sh, sm] = shift.start_time.split(':').map(Number);
    const shiftStart = new Date(now); shiftStart.setHours(sh, sm, 0, 0);
    const minutesLate = (now - shiftStart) / (1000 * 60);
    const status = minutesLate > GRACE_PERIOD_MINUTES ? 'late' : 'present';

    await db.query(
      `INSERT INTO attendance (employee_id, shift_id, check_in_time, status, date) VALUES ($1, $2, $3, $4, $5)`,
      [req.user.id, shift.id, now.toISOString(), status, today]
    );

    res.json({ message: 'Checked in successfully', status, check_in_time: now.toISOString() });
  } catch (err) { console.error('Checkin error:', err); res.status(500).json({ error: 'Server error' }); }
});

router.post('/checkout', authMiddleware, roleGuard('employee'), async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const attResult = await db.query('SELECT id FROM attendance WHERE employee_id = $1 AND date = $2 AND check_in_time IS NOT NULL AND check_out_time IS NULL', [req.user.id, today]);
    if (attResult.rows.length === 0) return res.status(400).json({ error: 'No active check-in found for today' });

    const now = new Date().toISOString();
    await db.query('UPDATE attendance SET check_out_time = $1 WHERE id = $2', [now, attResult.rows[0].id]);
    await db.query("UPDATE shifts SET status = 'completed' WHERE employee_id = $1 AND date = $2", [req.user.id, today]);
    res.json({ message: 'Checked out successfully', check_out_time: now });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.get('/live', authMiddleware, roleGuard('admin'), async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const { rows } = await db.query(
      `SELECT u.name, u.employee_id, r.route_name, r.route_code,
              s.start_time, s.end_time,
              a.check_in_time, a.check_out_time, a.status as attendance_status,
              s.status as shift_status
       FROM shifts s
       JOIN users u ON s.employee_id = u.id
       JOIN routes r ON s.route_id = r.id
       LEFT JOIN attendance a ON a.shift_id = s.id AND a.date = $1
       WHERE s.date = $2
       ORDER BY r.route_code, s.start_time`,
      [today, today]
    );
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.post('/mark-absent', authMiddleware, roleGuard('admin'), async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const { rows: unattended } = await db.query(
      `SELECT s.id as shift_id, s.employee_id FROM shifts s
       WHERE s.date = $1 AND NOT EXISTS (SELECT 1 FROM attendance a WHERE a.shift_id = s.id AND a.date = $2)`,
      [today, today]
    );

    for (const s of unattended) {
      await db.query(`INSERT INTO attendance (employee_id, shift_id, status, date) VALUES ($1, $2, 'absent', $3)`, [s.employee_id, s.shift_id, today]);
    }

    await db.query("UPDATE shifts SET status = 'missed' WHERE date = $1 AND status = 'scheduled'", [today]);
    res.json({ message: `Marked ${unattended.length} employees as absent`, count: unattended.length });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.get('/my-today', authMiddleware, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const { rows } = await db.query(
      `SELECT a.*, s.start_time, s.end_time, r.route_name, r.route_code
       FROM attendance a JOIN shifts s ON a.shift_id = s.id JOIN routes r ON s.route_id = r.id
       WHERE a.employee_id = $1 AND a.date = $2`,
      [req.user.id, today]
    );
    res.json(rows[0] || null);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;

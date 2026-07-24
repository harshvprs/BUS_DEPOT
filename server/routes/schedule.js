const express = require('express');
const db = require('../db');
const { authMiddleware, roleGuard } = require('../middleware/auth');

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  try {
    const { week } = req.query;
    const weekStart = week || getMonday(new Date()).toISOString().split('T')[0];
    const weekEnd = new Date(new Date(weekStart).getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    let rows;
    if (req.user.role === 'admin') {
      const result = await db.query(
        `SELECT s.id, s.route_id, s.employee_id, TO_CHAR(s.date, 'YYYY-MM-DD') as date, s.start_time, s.end_time, s.status,
                u.name as employee_name, u.employee_id as emp_code, r.route_name, r.route_code
         FROM shifts s JOIN users u ON s.employee_id = u.id JOIN routes r ON s.route_id = r.id
         WHERE s.date BETWEEN $1 AND $2 ORDER BY r.route_code, s.date, s.start_time`,
        [weekStart, weekEnd]
      );
      rows = result.rows;
    } else {
      const result = await db.query(
        `SELECT s.id, s.route_id, s.employee_id, TO_CHAR(s.date, 'YYYY-MM-DD') as date, s.start_time, s.end_time, s.status, r.route_name, r.route_code 
         FROM shifts s JOIN routes r ON s.route_id = r.id
         WHERE s.employee_id = $1 AND s.date BETWEEN $2 AND $3 ORDER BY s.date, s.start_time`,
        [req.user.id, weekStart, weekEnd]
      );
      rows = result.rows;
    }
    res.json({ week_start: weekStart, week_end: weekEnd, shifts: rows });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.post('/assign', authMiddleware, roleGuard('admin'), async (req, res) => {
  try {
    const { route_id, employee_id, date, start_time, end_time } = req.body;
    if (!route_id || !employee_id || !date || !start_time || !end_time) return res.status(400).json({ error: 'All fields are required' });

    const existing = await db.query('SELECT id FROM shifts WHERE employee_id = $1 AND date = $2', [employee_id, date]);
    if (existing.rows.length > 0) return res.status(400).json({ error: 'Employee already has a shift on this date' });

    const onLeave = await db.query("SELECT id FROM leave_requests WHERE employee_id = $1 AND status = 'approved' AND $2 BETWEEN start_date AND end_date", [employee_id, date]);
    if (onLeave.rows.length > 0) return res.status(400).json({ error: 'Employee is on approved leave on this date' });

    const { rows: lastShiftRows } = await db.query("SELECT end_time, date FROM shifts WHERE employee_id = $1 AND date = DATE($2) - 1 ORDER BY end_time DESC LIMIT 1", [employee_id, date]);
    if (lastShiftRows.length > 0) {
      const lastShift = lastShiftRows[0];
      const lastEnd = new Date(`${lastShift.date.toISOString().split('T')[0]}T${lastShift.end_time}`);
      const newStart = new Date(`${date}T${start_time}`);
      const restHours = (newStart - lastEnd) / (1000 * 60 * 60);
      if (restHours < 8) return res.status(400).json({ error: `Insufficient rest. Only ${restHours.toFixed(1)} hours (minimum 8 required)` });
    }

    const { rows } = await db.query('INSERT INTO shifts (route_id, employee_id, date, start_time, end_time) VALUES ($1, $2, $3, $4, $5) RETURNING *', [route_id, employee_id, date, start_time, end_time]);
    res.status(201).json(rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.delete('/:id', authMiddleware, roleGuard('admin'), async (req, res) => {
  try {
    await db.query('DELETE FROM shifts WHERE id = $1', [req.params.id]);
    res.json({ message: 'Shift deleted' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.post('/auto-suggest', authMiddleware, roleGuard('admin'), async (req, res) => {
  try {
    const { week } = req.body;
    const weekStart = week || getMonday(new Date()).toISOString().split('T')[0];
    const weekEnd = new Date(new Date(weekStart).getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const [{ rows: routes }, { rows: employees }, { rows: leaves }, { rows: existingShifts }] = await Promise.all([
      db.query('SELECT * FROM routes ORDER BY route_code'),
      db.query("SELECT id, name, employee_id FROM users WHERE role = 'employee' AND is_active = true"),
      db.query("SELECT employee_id, TO_CHAR(start_date, 'YYYY-MM-DD') as start_date, TO_CHAR(end_date, 'YYYY-MM-DD') as end_date FROM leave_requests WHERE status = 'approved' AND start_date <= $1 AND end_date >= $2", [weekEnd, weekStart]),
      db.query("SELECT employee_id, TO_CHAR(date, 'YYYY-MM-DD') as date, route_id FROM shifts WHERE date BETWEEN $1 AND $2", [weekStart, weekEnd])
    ]);

    const suggestions = [];
    const existingSet = new Set(existingShifts.map(s => `${s.employee_id}:${s.date}`));

    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const d = new Date(new Date(weekStart).getTime() + dayOffset * 24 * 60 * 60 * 1000);
      if (d.getDay() === 0) continue; // Sunday off
      const dateStr = d.toISOString().split('T')[0];

      for (const route of routes) {
        const alreadyCount = existingShifts.filter(s => s.route_id === route.id && s.date === dateStr).length;
        const suggestedCount = suggestions.filter(s => s.route_id === route.id && s.date === dateStr).length;
        const needed = route.required_staff_count - alreadyCount - suggestedCount;
        if (needed <= 0) continue;

        const eligible = employees.filter(emp => {
          if (existingSet.has(`${emp.id}:${dateStr}`)) return false;
          if (suggestions.some(s => s.employee_id === emp.id && s.date === dateStr)) return false;
          return !leaves.some(l => l.employee_id === emp.id && dateStr >= l.start_date && dateStr <= l.end_date);
        });

        eligible.sort((a, b) => {
          const countA = existingShifts.filter(s => s.employee_id === a.id).length + suggestions.filter(s => s.employee_id === a.id).length;
          const countB = existingShifts.filter(s => s.employee_id === b.id).length + suggestions.filter(s => s.employee_id === b.id).length;
          return countA - countB;
        });

        for (let i = 0; i < Math.min(needed, eligible.length); i++) {
          const emp = eligible[i];
          suggestions.push({
            route_id: route.id, route_name: route.route_name, route_code: route.route_code,
            employee_id: emp.id, employee_name: emp.name, emp_code: emp.employee_id,
            date: dateStr, start_time: '06:00', end_time: '14:00',
          });
        }
      }
    }
    res.json({ suggestions, week_start: weekStart });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.post('/publish', authMiddleware, roleGuard('admin'), async (req, res) => {
  const client = await db.pool.connect();
  try {
    const { shifts } = req.body;
    if (!shifts || !Array.isArray(shifts)) return res.status(400).json({ error: 'Shifts array is required' });

    await client.query('BEGIN');
    const notified = new Set();
    let count = 0;

    for (const s of shifts) {
      const existing = await client.query('SELECT id FROM shifts WHERE employee_id = $1 AND date = $2', [s.employee_id, s.date]);
      if (existing.rows.length > 0) continue;
      
      await client.query('INSERT INTO shifts (route_id, employee_id, date, start_time, end_time) VALUES ($1, $2, $3, $4, $5)', [s.route_id, s.employee_id, s.date, s.start_time, s.end_time]);
      count++;
      
      if (!notified.has(s.employee_id)) {
        await client.query('INSERT INTO notifications (user_id, message) VALUES ($1, $2)', [s.employee_id, `New schedule published. You have shifts assigned for the week of ${s.date}.`]);
        notified.add(s.employee_id);
      }
    }
    await client.query('COMMIT');
    res.json({ message: `Published ${count} shifts` });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err); 
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

function getMonday(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.setDate(diff));
}

module.exports = router;

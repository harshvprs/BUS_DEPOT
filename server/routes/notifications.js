const express = require('express');
const db = require('../db');
const { authMiddleware, roleGuard } = require('../middleware/auth');

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50', [req.user.id]);
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.get('/unread-count', authMiddleware, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = false', [req.user.id]);
    res.json({ count: parseInt(rows[0].count) });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.put('/:id/read', authMiddleware, async (req, res) => {
  try {
    await db.query('UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    res.json({ message: 'Marked as read' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.put('/read-all', authMiddleware, async (req, res) => {
  try {
    await db.query('UPDATE notifications SET is_read = true WHERE user_id = $1', [req.user.id]);
    res.json({ message: 'All marked as read' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;

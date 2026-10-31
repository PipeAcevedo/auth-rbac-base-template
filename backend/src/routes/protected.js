const { Router } = require('express');
const pool = require('../db');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = Router();

router.get('/profile', authenticateToken, async (req, res, next) => {
  try {
    const result = await pool.query('SELECT id, name, email, created_at FROM users WHERE id = $1', [req.user.id]);
    if (!result.rowCount) return res.status(404).json({ message: 'User not found.' });
    return res.json({ user: { ...result.rows[0], roles: req.user.roles } });
  } catch (error) {
    return next(error);
  }
});

router.get('/admin/dashboard', authenticateToken, authorizeRoles('admin'), (req, res) => {
  res.json({ message: 'Welcome to the admin dashboard.', user: req.user });
});

module.exports = router;

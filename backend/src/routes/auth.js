const { Router } = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { randomUUID } = require('crypto');
const pool = require('../db');
const config = require('../config');
const {
  createAccessToken,
  createRefreshToken,
  createOpaqueToken,
  hashToken,
  durationMilliseconds
} = require('../utils/tokens');
const { isConfigured, sendPasswordResetEmail } = require('../services/mailer');

const router = Router();
const cookieName = 'refreshToken';
const cookieOptions = {
  httpOnly: true,
  secure: config.cookieSecure,
  sameSite: config.cookieSameSite,
  path: '/api/v1/auth',
  maxAge: durationMilliseconds(config.refreshTtl)
};
const frontendOrigin = new URL(config.frontendUrl).origin;

router.use((req, res, next) => {
  const origin = req.get('origin');
  if (origin && origin !== frontendOrigin) {
    return res.status(403).json({ message: 'Request origin is not allowed.' });
  }
  return next();
});

function setRefreshCookie(res, token) {
  res.cookie(cookieName, token, cookieOptions);
}

function clearRefreshCookie(res) {
  const { maxAge, ...options } = cookieOptions;
  res.clearCookie(cookieName, options);
}

async function getUserById(id) {
  const result = await pool.query(
    `SELECT u.id, u.name, u.email, ARRAY_AGG(r.name ORDER BY r.name) AS roles
     FROM users u JOIN user_roles ur ON ur.user_id = u.id
     JOIN roles r ON r.id = ur.role_id WHERE u.id = $1
     GROUP BY u.id`,
    [id]
  );
  return result.rows[0] || null;
}

router.post('/register', async (req, res, next) => {
  const { name, email, password } = req.body || {};
  if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 120 ||
      typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 ||
      typeof password !== 'string' || password.length < 12 || password.length > 72) {
    return res.status(400).json({ message: 'Provide a valid name, email, and password (12–72 characters).' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const passwordHash = await bcrypt.hash(password, 12);
    const created = await client.query(
      'INSERT INTO users (name, email, password_hash) VALUES ($1, LOWER($2), $3) RETURNING id',
      [name.trim(), email.trim(), passwordHash]
    );
    await client.query(
      "INSERT INTO user_roles (user_id, role_id) SELECT $1, id FROM roles WHERE name = 'user'",
      [created.rows[0].id]
    );
    await client.query('COMMIT');
    const user = await getUserById(created.rows[0].id);
    const refresh = await issueRefreshToken(user.id);
    setRefreshCookie(res, refresh.token);
    return res.status(201).json({ user: publicUser(user), accessToken: createAccessToken(user) });
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23505') return res.status(409).json({ message: 'An account with this email already exists.' });
    return next(error);
  } finally {
    client.release();
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ message: 'Email and password are required.' });
    }
    const result = await pool.query('SELECT id, password_hash FROM users WHERE email = LOWER($1)', [email.trim()]);
    const valid = result.rowCount && await bcrypt.compare(password, result.rows[0].password_hash);
    if (!valid) return res.status(401).json({ message: 'Invalid email or password.' });
    const user = await getUserById(result.rows[0].id);
    const refresh = await issueRefreshToken(user.id);
    setRefreshCookie(res, refresh.token);
    return res.json({ user: publicUser(user), accessToken: createAccessToken(user) });
  } catch (error) {
    return next(error);
  }
});

router.post('/refresh-token', async (req, res, next) => {
  const rawToken = req.cookies[cookieName];
  if (!rawToken) return res.status(401).json({ message: 'Refresh token is required.' });
  let payload;
  try {
    payload = jwt.verify(rawToken, config.refreshSecret);
    if (payload.type !== 'refresh' || typeof payload.jti !== 'string') throw new Error('Invalid token');
  } catch {
    clearRefreshCookie(res);
    return res.status(401).json({ message: 'Invalid or expired refresh token.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const revoked = await client.query(
      'UPDATE refresh_tokens SET revoked_at = NOW() WHERE jti = $1 AND user_id = $2 AND revoked_at IS NULL AND expires_at > NOW() RETURNING jti',
      [payload.jti, payload.sub]
    );
    if (!revoked.rowCount) {
      await client.query('ROLLBACK');
      clearRefreshCookie(res);
      return res.status(401).json({ message: 'Refresh token has already been used or revoked.' });
    }
    const user = await getUserById(payload.sub);
    if (!user) {
      await client.query('ROLLBACK');
      clearRefreshCookie(res);
      return res.status(401).json({ message: 'User no longer exists.' });
    }
    const refresh = await issueRefreshToken(user.id, client);
    await client.query('COMMIT');
    setRefreshCookie(res, refresh.token);
    return res.json({ user: publicUser(user), accessToken: createAccessToken(user) });
  } catch (error) {
    await client.query('ROLLBACK');
    return next(error);
  } finally {
    client.release();
  }
});

router.post('/logout', async (req, res, next) => {
  const rawToken = req.cookies[cookieName];
  if (rawToken) {
    try {
      const payload = jwt.verify(rawToken, config.refreshSecret);
      if (payload.type === 'refresh' && payload.jti) {
        await pool.query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE jti = $1 AND revoked_at IS NULL', [payload.jti]);
      }
    } catch (error) {
      if (error.name !== 'JsonWebTokenError' && error.name !== 'TokenExpiredError') return next(error);
    }
  }
  clearRefreshCookie(res);
  return res.json({ message: 'Logged out successfully.' });
});

router.post('/forgot-password', async (req, res, next) => {
  const email = req.body?.email;
  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ message: 'Provide a valid email address.' });
  }
  if (!isConfigured()) return res.status(503).json({ message: 'Password recovery is temporarily unavailable.' });
  try {
    const user = await pool.query('SELECT id, email FROM users WHERE email = LOWER($1)', [email.trim()]);
    if (!user.rowCount) return res.json({ message: 'If that account exists, password reset instructions will be sent.' });
    const token = createOpaqueToken();
    await pool.query(
      "INSERT INTO password_reset_tokens (token_hash, user_id, expires_at) VALUES ($1, $2, NOW() + ($3 * INTERVAL '1 minute'))",
      [hashToken(token), user.rows[0].id, config.resetTtlMinutes]
    );
    await sendPasswordResetEmail(user.rows[0].email, token);
    return res.json({ message: 'If that account exists, password reset instructions will be sent.' });
  } catch (error) {
    return next(error);
  }
});

router.post('/reset-password', async (req, res, next) => {
  const { token, password } = req.body || {};
  if (typeof token !== 'string' || typeof password !== 'string' || password.length < 12 || password.length > 72) {
    return res.status(400).json({ message: 'A valid reset token and password (12–72 characters) are required.' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const reset = await client.query(
      'SELECT user_id FROM password_reset_tokens WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW() FOR UPDATE',
      [hashToken(token)]
    );
    if (!reset.rowCount) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Reset token is invalid or expired.' });
    }
    const passwordHash = await bcrypt.hash(password, 12);
    await client.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [passwordHash, reset.rows[0].user_id]);
    await client.query('UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL', [reset.rows[0].user_id]);
    await client.query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL', [reset.rows[0].user_id]);
    await client.query('COMMIT');
    return res.json({ message: 'Password has been reset. Please sign in.' });
  } catch (error) {
    await client.query('ROLLBACK');
    return next(error);
  } finally {
    client.release();
  }
});

async function issueRefreshToken(userId, client = pool) {
  const jti = randomUUID();
  const token = createRefreshToken(userId, jti);
  const expiresAt = new Date(Date.now() + durationMilliseconds(config.refreshTtl));
  await client.query(
    'INSERT INTO refresh_tokens (jti, user_id, expires_at) VALUES ($1, $2, $3)',
    [jti, userId, expiresAt]
  );
  return { token };
}

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, roles: user.roles };
}

module.exports = router;

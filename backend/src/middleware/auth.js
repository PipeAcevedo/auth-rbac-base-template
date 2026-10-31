const jwt = require('jsonwebtoken');
const config = require('../config');

function authenticateToken(req, res, next) {
  const authorization = req.get('authorization');
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Authentication required.' });

  try {
    const payload = jwt.verify(token, config.accessSecret);
    if (payload.type !== 'access' || typeof payload.sub !== 'string' || !Array.isArray(payload.roles)) {
      return res.status(401).json({ message: 'Invalid access token.' });
    }
    req.user = { id: payload.sub, email: payload.email, roles: payload.roles };
    return next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired access token.' });
  }
}

function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Authentication required.' });
    if (!req.user.roles.some((role) => allowedRoles.includes(role))) {
      return res.status(403).json({ message: 'You do not have permission to access this resource.' });
    }
    return next();
  };
}

module.exports = { authenticateToken, authorizeRoles };

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const config = require('../config');

function createAccessToken(user) {
  return jwt.sign({ sub: user.id, email: user.email, roles: user.roles, type: 'access' }, config.accessSecret, {
    expiresIn: config.accessTtl
  });
}

function createRefreshToken(userId, jti) {
  return jwt.sign({ sub: userId, jti, type: 'refresh' }, config.refreshSecret, {
    expiresIn: config.refreshTtl
  });
}

function createOpaqueToken() {
  return crypto.randomBytes(32).toString('hex');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function durationMilliseconds(value) {
  const match = /^(\d+)([smhd])$/.exec(value);
  if (!match) throw new Error(`Invalid token duration: ${value}`);
  const multiplier = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[match[2]];
  return Number(match[1]) * multiplier;
}

module.exports = { createAccessToken, createRefreshToken, createOpaqueToken, hashToken, durationMilliseconds };

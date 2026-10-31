const nodemailer = require('nodemailer');
const config = require('../config');

function isConfigured() {
  const { host, user, password, from } = config.smtp;
  return Boolean(host && user && password && from);
}

async function sendPasswordResetEmail(email, token) {
  const { host, user, password, from, resetUrl, port, secure } = config.smtp;
  if (!isConfigured()) {
    throw Object.assign(new Error('Password reset email is not configured.'), { status: 503 });
  }
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass: password }
  });
  const link = `${resetUrl}#token=${encodeURIComponent(token)}`;
  await transporter.sendMail({
    from,
    to: email,
    subject: 'Restablece tu contraseña',
    text: `Usa este enlace para restablecer tu contraseña (válido por ${config.resetTtlMinutes} minutos): ${link}`,
    html: `<p>Usa el siguiente enlace para restablecer tu contraseña. Es válido por ${config.resetTtlMinutes} minutos.</p><p><a href="${link}">Restablecer contraseña</a></p>`
  });
}

module.exports = { isConfigured, sendPasswordResetEmail };

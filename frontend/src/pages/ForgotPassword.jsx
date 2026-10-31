import { useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/apiClient';
import AuthForm from '../components/AuthForm';

export default function ForgotPassword() {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { data } = await apiClient.post('/auth/forgot-password', { email: event.currentTarget.email.value });
      setMessage(data.message);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'No se pudo solicitar el restablecimiento.');
    } finally {
      setBusy(false);
    }
  }
  return <AuthForm title="Recuperar contraseña" onSubmit={submit} submitLabel="Enviar instrucciones" error={error} busy={busy}>
    {message ? <p role="status" className="text-green-700">{message}</p> : <>
      <p className="text-sm text-slate-600">Te enviaremos un enlace si existe una cuenta con ese correo.</p>
      <label className="block text-sm font-medium">Correo<input className="field" name="email" type="email" required autoComplete="email" /></label>
    </>}
    <Link className="block text-sm text-indigo-700" to="/login">Volver a iniciar sesión</Link>
  </AuthForm>;
}

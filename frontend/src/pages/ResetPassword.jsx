import { useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/apiClient';
import AuthForm from '../components/AuthForm';

export default function ResetPassword() {
  const token = new URLSearchParams(window.location.hash.slice(1)).get('token');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { data } = await apiClient.post('/auth/reset-password', {
        token,
        password: event.currentTarget.password.value
      });
      setMessage(data.message);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'No se pudo restablecer la contraseña.');
    } finally {
      setBusy(false);
    }
  }
  return <AuthForm title="Nueva contraseña" onSubmit={submit} submitLabel="Guardar contraseña" error={error} busy={busy}>
    {message ? <p role="status" className="text-green-700">{message} <Link className="text-indigo-700" to="/login">Iniciar sesión</Link></p>
      : <label className="block text-sm font-medium">Contraseña nueva (mínimo 12 caracteres)<input className="field" name="password" type="password" minLength="12" required autoComplete="new-password" /></label>}
  </AuthForm>;
}

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthForm from '../components/AuthForm';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const form = event.currentTarget;
    try {
      await register({ name: form.name.value, email: form.email.value, password: form.password.value });
      navigate('/profile', { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'No se pudo crear la cuenta.');
    } finally {
      setBusy(false);
    }
  }
  return <AuthForm title="Crear cuenta" onSubmit={submit} submitLabel="Registrarme" error={error} busy={busy}>
    <label className="block text-sm font-medium">Nombre<input className="field" name="name" required minLength="2" maxLength="120" autoComplete="name" /></label>
    <label className="block text-sm font-medium">Correo<input className="field" name="email" type="email" required autoComplete="email" /></label>
    <label className="block text-sm font-medium">Contraseña (mínimo 12 caracteres)<input className="field" name="password" type="password" required minLength="12" autoComplete="new-password" /></label>
    <p className="text-sm text-slate-600">¿Ya tienes una cuenta? <Link className="text-indigo-700" to="/login">Inicia sesión</Link></p>
  </AuthForm>;
}

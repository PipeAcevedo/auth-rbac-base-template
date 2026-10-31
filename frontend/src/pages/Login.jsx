import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import AuthForm from '../components/AuthForm';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login({ email: event.currentTarget.email.value, password: event.currentTarget.password.value });
      navigate(location.state?.from?.pathname || '/profile', { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'No se pudo iniciar sesión.');
    } finally {
      setBusy(false);
    }
  }
  return <AuthForm title="Iniciar sesión" onSubmit={submit} submitLabel="Entrar" error={error} busy={busy}>
    <label className="block text-sm font-medium">Correo<input className="field" name="email" type="email" required autoComplete="email" /></label>
    <label className="block text-sm font-medium">Contraseña<input className="field" name="password" type="password" required autoComplete="current-password" /></label>
    <div className="flex justify-between text-sm"><Link className="text-indigo-700" to="/forgot-password">¿Olvidaste tu contraseña?</Link><Link className="text-indigo-700" to="/register">Crear cuenta</Link></div>
  </AuthForm>;
}

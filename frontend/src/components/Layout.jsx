import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  async function handleLogout() {
    try {
      await logout();
      navigate('/login');
    } catch {
      navigate('/login');
    }
  }
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link className="font-bold text-indigo-700" to="/">Auth RBAC</Link>
          <div className="flex items-center gap-4 text-sm">
            {user ? <>
              <Link to="/profile">Perfil</Link>
              {user.roles.includes('admin') && <Link to="/admin">Administración</Link>}
              <span className="text-slate-500">{user.name}</span>
              <button className="font-semibold text-indigo-700" onClick={handleLogout}>Salir</button>
            </> : <Link to="/login">Iniciar sesión</Link>}
          </div>
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-10"><Outlet /></main>
    </div>
  );
}

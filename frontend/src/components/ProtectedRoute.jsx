import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute() {
  const { user, ready } = useAuth();
  const location = useLocation();
  if (!ready) return <p className="p-8 text-center text-slate-600">Cargando sesión…</p>;
  return user ? <Outlet /> : <Navigate to="/login" replace state={{ from: location }} />;
}

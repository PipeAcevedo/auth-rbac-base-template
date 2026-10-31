import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RoleGuard({ roles }) {
  const { user } = useAuth();
  return user?.roles?.some((role) => roles.includes(role))
    ? <Outlet />
    : <Navigate to="/profile" replace />;
}

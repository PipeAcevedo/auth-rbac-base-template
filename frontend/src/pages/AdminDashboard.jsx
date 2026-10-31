import { useEffect, useState } from 'react';
import apiClient from '../api/apiClient';

export default function AdminDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    apiClient.get('/admin/dashboard').then(({ data }) => setDashboard(data))
      .catch((requestError) => setError(requestError.response?.data?.message || 'No se pudo cargar el panel.'));
  }, []);
  return <section className="rounded-xl bg-white p-8 shadow-sm">
    <h1 className="mb-4 text-2xl font-bold">Panel de administración</h1>
    {error ? <p role="alert" className="text-red-700">{error}</p> : <p>{dashboard?.message || 'Cargando…'}</p>}
  </section>;
}

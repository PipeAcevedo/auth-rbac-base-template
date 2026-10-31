import { useEffect, useState } from 'react';
import apiClient from '../api/apiClient';

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    apiClient.get('/profile').then(({ data }) => setProfile(data.user))
      .catch((requestError) => setError(requestError.response?.data?.message || 'No se pudo cargar el perfil.'));
  }, []);
  if (error) return <p role="alert" className="text-red-700">{error}</p>;
  if (!profile) return <p>Cargando perfil…</p>;
  return <section className="rounded-xl bg-white p-8 shadow-sm">
    <h1 className="mb-6 text-2xl font-bold">Mi perfil</h1>
    <dl className="space-y-3"><div><dt className="text-sm text-slate-500">Nombre</dt><dd>{profile.name}</dd></div>
      <div><dt className="text-sm text-slate-500">Correo</dt><dd>{profile.email}</dd></div>
      <div><dt className="text-sm text-slate-500">Roles</dt><dd>{profile.roles.join(', ')}</dd></div></dl>
  </section>;
}

'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export default function VentasLoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    setError('');
    try {
      const res = await api.post('/auth/login', {
        email: form.email,
        password: form.password,
      });
      const usuario = res.data.usuario;
      if (usuario?.rol !== 'ventas') {
        setError('Esta pantalla es exclusiva para el personal de ventas.');
        return;
      }
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('usuario', JSON.stringify(usuario));
      document.cookie = `token=${res.data.token}; path=/; max-age=604800`;
      document.cookie = `usuario=${encodeURIComponent(JSON.stringify(usuario))}; path=/; max-age=604800`;
      window.dispatchEvent(new Event('auth-change'));
      router.push('/ventas');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Credenciales incorrectas';
      setError(msg);
    } finally {
      setCargando(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 px-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-[#005a24] flex items-center justify-center text-3xl">
            🧑‍💼
          </div>
          <h1 className="text-2xl font-bold dark:text-white">Portal de Ventas</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Acceso exclusivo para vendedores
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Email corporativo"
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
            required
            className="w-full border dark:border-gray-600 rounded-xl px-4 py-3 text-gray-900 dark:text-gray-100 dark:bg-gray-700"
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })}
            required
            className="w-full border dark:border-gray-600 rounded-xl px-4 py-3 text-gray-900 dark:text-gray-100 dark:bg-gray-700"
          />

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={cargando}
            className="w-full bg-[#005a24] text-white py-3 rounded-xl font-bold hover:bg-[#003e19] disabled:opacity-50"
          >
            {cargando ? 'Verificando...' : 'Ingresar'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-6">
          ¿No tenés cuenta de vendedor? Solicitala al administrador.
        </p>
      </div>
    </main>
  );
}

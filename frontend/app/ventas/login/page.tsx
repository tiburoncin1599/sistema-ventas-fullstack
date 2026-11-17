'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Store } from 'lucide-react';

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
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('usuario', JSON.stringify(usuario));
      document.cookie = `token=${res.data.token}; path=/; max-age=604800`;
      document.cookie = `usuario=${encodeURIComponent(JSON.stringify(usuario))}; path=/; max-age=604800`;
      window.dispatchEvent(new Event('auth-change'));
      const rol = usuario?.rol;
      if (rol === 'ventas') router.push('/ventas');
      else if (rol === 'admin') router.push('/admin');
      else if (rol === 'inventario') router.push('/admin/inventario');
      else router.push('/');
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
    <main className="prolimal-page flex min-h-screen items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="rounded-[2rem] border border-prolimal-ink-900/10 bg-card p-8 shadow-[0_24px_60px_-46px_rgba(11,37,32,0.45)] dark:border-prolimal-sand-100/10 dark:bg-card-dark sm:p-10">
          <div className="mb-8 text-center">
            <span className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-3xl bg-prolimal-ink-900 text-prolimal-sand-50 dark:bg-prolimal-teal-400 dark:text-prolimal-ink-900">
              <Store className="h-6 w-6" />
            </span>
            <p className="prolimal-eyebrow">Acceso interno</p>
            <h1 className="prolimal-display mt-2 text-3xl tracking-[-0.04em] text-prolimal-ink-900 dark:text-prolimal-sand-50">
              Portal de Ventas
            </h1>
            <p className="mt-2 text-sm font-medium text-prolimal-ink-400 dark:text-prolimal-ink-300">
              Acceso exclusivo para vendedores
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.16em] text-prolimal-ink-400 dark:text-prolimal-ink-300">
                Email corporativo
              </span>
              <input
                type="email"
                autoComplete="email"
                placeholder="vendedor@prolimac.com"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                required
                className="prolimal-input"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.16em] text-prolimal-ink-400 dark:text-prolimal-ink-300">
                Contraseña
              </span>
              <input
                type="password"
                autoComplete="current-password"
                placeholder="Tu contraseña"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                required
                className="prolimal-input"
              />
            </label>

            {error && (
              <p className="rounded-2xl bg-prolimal-coral-100 px-4 py-3 text-sm font-semibold text-prolimal-coral-700 dark:bg-prolimal-coral-900/25 dark:text-prolimal-coral-300">
                {error}
              </p>
            )}

            <button type="submit" disabled={cargando} className="prolimal-btn-primary w-full">
              {cargando ? 'Verificando...' : 'Ingresar'}
            </button>
          </form>

          <p className="mt-6 text-center text-xs font-medium text-prolimal-ink-400 dark:text-prolimal-ink-300">
            ¿No tenés cuenta de vendedor? Solicitala al administrador.
          </p>
        </div>

        <p className="mt-6 text-center text-xs font-bold uppercase tracking-[0.14em] text-prolimal-ink-400 dark:text-prolimal-ink-300">
          <Link href="/" className="text-prolimal-teal-700 hover:underline dark:text-prolimal-teal-300">
            ← Volver a la tienda
          </Link>
        </p>
      </div>
    </main>
  );
}

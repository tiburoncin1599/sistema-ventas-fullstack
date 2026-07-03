'use client';
import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import { api } from '@/lib/api';

function AuthContent() {
  const router = useRouter();
  const [modo, setModo] = useState<'login' | 'registro'>('login');
  const [form, setForm] = useState({ nombre: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const [verPassword, setVerPassword] = useState(false);
  const params = useSearchParams();

  useEffect(() => {
    const err = params.get('error');
    if (err) setError(decodeURIComponent(err));
  }, [params]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setCargando(true);
    setError('');
    try {
      const data = modo === 'login'
        ? { email: form.email, password: form.password }
        : form;
      const url = modo === 'login' ? '/auth/login' : '/auth/registro';
      const res = await api.post(url, data);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('usuario', JSON.stringify(res.data.usuario));
      document.cookie = `token=${res.data.token}; path=/; max-age=604800`;
      document.cookie = `usuario=${encodeURIComponent(JSON.stringify(res.data.usuario))}; path=/; max-age=604800`;
      window.dispatchEvent(new Event('auth-change'));
      router.push('/');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Ocurrió un error';
      setError(msg);
    } finally {
      setCargando(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 w-full max-w-md">

        <div className="flex mb-6 border rounded-xl overflow-hidden">
          <button type="button"
            onClick={() => setModo('login')}
            className={`flex-1 py-3 font-medium ${modo === 'login' ? 'bg-[#005a24] text-white' : 'text-gray-700 bg-gray-100 dark:bg-gray-700 dark:text-gray-200'}`}>
            Iniciar sesión
          </button>
          <button type="button"
            onClick={() => setModo('registro')}
            className={`flex-1 py-3 font-medium ${modo === 'registro' ? 'bg-[#005a24] text-white' : 'text-gray-700 bg-gray-100 dark:bg-gray-700 dark:text-gray-200'}`}>
            Registrarse
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {modo === 'registro' && (
            <input
              type="text"
              placeholder="Tu nombre completo"
              value={form.nombre}
              onChange={e => setForm({ ...form, nombre: e.target.value })}
              className="w-full border dark:border-gray-600 rounded-xl px-4 py-3 text-gray-900 dark:text-gray-100 dark:bg-gray-700"
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
            className="w-full border dark:border-gray-600 rounded-xl px-4 py-3 text-gray-900 dark:text-gray-100 dark:bg-gray-700"
          />
          <div className="relative">
            <input
              type={verPassword ? 'text' : 'password'}
              placeholder="Contraseña"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              className="w-full border dark:border-gray-600 rounded-xl px-4 py-3 pr-12 text-gray-900 dark:text-gray-100 dark:bg-gray-700"
            />
            <button type="button" onClick={() => setVerPassword(!verPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xl">
              {verPassword ? '🙈' : '👁️'}
            </button>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button type="submit"
            disabled={cargando}
            className="w-full bg-[#005a24] text-white py-3 rounded-xl font-bold hover:bg-[#003e19] disabled:opacity-50">
            {cargando ? 'Cargando...' : modo === 'login' ? 'Entrar' : 'Crear cuenta'}
          </button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white dark:bg-gray-800 px-3 text-gray-400">o continuá con</span>
          </div>
        </div>

        <a href={`${process.env.NEXT_PUBLIC_API_URL || 'https://web-production-c811d.up.railway.app'}/auth/google`}
          className="w-full flex items-center justify-center gap-3 border border-gray-200 dark:border-gray-600 rounded-xl py-3 font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Google
        </a>
      </div>
    </main>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<main className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900"><p className="text-gray-500">Cargando...</p></main>}>
      <AuthContent />
    </Suspense>
  );
}

'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, ArrowRight, Eye, EyeOff, Lock, Mail, ShieldCheck, Sparkles, User } from 'lucide-react';
import { api, API_URL } from '@/lib/api';

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
    if (err) setError(decodeURIComponent(err)); // eslint-disable-line react-hooks/set-state-in-effect
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
    <main className="prolimal-page min-h-[calc(100vh-5.5rem)] px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <div className="mx-auto grid max-w-6xl overflow-hidden rounded-[2.5rem] border border-prolimal-ink-900/10 bg-card shadow-[0_40px_100px_-60px_rgba(11,37,32,0.55)] dark:border-prolimal-sand-100/10 dark:bg-card-dark lg:grid-cols-[0.92fr_1.08fr]">
        <section className="relative hidden overflow-hidden bg-prolimal-ink-900 p-10 text-prolimal-sand-50 lg:flex lg:flex-col lg:justify-between">
          <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-prolimal-teal-500/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -right-10 h-80 w-80 rounded-full bg-prolimal-coral-500/15 blur-3xl" />

          <div className="relative">
            <Link href="/" className="inline-flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-prolimal-sand-50 p-1.5">
                <img src="/logo.png" alt="Logo PROLIMAC" className="h-full w-full object-contain" />
              </span>
              <span className="flex flex-col">
                <span className="text-lg font-extrabold tracking-[-0.04em]">PROLIMAC</span>
                <span className="prolimal-display text-sm italic text-prolimal-teal-300">limpieza que respira</span>
              </span>
            </Link>
          </div>

          <div className="relative my-12">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[9px] font-bold uppercase tracking-[0.22em] text-prolimal-teal-200">
              <Sparkles className="h-3.5 w-3.5" />
              Tu espacio, tu ritmo
            </span>
            <h1 className="prolimal-display mt-6 text-[3.4rem] leading-[0.92] tracking-[-0.055em]">
              Una compra simple.
              {' '}<span className="block italic text-prolimal-coral-300">Un espacio mejor.</span>
            </h1>
            <p className="mt-5 max-w-md text-sm leading-relaxed text-prolimal-sand-100/70">
              Ingresá para guardar tus productos, seguir tus pedidos y coordinar la entrega de forma directa.
            </p>
          </div>

          <div className="relative space-y-3 text-sm text-prolimal-sand-100/75">
            <p className="flex items-center gap-3">
              <ShieldCheck className="h-4 w-4 text-prolimal-teal-300" />
              Seguimiento de tus pedidos
            </p>
            <p className="flex items-center gap-3">
              <ArrowRight className="h-4 w-4 text-prolimal-teal-300" />
              Compra coordinada por WhatsApp
            </p>
            <p className="flex items-center gap-3">
              <Sparkles className="h-4 w-4 text-prolimal-teal-300" />
              Atención cercana en Cochabamba
            </p>
          </div>
        </section>

        <section className="p-6 sm:p-10 lg:p-12">
          <div className="mx-auto w-full max-w-md">
            <Link
              href="/"
              className="group mb-8 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-prolimal-ink-400 transition-colors hover:text-prolimal-teal-700 dark:text-prolimal-ink-300 dark:hover:text-prolimal-teal-300 lg:hidden"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              Volver al inicio
            </Link>

            <p className="prolimal-eyebrow">{modo === 'login' ? 'Bienvenido de nuevo' : 'Creá tu cuenta'}</p>
            <h2 className="prolimal-display mt-3 text-4xl leading-none tracking-[-0.045em] text-prolimal-ink-900 dark:text-prolimal-sand-50 sm:text-5xl">
              {modo === 'login' ? 'Ingresá a tu cuenta.' : 'Empezá hoy.'}
            </h2>
            <p className="mt-3 text-sm font-medium text-prolimal-ink-500 dark:text-prolimal-ink-200">
              {modo === 'login'
                ? 'Tus productos y pedidos, siempre a mano.'
                : 'Creá tu cuenta para comprar y seguir tus pedidos.'}
            </p>

            <div className="mt-7 grid grid-cols-2 rounded-full border border-prolimal-ink-900/10 bg-prolimal-sand-50 p-1 dark:border-prolimal-sand-100/10 dark:bg-prolimal-ink-800">
              <button
                type="button"
                onClick={() => setModo('login')}
                className={`rounded-full py-2.5 text-[11px] font-bold uppercase tracking-[0.14em] transition-colors ${
                  modo === 'login'
                    ? 'bg-prolimal-ink-900 text-prolimal-sand-50 dark:bg-prolimal-teal-400 dark:text-prolimal-ink-900'
                    : 'text-prolimal-ink-500 dark:text-prolimal-ink-200'
                }`}
              >
                Iniciar sesión
              </button>
              <button
                type="button"
                onClick={() => setModo('registro')}
                className={`rounded-full py-2.5 text-[11px] font-bold uppercase tracking-[0.14em] transition-colors ${
                  modo === 'registro'
                    ? 'bg-prolimal-ink-900 text-prolimal-sand-50 dark:bg-prolimal-teal-400 dark:text-prolimal-ink-900'
                    : 'text-prolimal-ink-500 dark:text-prolimal-ink-200'
                }`}
              >
                Registrarse
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-7 space-y-4">
              {modo === 'registro' && (
                <label className="block">
                  <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.16em] text-prolimal-ink-400 dark:text-prolimal-ink-300">
                    Nombre completo
                  </span>
                  <span className="relative block">
                    <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-prolimal-ink-400" />
                    <input
                      type="text"
                      autoComplete="name"
                      placeholder="Tu nombre"
                      value={form.nombre}
                      onChange={e => setForm({ ...form, nombre: e.target.value })}
                      className="prolimal-input pl-11"
                    />
                  </span>
                </label>
              )}

              <label className="block">
                <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.16em] text-prolimal-ink-400 dark:text-prolimal-ink-300">
                  Correo electrónico
                </span>
                <span className="relative block">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-prolimal-ink-400" />
                  <input
                    type="email"
                    autoComplete="email"
                    placeholder="vos@correo.com"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    className="prolimal-input pl-11"
                  />
                </span>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.16em] text-prolimal-ink-400 dark:text-prolimal-ink-300">
                  Contraseña
                </span>
                <span className="relative block">
                  <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-prolimal-ink-400" />
                  <input
                    type={verPassword ? 'text' : 'password'}
                    autoComplete={modo === 'login' ? 'current-password' : 'new-password'}
                    placeholder="Tu contraseña"
                    value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    className="prolimal-input pl-11 pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setVerPassword(!verPassword)}
                    aria-label={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-prolimal-ink-400 transition-colors hover:bg-prolimal-sand-100 hover:text-prolimal-ink-700 dark:hover:bg-prolimal-ink-700 dark:hover:text-prolimal-sand-100"
                  >
                    {verPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </span>
              </label>

              {error && (
                <p className="rounded-2xl border border-prolimal-red-200 bg-prolimal-red-50 px-4 py-3 text-sm font-medium text-prolimal-red-700 dark:border-prolimal-red-800 dark:bg-prolimal-red-900/25 dark:text-prolimal-red-300">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={cargando}
                className="prolimal-btn-primary w-full py-3.5"
              >
                {cargando ? 'Cargando...' : modo === 'login' ? 'Entrar' : 'Crear cuenta'}
                {!cargando && <ArrowRight className="h-4 w-4" />}
              </button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-prolimal-ink-900/10 dark:border-prolimal-sand-100/10" />
              </div>
              <div className="relative flex justify-center text-[10px] font-bold uppercase tracking-[0.16em]">
                <span className="bg-card px-3 text-prolimal-ink-400 dark:bg-card-dark dark:text-prolimal-ink-300">
                  O continuá con
                </span>
              </div>
            </div>

            <a
              href={`${API_URL}/auth/google`}
              className="prolimal-btn-secondary w-full py-3"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <main className="prolimal-page flex min-h-screen items-center justify-center">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-prolimal-ink-400">Cargando...</p>
        </main>
      }
    >
      <AuthContent />
    </Suspense>
  );
}

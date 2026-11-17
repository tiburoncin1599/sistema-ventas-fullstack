'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

function CallbackContent() {
  const params = useSearchParams();
  const [error, setError] = useState('');

  useEffect(() => {
    const token = params.get('token');
    const usuarioStr = params.get('usuario');
    if (token && usuarioStr) {
      try {
        const usuario = JSON.parse(decodeURIComponent(usuarioStr));
        localStorage.setItem('token', token);
        localStorage.setItem('usuario', JSON.stringify(usuario));
        document.cookie = `token=${token}; path=/; max-age=604800`;
        document.cookie = `usuario=${encodeURIComponent(JSON.stringify(usuario))}; path=/; max-age=604800`;
        window.dispatchEvent(new Event('auth-change'));
        window.location.href = '/';
      } catch {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setError('Error al procesar la autenticación');
      }
    } else {
      setError('No se recibieron datos de autenticación');
    }
  }, [params]);

  return (
    <div className="flex flex-col items-center gap-3">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-prolimal-ink-900/15 border-t-prolimal-teal-600 dark:border-prolimal-sand-100/15 dark:border-t-prolimal-teal-300" />
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-prolimal-ink-400 dark:text-prolimal-ink-300">
        {error || 'Procesando autenticación...'}
      </p>
    </div>
  );
}

export default function GoogleCallbackPage() {
  return (
    <main className="prolimal-page flex min-h-screen items-center justify-center px-4 py-16">
      <Suspense
        fallback={
          <div className="flex flex-col items-center gap-3">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-prolimal-ink-900/15 border-t-prolimal-teal-600 dark:border-prolimal-sand-100/15 dark:border-t-prolimal-teal-300" />
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-prolimal-ink-400 dark:text-prolimal-ink-300">
              Procesando autenticación...
            </p>
          </div>
        }
      >
        <CallbackContent />
      </Suspense>
    </main>
  );
}

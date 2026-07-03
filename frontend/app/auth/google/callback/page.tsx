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
    <p className="text-gray-600">{error || 'Procesando autenticación...'}</p>
  );
}

export default function GoogleCallbackPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100">
      <Suspense fallback={<p className="text-gray-600">Procesando autenticación...</p>}>
        <CallbackContent />
      </Suspense>
    </main>
  );
}

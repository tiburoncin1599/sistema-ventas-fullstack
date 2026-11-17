'use client';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main className="prolimal-page flex min-h-screen items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-[2rem] border border-prolimal-ink-900/10 bg-card p-8 text-center shadow-[0_24px_60px_-46px_rgba(11,37,32,0.45)] dark:border-prolimal-sand-100/10 dark:bg-card-dark sm:p-10">
        <span className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-3xl bg-prolimal-coral-100 text-prolimal-coral-700 dark:bg-prolimal-coral-900/25 dark:text-prolimal-coral-300">
          <AlertTriangle className="h-6 w-6" />
        </span>
        <p className="prolimal-eyebrow">Error inesperado</p>
        <h1 className="prolimal-display mt-2 text-3xl tracking-[-0.04em] text-prolimal-ink-900 dark:text-prolimal-sand-50">
          Algo salió mal
        </h1>
        <p className="mt-3 break-words text-sm font-medium leading-relaxed text-prolimal-ink-400 dark:text-prolimal-ink-300">
          {error.message || 'Ocurrió un problema al cargar esta página.'}
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <button onClick={reset} className="prolimal-btn-primary flex-1">
            Intentar de nuevo
          </button>
          <Link href="/" className="prolimal-btn-secondary flex-1">
            Ir al inicio
          </Link>
        </div>
      </div>
    </main>
  );
}

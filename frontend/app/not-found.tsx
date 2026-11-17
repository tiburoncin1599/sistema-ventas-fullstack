import Link from 'next/link';
import { Compass } from 'lucide-react';

export default function NotFound() {
  return (
    <main className="prolimal-page flex min-h-screen items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-[2rem] border border-prolimal-ink-900/10 bg-card p-8 text-center shadow-[0_24px_60px_-46px_rgba(11,37,32,0.45)] dark:border-prolimal-sand-100/10 dark:bg-card-dark sm:p-10">
        <span className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-3xl bg-prolimal-teal-100 text-prolimal-teal-700 dark:bg-prolimal-teal-900/30 dark:text-prolimal-teal-300">
          <Compass className="h-6 w-6" />
        </span>
        <p className="prolimal-display text-6xl leading-none tracking-[-0.06em] text-prolimal-ink-200 dark:text-prolimal-ink-700">
          404
        </p>
        <h1 className="prolimal-display mt-4 text-2xl tracking-[-0.04em] text-prolimal-ink-900 dark:text-prolimal-sand-50">
          Página no encontrada
        </h1>
        <p className="mt-2 text-sm font-medium leading-relaxed text-prolimal-ink-400 dark:text-prolimal-ink-300">
          La dirección que buscás no existe o fue movida.
        </p>
        <Link href="/" className="prolimal-btn-primary mt-6 w-full">
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}

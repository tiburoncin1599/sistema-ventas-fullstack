export default function Loading() {
  return (
    <main className="prolimal-page flex min-h-screen items-center justify-center px-4 py-16">
      <div className="flex flex-col items-center gap-3">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-prolimal-ink-900/15 border-t-prolimal-teal-600 dark:border-prolimal-sand-100/15 dark:border-t-prolimal-teal-300" />
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-prolimal-ink-400 dark:text-prolimal-ink-300">
          Cargando...
        </p>
      </div>
    </main>
  );
}

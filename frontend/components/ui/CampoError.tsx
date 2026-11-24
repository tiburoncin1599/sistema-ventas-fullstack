'use client';

import type { ReactNode } from 'react';

/** Mensaje rojo consistente, ubicado justo debajo del campo que falló. */
export function CampoError({
  mensaje,
  id,
  className = '',
}: {
  mensaje?: string;
  id?: string;
  className?: string;
}) {
  if (!mensaje) return null;
  return (
    <p
      id={id}
      role="alert"
      className={`mt-1.5 flex items-start gap-1 text-xs font-semibold leading-snug text-prolimal-red-700 dark:text-prolimal-red-300 ${className}`}
    >
      <span aria-hidden="true">•</span>
      <span>{mensaje}</span>
    </p>
  );
}

/** Clases de borde/foco para inputs inválidos y válidos. */
export function claseCampo(tieneError: boolean, base = ''): string {
  const estado = tieneError
    ? 'border-prolimal-red-500 bg-prolimal-red-50/60 focus:border-prolimal-red-600 focus:ring-prolimal-red-500/25 dark:border-prolimal-red-400/70 dark:bg-prolimal-red-900/20 dark:focus:border-prolimal-red-400'
    : 'focus:border-prolimal-teal-600 focus:ring-prolimal-teal-500/30';
  return `${base} ${estado}`.trim();
}

/** Aviso rojo a nivel formulario (errores generales del backend o del envío). */
export function AvisoErrorFormulario({
  mensaje,
  children,
}: {
  mensaje?: string;
  children?: ReactNode;
}) {
  if (!mensaje && !children) return null;
  return (
    <div
      role="alert"
      className="mb-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300"
    >
      {mensaje}
      {children}
    </div>
  );
}

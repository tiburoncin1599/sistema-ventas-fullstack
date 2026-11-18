'use client';

import { useEffect } from 'react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';

export interface ToastDatos {
  id: number;
  tipo: 'exito' | 'error';
  mensaje: string;
}

/** Toast ligero para confirmar envíos por WhatsApp sin dependencias externas. */
export default function ToastNotificacion({
  toast,
  onClose,
}: {
  toast: ToastDatos | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!toast) return;
    const temporizador = window.setTimeout(onClose, 4500);
    return () => window.clearTimeout(temporizador);
  }, [toast?.id, onClose]);

  if (!toast) return null;

  const esExito = toast.tipo === 'exito';

  return (
    <div
      role="status"
      className="fixed bottom-6 right-6 z-[60] flex max-w-sm items-start gap-3 rounded-2xl border border-prolimal-ink-900/10 bg-card px-5 py-4 shadow-[0_24px_60px_-30px_rgba(11,37,32,0.55)] dark:border-prolimal-sand-100/10 dark:bg-card-dark"
    >
      {esExito ? (
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-prolimal-teal-600 dark:text-prolimal-teal-300" />
      ) : (
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-prolimal-red-600 dark:text-prolimal-red-300" />
      )}
      <p className="flex-1 text-sm font-semibold text-prolimal-ink-700 dark:text-prolimal-sand-100">
        {toast.mensaje}
      </p>
      <button
        onClick={onClose}
        aria-label="Cerrar notificación"
        className="text-prolimal-ink-400 transition-colors hover:text-prolimal-ink-700 dark:text-prolimal-ink-300"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

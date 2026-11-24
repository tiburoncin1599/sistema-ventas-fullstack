'use client';

import { useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import { apiFetchBlob } from '@/lib/api';

interface BotonComprobantePdfProps {
  pedidoId: number;
  label?: string;
  className?: string;
  /** Tamaño compacto para usar dentro de tablas. */
  compacta?: boolean;
}

/**
 * Abre el comprobante comercial interno en el visor del navegador (inline),
 * desde donde se puede imprimir o guardar. El JWT se envía en la petición.
 */
export default function BotonComprobantePdf({
  pedidoId,
  label = 'Descargar / Imprimir Comprobante (PDF)',
  className,
  compacta = false,
}: BotonComprobantePdfProps) {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  const abrir = async () => {
    setCargando(true);
    setError('');
    try {
      const blob = await apiFetchBlob(`/pedidos/${pedidoId}/comprobante-pdf`);
      const url = URL.createObjectURL(blob);
      const ventana = window.open(url, '_blank', 'noopener,noreferrer');
      if (!ventana) {
        // Si el navegador bloquea el popup, se descarga directamente.
        const enlace = document.createElement('a');
        enlace.href = url;
        enlace.download = `comprobante-${pedidoId}.pdf`;
        document.body.appendChild(enlace);
        enlace.click();
        enlace.remove();
      }
      // Se libera el objeto después de dar tiempo al visor a cargarlo.
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err: unknown) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : 'No se pudo abrir el comprobante. Intentá nuevamente.',
      );
    } finally {
      setCargando(false);
    }
  };

  const clases =
    className ??
    (compacta
      ? 'inline-flex items-center justify-center gap-1.5 rounded-full border border-prolimal-teal-500/40 bg-prolimal-teal-50 px-3 py-1.5 text-xs font-bold text-prolimal-teal-700 transition-colors hover:bg-prolimal-teal-100 disabled:opacity-50 dark:border-prolimal-teal-400/30 dark:bg-prolimal-teal-900/20 dark:text-prolimal-teal-300 dark:hover:bg-prolimal-teal-900/40'
      : 'prolimal-btn-secondary');

  return (
    <span className="inline-flex flex-col items-stretch">
      <button
        type="button"
        onClick={abrir}
        disabled={cargando}
        className={clases}
        aria-label={`Ver comprobante PDF del pedido ${pedidoId}`}
      >
        {cargando ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <FileText className="h-4 w-4" />
        )}
        {cargando ? 'Abriendo...' : label}
      </button>
      {error && (
        <span className="mt-1 text-[10px] font-semibold text-prolimal-coral-600 dark:text-prolimal-coral-400">
          {error}
        </span>
      )}
    </span>
  );
}

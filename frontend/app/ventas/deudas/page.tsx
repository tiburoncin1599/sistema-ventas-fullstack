'use client';
import { useEffect, useState } from 'react';
import { api, apiFetchBlob } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { AlertCircle, CheckCircle2, Clock, Download, Wallet } from 'lucide-react';

interface Deuda {
  id: number;
  monto: number;
  monto_pagado: number;
  descripcion: string;
  estado: string;
  fecha_creacion: string;
  usuario: { nombre: string };
  vendedor?: { nombre: string } | null;
}

export default function VentasDeudas() {
  const [deudas, setDeudas] = useState<Deuda[]>([]);
  const [resumen, setResumen] = useState<{
    total_deudas: number;
    deudas_pendientes: number;
    total_pendiente: number;
    total_pagado: number;
    deudas_pagadas: number;
  } | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/deudas').catch(() => ({ data: [] })),
      api.get('/deudas/resumen').catch(() => ({ data: null })),
    ]).then(([deudasRes, resumenRes]) => {
      setDeudas(Array.isArray(deudasRes.data) ? deudasRes.data : []);
      setResumen(resumenRes.data);
    }).finally(() => setCargando(false));
  }, []);

  const getColorEstado = (estado: string) => {
    const colores: Record<string, string> = {
      pendiente: 'bg-prolimal-coral-100 text-prolimal-coral-700 dark:bg-prolimal-coral-900/25 dark:text-prolimal-coral-300',
      parcial: 'bg-prolimal-orange-100 text-prolimal-orange-700 dark:bg-prolimal-orange-900/25 dark:text-prolimal-orange-300',
      pagado: 'bg-prolimal-green-100 text-prolimal-green-700 dark:bg-prolimal-green-900/25 dark:text-prolimal-green-300',
    };
    return colores[estado] || 'bg-prolimal-sand-100 text-prolimal-ink-600 dark:bg-prolimal-ink-800 dark:text-prolimal-ink-200';
  };

  const descargarFactura = async (id: number) => {
    try {
      const blob = await apiFetchBlob(`/deudas/${id}/factura/pdf`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `factura-deuda-${id}.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      alert('Error al descargar la factura');
    }
  };

  if (cargando) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="prolimal-surface px-6 py-20 text-center text-sm font-medium text-prolimal-ink-400 dark:text-prolimal-ink-300">
          Cargando deudas...
        </div>
      </main>
    );
  }

  const stats = [
    { label: 'Total deudas', value: resumen?.total_deudas ?? deudas.length, Icono: Wallet, tono: 'teal' },
    { label: 'Deudas pendientes', value: resumen?.deudas_pendientes ?? 0, Icono: Clock, tono: 'orange' },
    { label: 'Total por cobrar', value: formatCurrency(resumen?.total_pendiente ?? 0), Icono: AlertCircle, tono: 'coral' },
    { label: 'Total cobrado', value: formatCurrency(resumen?.total_pagado ?? 0), Icono: CheckCircle2, tono: 'green' },
  ] as const;

  const chipTono: Record<string, string> = {
    teal: 'bg-prolimal-teal-100 text-prolimal-teal-700 dark:bg-prolimal-teal-900/30 dark:text-prolimal-teal-300',
    orange: 'bg-prolimal-orange-100 text-prolimal-orange-700 dark:bg-prolimal-orange-900/25 dark:text-prolimal-orange-300',
    coral: 'bg-prolimal-coral-100 text-prolimal-coral-700 dark:bg-prolimal-coral-900/25 dark:text-prolimal-coral-300',
    green: 'bg-prolimal-green-100 text-prolimal-green-700 dark:bg-prolimal-green-900/25 dark:text-prolimal-green-300',
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-12">
      <div className="mb-8">
        <p className="prolimal-eyebrow">Cobranza</p>
        <h1 className="prolimal-display mt-2 text-3xl tracking-[-0.04em] text-prolimal-ink-900 dark:text-prolimal-sand-50">
          Mis deudas
        </h1>
        <p className="mt-2 max-w-xl text-sm font-medium leading-relaxed text-prolimal-ink-500 dark:text-prolimal-ink-200">
          Deudas que gestionás como personal de ventas.
        </p>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ label, value, Icono, tono }) => (
          <div
            key={label}
            className="rounded-[2rem] border border-prolimal-ink-900/10 bg-card p-5 shadow-[0_24px_60px_-46px_rgba(11,37,32,0.45)] dark:border-prolimal-sand-100/10 dark:bg-card-dark"
          >
            <span className={`flex h-10 w-10 items-center justify-center rounded-2xl ${chipTono[tono]}`}>
              <Icono className="h-4 w-4" />
            </span>
            <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.16em] text-prolimal-ink-400 dark:text-prolimal-ink-300">{label}</p>
            <p className="mt-1 text-2xl font-extrabold tracking-[-0.04em] text-prolimal-ink-900 dark:text-prolimal-sand-50">{value}</p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-[2rem] border border-prolimal-ink-900/10 bg-card shadow-[0_24px_60px_-46px_rgba(11,37,32,0.45)] dark:border-prolimal-sand-100/10 dark:bg-card-dark">
        {deudas.length === 0 ? (
          <p className="px-6 py-16 text-center text-sm font-medium text-prolimal-ink-400 dark:text-prolimal-ink-300">
            No tenés deudas registradas.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead>
                <tr className="border-b border-prolimal-ink-900/10 dark:border-prolimal-sand-100/10">
                  {['Cliente', 'Descripción', 'Monto', 'Pagado', 'Saldo', 'Estado', 'Fecha'].map(h => (
                    <th key={h} className="px-5 py-4 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-prolimal-ink-400 dark:text-prolimal-ink-300">
                      {h}
                    </th>
                  ))}
                  <th className="px-5 py-4" />
                </tr>
              </thead>
              <tbody>
                {deudas.map(d => {
                  const saldo = d.monto - d.monto_pagado;
                  return (
                    <tr key={d.id} className="border-b border-prolimal-ink-900/[0.06] transition-colors last:border-0 hover:bg-prolimal-sand-50/60 dark:border-prolimal-sand-100/[0.06] dark:hover:bg-prolimal-ink-800/40">
                      <td className="px-5 py-4 text-sm font-semibold text-prolimal-ink-900 dark:text-prolimal-sand-50">{d.usuario?.nombre || '—'}</td>
                      <td className="px-5 py-4 text-sm font-medium text-prolimal-ink-500 dark:text-prolimal-ink-200">{d.descripcion || '—'}</td>
                      <td className="px-5 py-4 text-sm font-medium text-prolimal-ink-600 dark:text-prolimal-ink-200">{formatCurrency(d.monto)}</td>
                      <td className="px-5 py-4 text-sm font-medium text-prolimal-ink-600 dark:text-prolimal-ink-200">{formatCurrency(d.monto_pagado)}</td>
                      <td className={`px-5 py-4 text-sm font-bold ${saldo > 0 ? 'text-prolimal-coral-700 dark:text-prolimal-coral-300' : 'text-prolimal-green-700 dark:text-prolimal-green-300'}`}>
                        {formatCurrency(saldo)}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${getColorEstado(d.estado)}`}>{d.estado}</span>
                      </td>
                      <td className="px-5 py-4 text-xs font-medium text-prolimal-ink-400 dark:text-prolimal-ink-300">{new Date(d.fecha_creacion).toLocaleDateString()}</td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => descargarFactura(d.id)}
                          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold text-prolimal-teal-700 transition-colors hover:bg-prolimal-teal-50 dark:text-prolimal-teal-300 dark:hover:bg-prolimal-teal-900/25"
                        >
                          <Download className="h-3.5 w-3.5" />
                          PDF
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
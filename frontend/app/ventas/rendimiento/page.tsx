'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import GraficoBarras from '@/components/charts/GraficoBarras';
import { aFechaISO, rangoSemana, rangoMes, listaDias } from '@/components/charts/chart-utils';

interface DiaVenta {
  fecha: string;
  total_pedidos: number;
  total_vendido: number;
}

type Periodo = 'semana' | 'mes';

function getUsuarioId(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const u = localStorage.getItem('usuario');
    return u ? Number(JSON.parse(u)?.id ?? 0) : 0;
  } catch { return 0; }
}

export default function MiRendimientoPage() {
  const [periodo, setPeriodo] = useState<Periodo>('semana');
  const [datos, setDatos] = useState<DiaVenta[]>([]);
  const [cargando, setCargando] = useState(false);
  const [usuarioNombre, setUsuarioNombre] = useState('');

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem('usuario') || 'null');
      setUsuarioNombre(u?.nombre || '');
    } catch {}
  }, []);

  const { desde, hasta, dias } = useMemo(() => {
    const r = periodo === 'semana' ? rangoSemana() : rangoMes();
    return { ...r, dias: listaDias(r.desde, r.hasta, periodo) };
  }, [periodo]);

  useEffect(() => {
    const uid = getUsuarioId();
    if (!uid) return;
    setCargando(true);
    api.get('/reportes/ventas-personal-por-dia', {
      params: { usuarioId: uid, desde: aFechaISO(desde), hasta: aFechaISO(hasta) },
    })
      .then((res) => setDatos(res.data || []))
      .catch(() => setDatos([]))
      .finally(() => setCargando(false));
  }, [periodo, desde, hasta]);

  const serieGrafica = useMemo(() => {
    const mapa = new Map(datos.map((d) => [String(d.fecha).slice(0, 10), d]));
    return dias.map(({ fecha, etiqueta }) => {
      const regla = mapa.get(fecha);
      return {
        fecha,
        etiqueta,
        valor: Number(regla?.total_vendido || 0),
        pedidos: Number(regla?.total_pedidos || 0),
      };
    });
  }, [datos, dias]);

  const resumen = useMemo(() => {
    const totalVendido = serieGrafica.reduce((s, d) => s + d.valor, 0);
    const totalPedidos = serieGrafica.reduce((s, d) => s + d.pedidos, 0);
    const mejorDia = serieGrafica.reduce(
      (mejor, d) => (d.valor > mejor.valor ? d : mejor),
      serieGrafica[0] || { fecha: '', valor: 0, pedidos: 0, etiqueta: '' },
    );
    return { totalVendido, totalPedidos, mejorDia };
  }, [serieGrafica]);

  return (
    <main className="max-w-5xl mx-auto px-6 py-10 dark:bg-gray-900 dark:text-gray-100 min-h-screen">
      <div className="mb-8">
        <Link href="/ventas" className="text-sm text-green-700 dark:text-green-400 hover:underline">
          ← Portal de ventas
        </Link>
        <h1 className="text-2xl font-bold mt-1">Mi Rendimiento</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Tus ventas — gráficas semanal y mensual
        </p>
      </div>

      <div className="flex gap-2 mb-6">
        {([['semana', 'Esta semana'], ['mes', 'Este mes']] as const).map(([p, etiqueta]) => (
          <button
            key={p}
            onClick={() => setPeriodo(p)}
            className={`px-5 py-2 rounded-xl font-medium transition-colors ${
              periodo === p
                ? 'bg-[#005a24] text-white'
                : 'bg-white dark:bg-gray-800 border dark:border-gray-600 text-gray-600 dark:text-gray-300'
            }`}
          >
            {etiqueta}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl p-5">
          <p className="text-xs uppercase tracking-wide text-gray-400 font-semibold">Total vendido</p>
          <p className="text-2xl font-bold mt-1">{formatCurrency(resumen.totalVendido)}</p>
          <p className="text-xs text-gray-400 mt-1">{usuarioNombre}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl p-5">
          <p className="text-xs uppercase tracking-wide text-gray-400 font-semibold">Pedidos</p>
          <p className="text-2xl font-bold mt-1">{resumen.totalPedidos}</p>
          <p className="text-xs text-gray-400 mt-1">
            {periodo === 'semana' ? 'esta semana' : 'este mes'}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl p-5">
          <p className="text-xs uppercase tracking-wide text-gray-400 font-semibold">Mejor día</p>
          <p className="text-2xl font-bold mt-1">{formatCurrency(resumen.mejorDia?.valor || 0)}</p>
          <p className="text-xs text-gray-400 mt-1">{resumen.mejorDia?.fecha || '—'}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl p-6">
        <h2 className="font-bold mb-4">
          Ventas por día ·{' '}
          <span className="text-gray-500 dark:text-gray-400 font-normal">
            {aFechaISO(desde)} al {aFechaISO(hasta)}
          </span>
        </h2>
        {cargando ? (
          <p className="text-center py-16 text-gray-400">Cargando…</p>
        ) : (
          <div className="text-gray-900 dark:text-gray-100">
            <GraficoBarras datos={serieGrafica} />
          </div>
        )}
      </div>
    </main>
  );
}

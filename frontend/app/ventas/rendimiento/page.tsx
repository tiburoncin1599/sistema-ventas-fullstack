'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import GraficoBarras from '@/components/charts/GraficoBarras';
import { aFechaISO, rangoSemana, rangoMes, listaDias } from '@/components/charts/chart-utils';
import { ArrowLeft, ClipboardList, Sparkles, Wallet } from 'lucide-react';

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
      setUsuarioNombre(u?.nombre || ''); // eslint-disable-line react-hooks/set-state-in-effect
    } catch {}
  }, []);

  const { desde, hasta, dias } = useMemo(() => {
    const r = periodo === 'semana' ? rangoSemana() : rangoMes();
    return { ...r, dias: listaDias(r.desde, r.hasta, periodo) };
  }, [periodo]);

  useEffect(() => {
    const uid = getUsuarioId();
    if (!uid) return;
    setCargando(true); // eslint-disable-line react-hooks/set-state-in-effect
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

  const stats = [
    {
      label: 'Total vendido',
      value: formatCurrency(resumen.totalVendido),
      hint: usuarioNombre || 'Tu actividad',
      Icono: Wallet,
    },
    {
      label: 'Pedidos',
      value: resumen.totalPedidos,
      hint: periodo === 'semana' ? 'esta semana' : 'este mes',
      Icono: ClipboardList,
    },
    {
      label: 'Mejor día',
      value: formatCurrency(resumen.mejorDia?.valor || 0),
      hint: resumen.mejorDia?.fecha || '—',
      Icono: Sparkles,
    },
  ];

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-12">
      <div className="mb-8">
        <Link
          href="/ventas"
          className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-prolimal-teal-700 transition-colors hover:text-prolimal-ink-900 dark:text-prolimal-teal-300 dark:hover:text-prolimal-sand-50"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Portal de ventas
        </Link>
        <h1 className="prolimal-display mt-3 text-3xl tracking-[-0.04em] text-prolimal-ink-900 dark:text-prolimal-sand-50">
          Mi Rendimiento
        </h1>
        <p className="mt-2 max-w-xl text-sm font-medium leading-relaxed text-prolimal-ink-500 dark:text-prolimal-ink-200">
          Tus ventas, con lectura semanal y mensual.
        </p>
      </div>

      <div className="mb-6 inline-flex flex-wrap gap-1 rounded-full border border-prolimal-ink-900/10 bg-card p-1 dark:border-prolimal-sand-100/10 dark:bg-card-dark">
        {([['semana', 'Esta semana'], ['mes', 'Este mes']] as const).map(([p, etiqueta]) => (
          <button
            key={p}
            onClick={() => setPeriodo(p)}
            className={`rounded-full px-4 py-2 text-xs font-bold transition-colors ${
              periodo === p
                ? 'bg-prolimal-ink-900 text-white dark:bg-prolimal-teal-400 dark:text-prolimal-ink-900'
                : 'text-prolimal-ink-500 hover:bg-prolimal-sand-100 dark:text-prolimal-ink-200 dark:hover:bg-prolimal-ink-800'
            }`}
          >
            {etiqueta}
          </button>
        ))}
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map(({ label, value, hint, Icono }) => (
          <div
            key={label}
            className="rounded-[2rem] border border-prolimal-ink-900/10 bg-card p-5 shadow-[0_24px_60px_-46px_rgba(11,37,32,0.45)] dark:border-prolimal-sand-100/10 dark:bg-card-dark"
          >
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-prolimal-ink-400 dark:text-prolimal-ink-300">{label}</p>
              <Icono className="h-4 w-4 text-prolimal-teal-700 dark:text-prolimal-teal-300" />
            </div>
            <p className="mt-2 text-2xl font-extrabold tracking-[-0.04em] text-prolimal-ink-900 dark:text-prolimal-sand-50">{value}</p>
            <p className="mt-1 text-xs font-medium text-prolimal-ink-400 dark:text-prolimal-ink-300">{hint}</p>
          </div>
        ))}
      </div>

      <div className="rounded-[2rem] border border-prolimal-ink-900/10 bg-card p-6 shadow-[0_24px_60px_-46px_rgba(11,37,32,0.45)] dark:border-prolimal-sand-100/10 dark:bg-card-dark sm:p-8">
        <h2 className="prolimal-display text-xl tracking-[-0.03em] text-prolimal-ink-900 dark:text-prolimal-sand-50">
          Ventas por día
        </h2>
        <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-prolimal-ink-400 dark:text-prolimal-ink-300">
          {aFechaISO(desde)} al {aFechaISO(hasta)}
        </p>
        <div className="mt-6">
          {cargando ? (
            <p className="py-16 text-center text-sm font-medium text-prolimal-ink-400 dark:text-prolimal-ink-300">Cargando…</p>
          ) : (
            <div className="text-prolimal-ink-900 dark:text-prolimal-sand-50">
              <GraficoBarras datos={serieGrafica} />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

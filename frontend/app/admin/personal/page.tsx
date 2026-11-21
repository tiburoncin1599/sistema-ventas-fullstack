'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { esRol, normalizarRol } from '@/lib/roles';
import { formatCurrency } from '@/lib/utils';
import GraficoBarras from '@/components/charts/GraficoBarras';
import { aFechaISO, rangoSemana, rangoMes, listaDias } from '@/components/charts/chart-utils';
import { ClipboardList, TrendingUp, Trophy } from 'lucide-react';

interface Vendedor {
  id: number;
  nombre: string;
  rol: string;
}

interface DiaVenta {
  fecha: string;
  total_pedidos: number;
  total_vendido: number;
}

type Periodo = 'semana' | 'mes';

export default function RendimientoPersonalPage() {
  const [usuario, setUsuario] = useState<{ id: number; nombre: string; rol: string } | null>(null);
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [seleccionado, setSeleccionado] = useState<string>('todos');
  const [periodo, setPeriodo] = useState<Periodo>('semana');
  const [datos, setDatos] = useState<DiaVenta[]>([]);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem('usuario') || 'null');
      if (u) {
        const datos = { ...u, rol: normalizarRol(u.rol) };
        setUsuario(datos); // eslint-disable-line react-hooks/set-state-in-effect
        if (esRol(datos.rol, 'ventas')) {
          setSeleccionado(String(datos.id));
        }
      } else {
        setUsuario(null); // eslint-disable-line react-hooks/set-state-in-effect
      }
    } catch {}
    api.get('/usuarios')
      .then((res) => {
        const personal = ((res.data || []) as Vendedor[]).filter((u) => esRol(u.rol, 'ventas'));
        setVendedores(personal);
      })
      .catch(() => {});
  }, []);

  const esVendedor = esRol(usuario?.rol, 'ventas');

  const { desde, hasta, dias } = useMemo(() => {
    const r = periodo === 'semana' ? rangoSemana() : rangoMes();
    return { ...r, dias: listaDias(r.desde, r.hasta, periodo) };
  }, [periodo]);

  useEffect(() => {
    if (esVendedor && seleccionado === 'todos') return;
    setCargando(true); // eslint-disable-line react-hooks/set-state-in-effect
    const params: Record<string, string> = {
      desde: aFechaISO(desde),
      hasta: aFechaISO(hasta),
    };
    if (seleccionado !== 'todos') params.usuarioId = seleccionado;
    api.get('/reportes/ventas-personal-por-dia', { params })
      .then((res) => setDatos(res.data || []))
      .catch(() => setDatos([]))
      .finally(() => setCargando(false));
  }, [seleccionado, periodo, desde, hasta, esVendedor]);

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

  const vendedorNombre =
    seleccionado === 'todos'
      ? 'Todo el personal'
      : esVendedor
        ? usuario?.nombre || ''
        : vendedores.find((v) => String(v.id) === seleccionado)?.nombre || '';

  return (
    <div className="pb-10">
      <section className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href={esVendedor ? '/ventas' : '/admin'} className="text-xs font-bold uppercase tracking-[0.14em] text-prolimal-teal-700 hover:underline dark:text-prolimal-teal-300">
            ← {esVendedor ? 'Portal de ventas' : 'Panel admin'}
          </Link>
          <h2 className="prolimal-display mt-2 text-3xl tracking-[-0.04em] text-prolimal-ink-900 dark:text-prolimal-sand-50">
            Rendimiento del personal
          </h2>
          <p className="mt-2 max-w-xl text-sm font-medium leading-relaxed text-prolimal-ink-500 dark:text-prolimal-ink-200">
            {esVendedor ? 'Tus ventas en gráficas semanal y mensual.' : 'Ventas por vendedor en gráficas semanal y mensual.'}
          </p>
        </div>

        {!esVendedor && (
          <select
            value={seleccionado}
            onChange={(e) => setSeleccionado(e.target.value)}
            className="prolimal-input w-full sm:w-64"
          >
            <option value="todos">Todo el personal</option>
            {vendedores.map((v) => (
              <option key={v.id} value={String(v.id)}>
                {v.nombre}
              </option>
            ))}
          </select>
        )}
      </section>

      <div className="mb-6 flex gap-2">
        {([['semana', 'Esta semana'], ['mes', 'Este mes']] as const).map(([p, etiqueta]) => (
          <button
            key={p}
            onClick={() => setPeriodo(p)}
            className={`rounded-full px-5 py-2.5 text-sm font-bold transition-colors ${
              periodo === p
                ? 'bg-prolimal-teal-700 text-white dark:bg-prolimal-teal-400 dark:text-prolimal-ink-900'
                : 'border border-prolimal-ink-900/10 bg-white text-prolimal-ink-600 hover:bg-prolimal-sand-100 dark:border-prolimal-sand-100/10 dark:bg-prolimal-ink-800 dark:text-prolimal-sand-100 dark:hover:bg-prolimal-ink-700'
            }`}
          >
            {etiqueta}
          </button>
        ))}
      </div>

      {!esVendedor && vendedores.length === 0 && !cargando && (
        <div className="mb-6 rounded-2xl border border-prolimal-sand-300/70 bg-prolimal-sand-100 px-5 py-4 text-sm font-medium text-prolimal-sand-800 dark:border-prolimal-sand-700/40 dark:bg-prolimal-sand-900/20 dark:text-prolimal-sand-200">
          Todavía no hay usuarios con rol &quot;ventas&quot;. Creálos en{' '}
          <Link href="/admin/usuarios" className="font-bold underline">
            Usuarios
          </Link>{' '}
          para ver sus ventas individuales.
        </div>
      )}

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-[2rem] border border-prolimal-ink-900/10 bg-card p-6 shadow-[0_24px_60px_-46px_rgba(11,37,32,0.45)] dark:border-prolimal-sand-100/10 dark:bg-card-dark">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-prolimal-teal-100 text-prolimal-teal-700 dark:bg-prolimal-teal-900/30 dark:text-prolimal-teal-300">
            <TrendingUp className="h-4 w-4" />
          </span>
          <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.16em] text-prolimal-ink-400 dark:text-prolimal-ink-300">Total vendido</p>
          <p className="mt-1 text-2xl font-extrabold tracking-[-0.04em] text-prolimal-ink-900 dark:text-prolimal-sand-50">{formatCurrency(resumen.totalVendido)}</p>
          <p className="mt-1 text-xs font-medium text-prolimal-ink-400 dark:text-prolimal-ink-300">{vendedorNombre}</p>
        </div>
        <div className="rounded-[2rem] border border-prolimal-ink-900/10 bg-card p-6 shadow-[0_24px_60px_-46px_rgba(11,37,32,0.45)] dark:border-prolimal-sand-100/10 dark:bg-card-dark">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-prolimal-sand-200 text-prolimal-sand-800 dark:bg-prolimal-sand-900/30 dark:text-prolimal-sand-200">
            <ClipboardList className="h-4 w-4" />
          </span>
          <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.16em] text-prolimal-ink-400 dark:text-prolimal-ink-300">Pedidos</p>
          <p className="mt-1 text-2xl font-extrabold tracking-[-0.04em] text-prolimal-ink-900 dark:text-prolimal-sand-50">{resumen.totalPedidos}</p>
          <p className="mt-1 text-xs font-medium text-prolimal-ink-400 dark:text-prolimal-ink-300">
            {periodo === 'semana' ? 'esta semana' : 'este mes'}
          </p>
        </div>
        <div className="rounded-[2rem] border border-prolimal-ink-900/10 bg-card p-6 shadow-[0_24px_60px_-46px_rgba(11,37,32,0.45)] dark:border-prolimal-sand-100/10 dark:bg-card-dark">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-prolimal-coral-100 text-prolimal-coral-700 dark:bg-prolimal-coral-900/25 dark:text-prolimal-coral-300">
            <Trophy className="h-4 w-4" />
          </span>
          <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.16em] text-prolimal-ink-400 dark:text-prolimal-ink-300">Mejor día</p>
          <p className="mt-1 text-2xl font-extrabold tracking-[-0.04em] text-prolimal-ink-900 dark:text-prolimal-sand-50">{formatCurrency(resumen.mejorDia?.valor || 0)}</p>
          <p className="mt-1 text-xs font-medium text-prolimal-ink-400 dark:text-prolimal-ink-300">{resumen.mejorDia?.fecha || '—'}</p>
        </div>
      </div>

      <div className="rounded-[2rem] border border-prolimal-ink-900/10 bg-card p-6 shadow-[0_24px_60px_-46px_rgba(11,37,32,0.45)] dark:border-prolimal-sand-100/10 dark:bg-card-dark">
        <h2 className="mb-4 text-sm font-extrabold uppercase tracking-[0.14em] text-prolimal-ink-600 dark:text-prolimal-ink-200">
          Ventas por día ·{' '}
          <span className="font-semibold normal-case tracking-normal text-prolimal-ink-400 dark:text-prolimal-ink-300">
            {aFechaISO(desde)} al {aFechaISO(hasta)}
          </span>
        </h2>
        {cargando ? (
          <p className="py-16 text-center text-sm font-medium text-prolimal-ink-400 dark:text-prolimal-ink-300">Cargando…</p>
        ) : (
          <div className="text-prolimal-ink-900 dark:text-prolimal-sand-50">
            <GraficoBarras datos={serieGrafica} />
          </div>
        )}
      </div>
    </div>
  );
}

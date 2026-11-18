'use client';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import GraficoBarras from '@/components/charts/GraficoBarras';
import { ClipboardList, TrendingUp, Users } from 'lucide-react';
import BotonComprobantePdf from '@/components/ui/BotonComprobantePdf';

interface VentaPersonal {
  usuario_id: number;
  usuario_nombre: string;
  total_pedidos: number;
  total_vendido: number;
  pedidos: { id: number; total: number; estado: string; fecha: string }[];
}

export default function AdminVentas() {
  const [ventas, setVentas] = useState<VentaPersonal[]>([]);
  const [cargando, setCargando] = useState(true);
  const [sel, setSel] = useState<VentaPersonal | null>(null);
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [filtroVendedor, setFiltroVendedor] = useState('');
  const [vistaGraf, setVistaGraf] = useState<'vendedor' | 'dia'>('vendedor');

  const cargar = useCallback(async () => {
    setCargando(true);
    const params: Record<string, string> = {};
    if (desde) params.desde = desde;
    if (hasta) params.hasta = hasta;
    try {
      const res = await api.get('/pedidos/ventas/personal', { params });
      setVentas(res.data);
    } catch {}
    setCargando(false);
  }, [desde, hasta]);

  useEffect(() => {
    cargar(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [cargar]);

  const visibles = filtroVendedor
    ? ventas.filter(v => v.usuario_id === Number(filtroVendedor))
    : ventas;

  const totalGeneral = visibles.reduce((s, v) => s + v.total_vendido, 0);

  const serieGraf = useMemo(() => {
    if (vistaGraf === 'vendedor') {
      return visibles.map(v => ({
        fecha: `v${v.usuario_id}`,
        etiqueta: v.usuario_nombre,
        valor: v.total_vendido,
        pedidos: v.total_pedidos,
      }));
    }
    const mapa = new Map<string, { valor: number; pedidos: number }>();
    for (const v of ventas) {
      for (const p of v.pedidos) {
        const f = String(p.fecha || '').slice(0, 10);
        if (!f) continue;
        const prev = mapa.get(f) || { valor: 0, pedidos: 0 };
        mapa.set(f, { valor: prev.valor + Number(p.total || 0), pedidos: prev.pedidos + 1 });
      }
    }
    return Array.from(mapa.entries())
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([fecha, { valor, pedidos }]) => ({ fecha, etiqueta: fecha, valor, pedidos }));
  }, [vistaGraf, ventas, visibles]);

  const cambiarVendedor = (id: string) => {
    setFiltroVendedor(id);
    setSel(null);
  };

  if (cargando) {
    return (
      <div className="prolimal-surface px-6 py-20 text-center text-sm font-medium text-prolimal-ink-400 dark:text-prolimal-ink-300">
        Cargando ventas...
      </div>
    );
  }

  return (
    <div className="pb-10">
      <section className="mb-8">
        <p className="prolimal-eyebrow">Comercial</p>
        <h2 className="prolimal-display mt-2 text-3xl tracking-[-0.04em] text-prolimal-ink-900 dark:text-prolimal-sand-50">
          Historial de ventas
        </h2>
        <p className="mt-2 max-w-xl text-sm font-medium leading-relaxed text-prolimal-ink-500 dark:text-prolimal-ink-200">
          Ventas registradas por cada miembro del personal.
        </p>
      </section>

      <div className="mb-8 rounded-[2rem] border border-prolimal-ink-900/10 bg-card p-5 shadow-[0_24px_60px_-46px_rgba(11,37,32,0.45)] dark:border-prolimal-sand-100/10 dark:bg-card-dark">
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[10rem] flex-1">
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.16em] text-prolimal-ink-400 dark:text-prolimal-ink-300">Vendedor</label>
            <select value={filtroVendedor} onChange={e => cambiarVendedor(e.target.value)}
              className="prolimal-input">
              <option value="">Todos</option>
              {ventas.map(v => (
                <option key={v.usuario_id} value={v.usuario_id}>{v.usuario_nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.16em] text-prolimal-ink-400 dark:text-prolimal-ink-300">Desde</label>
            <input type="date" value={desde} onChange={e => setDesde(e.target.value)}
              className="prolimal-input" />
          </div>
          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.16em] text-prolimal-ink-400 dark:text-prolimal-ink-300">Hasta</label>
            <input type="date" value={hasta} onChange={e => setHasta(e.target.value)}
              className="prolimal-input" />
          </div>
          <button onClick={cargar} className="prolimal-btn-primary">
            Filtrar
          </button>
          {(desde || hasta) && (
            <button onClick={() => { setDesde(''); setHasta(''); }}
              className="prolimal-btn-ghost px-3 py-2 text-sm">
              Limpiar filtro
            </button>
          )}
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-[2rem] border border-prolimal-ink-900/10 bg-card p-6 shadow-[0_24px_60px_-46px_rgba(11,37,32,0.45)] dark:border-prolimal-sand-100/10 dark:bg-card-dark">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-prolimal-teal-100 text-prolimal-teal-700 dark:bg-prolimal-teal-900/30 dark:text-prolimal-teal-300">
            <Users className="h-4 w-4" />
          </span>
          <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.16em] text-prolimal-ink-400 dark:text-prolimal-ink-300">Personal activo</p>
          <p className="mt-1 text-3xl font-extrabold tracking-[-0.05em] text-prolimal-ink-900 dark:text-prolimal-sand-50">{visibles.length}</p>
        </div>
        <div className="rounded-[2rem] border border-prolimal-ink-900/10 bg-card p-6 shadow-[0_24px_60px_-46px_rgba(11,37,32,0.45)] dark:border-prolimal-sand-100/10 dark:bg-card-dark">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-prolimal-sand-200 text-prolimal-sand-800 dark:bg-prolimal-sand-900/30 dark:text-prolimal-sand-200">
            <TrendingUp className="h-4 w-4" />
          </span>
          <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.16em] text-prolimal-ink-400 dark:text-prolimal-ink-300">Total vendido</p>
          <p className="mt-1 text-3xl font-extrabold tracking-[-0.05em] text-prolimal-ink-900 dark:text-prolimal-sand-50">{formatCurrency(totalGeneral)}</p>
        </div>
        <div className="rounded-[2rem] border border-prolimal-ink-900/10 bg-card p-6 shadow-[0_24px_60px_-46px_rgba(11,37,32,0.45)] dark:border-prolimal-sand-100/10 dark:bg-card-dark">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-prolimal-coral-100 text-prolimal-coral-700 dark:bg-prolimal-coral-900/25 dark:text-prolimal-coral-300">
            <ClipboardList className="h-4 w-4" />
          </span>
          <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.16em] text-prolimal-ink-400 dark:text-prolimal-ink-300">Total pedidos</p>
          <p className="mt-1 text-3xl font-extrabold tracking-[-0.05em] text-prolimal-ink-900 dark:text-prolimal-sand-50">{visibles.reduce((s, v) => s + v.total_pedidos, 0)}</p>
        </div>
      </div>

      <div className="mb-8 rounded-[2rem] border border-prolimal-ink-900/10 bg-card p-6 shadow-[0_24px_60px_-46px_rgba(11,37,32,0.45)] dark:border-prolimal-sand-100/10 dark:bg-card-dark">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-extrabold uppercase tracking-[0.14em] text-prolimal-ink-600 dark:text-prolimal-ink-200">Gráficas de ingresos</h2>
          <div className="flex gap-2">
            {([['vendedor', 'Por vendedor'], ['dia', 'Por día']] as const).map(([val, label]) => (
              <button key={val} onClick={() => setVistaGraf(val)}
                className={`rounded-full px-4 py-2 text-xs font-bold transition-colors ${
                  vistaGraf === val
                    ? 'bg-prolimal-teal-700 text-white dark:bg-prolimal-teal-400 dark:text-prolimal-ink-900'
                    : 'border border-prolimal-ink-900/10 bg-white text-prolimal-ink-600 hover:bg-prolimal-sand-100 dark:border-prolimal-sand-100/10 dark:bg-prolimal-ink-800 dark:text-prolimal-sand-100 dark:hover:bg-prolimal-ink-700'
                }`}>
                {label}
              </button>
            ))}
          </div>
        </div>
        {serieGraf.length === 0 ? (
          <p className="py-12 text-center text-sm font-medium text-prolimal-ink-400 dark:text-prolimal-ink-300">Sin datos de ventas en el período</p>
        ) : (
          <div className="text-prolimal-ink-900 dark:text-prolimal-sand-50">
            <GraficoBarras datos={serieGraf} />
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-[2rem] border border-prolimal-ink-900/10 bg-card shadow-[0_24px_60px_-46px_rgba(11,37,32,0.45)] dark:border-prolimal-sand-100/10 dark:bg-card-dark">
        <div className="border-b border-prolimal-ink-900/5 px-6 py-4 dark:border-prolimal-sand-100/10">
          <h2 className="text-sm font-extrabold uppercase tracking-[0.14em] text-prolimal-ink-600 dark:text-prolimal-ink-200">Detalle por vendedor</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-prolimal-ink-900/5 dark:border-prolimal-sand-100/10">
                {['Personal', 'Pedidos', 'Total vendido', 'Promedio', 'Detalle'].map((h) => (
                  <th key={h} className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-prolimal-ink-400 dark:text-prolimal-ink-300">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ventas.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-sm font-medium text-prolimal-ink-400 dark:text-prolimal-ink-300">Sin datos de ventas</td>
                </tr>
              ) : visibles.map(v => (
                <tr key={v.usuario_id} className="border-b border-prolimal-ink-900/5 last:border-0 dark:border-prolimal-sand-100/5">
                  <td className="px-6 py-4 text-sm font-bold text-prolimal-ink-800 dark:text-prolimal-sand-50">{v.usuario_nombre}</td>
                  <td className="px-6 py-4 text-sm font-medium text-prolimal-ink-600 dark:text-prolimal-sand-100">{v.total_pedidos}</td>
                  <td className="px-6 py-4 text-sm font-extrabold text-prolimal-teal-700 dark:text-prolimal-teal-300">{formatCurrency(v.total_vendido)}</td>
                  <td className="px-6 py-4 text-sm font-medium text-prolimal-ink-600 dark:text-prolimal-sand-100">{formatCurrency(v.total_pedidos > 0 ? v.total_vendido / v.total_pedidos : 0)}</td>
                  <td className="px-6 py-4">
                    <button onClick={() => setSel(sel?.usuario_id === v.usuario_id ? null : v)} className="text-xs font-bold text-prolimal-teal-700 underline-offset-4 hover:underline dark:text-prolimal-teal-300">
                      {sel?.usuario_id === v.usuario_id ? 'Ocultar' : 'Ver pedidos'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {sel && (
        <div className="mt-6 rounded-[2rem] border border-prolimal-ink-900/10 bg-card p-6 shadow-[0_24px_60px_-46px_rgba(11,37,32,0.45)] dark:border-prolimal-sand-100/10 dark:bg-card-dark">
          <h2 className="mb-4 text-sm font-extrabold uppercase tracking-[0.14em] text-prolimal-ink-600 dark:text-prolimal-ink-200">Pedidos de {sel.usuario_nombre}</h2>
          <div className="space-y-1">
            {sel.pedidos.map(p => (
              <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-prolimal-ink-900/5 py-3 last:border-0 dark:border-prolimal-sand-100/10">
                <div>
                  <p className="text-sm font-bold text-prolimal-ink-800 dark:text-prolimal-sand-50">Pedido #{p.id}</p>
                  <p className="text-xs font-medium text-prolimal-ink-400 dark:text-prolimal-ink-300">{new Date(p.fecha).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] ${
                    p.estado === 'entregado' ? 'bg-prolimal-teal-100 text-prolimal-teal-700 dark:bg-prolimal-teal-900/30 dark:text-prolimal-teal-300' :
                    p.estado === 'cancelado' ? 'bg-prolimal-coral-100 text-prolimal-coral-700 dark:bg-prolimal-coral-900/25 dark:text-prolimal-coral-300' :
                    'bg-prolimal-sand-200 text-prolimal-sand-800 dark:bg-prolimal-sand-900/30 dark:text-prolimal-sand-200'
                  }`}>{p.estado}</span>
                  <p className="text-sm font-extrabold text-prolimal-ink-900 dark:text-prolimal-sand-50">{formatCurrency(p.total)}</p>
                  <BotonComprobantePdf pedidoId={p.id} label="PDF" compacta />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { normalizarPedido, type PedidoEditable } from '@/lib/pedidos';
import { mensajeGeneral } from '@/lib/validacion';
import {
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  ClipboardList,
  RefreshCw,
  Search,
} from 'lucide-react';

const POR_PAGINA = 15;

const getColorEstado = (estado: string) => {
  const colores: Record<string, string> = {
    pendiente:
      'bg-prolimal-sand-200 text-prolimal-sand-800 dark:bg-prolimal-sand-900/30 dark:text-prolimal-sand-200',
    confirmado:
      'bg-prolimal-teal-100 text-prolimal-teal-700 dark:bg-prolimal-teal-900/30 dark:text-prolimal-teal-300',
    enviado:
      'bg-prolimal-purple-100 text-prolimal-purple-700 dark:bg-prolimal-purple-900/30 dark:text-prolimal-purple-300',
    entregado:
      'bg-prolimal-green-100 text-prolimal-green-700 dark:bg-prolimal-green-900/30 dark:text-prolimal-green-300',
    cancelado:
      'bg-prolimal-coral-100 text-prolimal-coral-700 dark:bg-prolimal-coral-900/25 dark:text-prolimal-coral-300',
  };
  return (
    colores[estado] ||
    'bg-prolimal-ink-100 text-prolimal-ink-700 dark:bg-prolimal-ink-800 dark:text-prolimal-ink-200'
  );
};

const th =
  'whitespace-nowrap px-3 py-3 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-prolimal-ink-400 sm:px-5 dark:text-prolimal-ink-300';
const td =
  'px-3 py-4 text-xs font-medium align-top text-prolimal-ink-500 sm:px-5 sm:text-sm dark:text-prolimal-ink-200';

type CampoOrden = 'id' | 'fecha' | 'monto' | 'estado';

function formatearFecha(valor?: string | null) {
  if (!valor) return '—';
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return valor;
  return fecha.toLocaleString('es-BO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export default function ListadoPedidosPage() {
  const [pedidos, setPedidos] = useState<PedidoEditable[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [orden, setOrden] = useState<{ campo: CampoOrden; asc: boolean }>({
    campo: 'fecha',
    asc: false,
  });
  const [pagina, setPagina] = useState(1);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const res = await api.get('/pedidos');
      setPedidos(
        Array.isArray(res.data) ? res.data.map(normalizarPedido) : [],
      );
    } catch (err: unknown) {
      setError(mensajeGeneral(err, 'No se pudo cargar el listado de pedidos.'));
      setPedidos([]);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [cargar]);

  const estados = useMemo(
    () => [...new Set(pedidos.map((p) => p.estado).filter(Boolean))].sort(),
    [pedidos],
  );

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const resultado = pedidos.filter((p) => {
      if (filtroEstado && p.estado !== filtroEstado) return false;
      if (!q) return true;
      return (
        String(p.id).includes(q) ||
        (p.usuario?.nombre || '').toLowerCase().includes(q) ||
        (p.usuario?.email || '').toLowerCase().includes(q) ||
        (p.usuario?.telefono || '').toLowerCase().includes(q)
      );
    });

    const mult = orden.asc ? 1 : -1;
    return [...resultado].sort((a, b) => {
      switch (orden.campo) {
        case 'id':
          return (a.id - b.id) * mult;
        case 'monto':
          return (a.total - b.total) * mult;
        case 'estado':
          return a.estado.localeCompare(b.estado, 'es') * mult;
        case 'fecha':
        default:
          return (
            (new Date(a.creado_en).getTime() -
              new Date(b.creado_en).getTime()) *
            mult
          );
      }
    });
  }, [pedidos, busqueda, filtroEstado, orden]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const paginaSegura = Math.min(pagina, totalPaginas);
  const inicio = (paginaSegura - 1) * POR_PAGINA;
  const filas = filtrados.slice(inicio, inicio + POR_PAGINA);

  const cambiarOrden = (campo: CampoOrden) => {
    setOrden((prev) =>
      prev.campo === campo
        ? { campo, asc: !prev.asc }
        : { campo, asc: campo === 'id' || campo === 'estado' },
    );
    setPagina(1);
  };

  const encabezado = (campo: CampoOrden, etiqueta: string) => (
    <th scope="col" className={th} aria-sort={
      orden.campo === campo
        ? orden.asc
          ? 'ascending'
          : 'descending'
        : 'none'
    }>
      <button
        type="button"
        onClick={() => cambiarOrden(campo)}
        className="inline-flex items-center gap-1.5 transition-colors hover:text-prolimal-teal-700 dark:hover:text-prolimal-teal-300"
      >
        {etiqueta}
        {orden.campo === campo &&
          (orden.asc ? (
            <ArrowUp className="h-3 w-3" aria-hidden="true" />
          ) : (
            <ArrowDown className="h-3 w-3" aria-hidden="true" />
          ))}
      </button>
    </th>
  );

  return (
    <main className="prolimal-page min-h-screen px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/admin/pedidos"
          className="group inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-prolimal-ink-500 transition-colors hover:text-prolimal-teal-700 dark:text-prolimal-ink-200 dark:hover:text-prolimal-teal-300"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Gestión de pedidos
        </Link>

        <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="prolimal-eyebrow">Operaciones · Pedidos</p>
            <h1 className="prolimal-display mt-2 text-3xl tracking-[-0.04em] text-prolimal-ink-900 dark:text-prolimal-sand-50 sm:text-4xl">
              Listado de pedidos
            </h1>
            <p className="mt-1 text-sm font-medium text-prolimal-ink-500 dark:text-prolimal-ink-200">
              Fecha, monto y estado de todos los pedidos registrados.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/pedidos"
              className="prolimal-btn-secondary px-4 py-2.5 text-xs"
            >
              <ClipboardList className="h-4 w-4" />
              Ver gestión
            </Link>
            <button
              type="button"
              onClick={cargar}
              disabled={cargando}
              className="prolimal-btn-secondary px-4 py-2.5 text-xs disabled:opacity-60"
            >
              <RefreshCw
                className={`h-4 w-4 ${cargando ? 'animate-spin' : ''}`}
              />
              Actualizar
            </button>
          </div>
        </div>

        <section className="mt-8 overflow-hidden rounded-[2rem] border border-prolimal-ink-900/10 bg-card shadow-[0_24px_60px_-46px_rgba(11,37,32,0.45)] dark:border-prolimal-sand-100/10 dark:bg-card-dark">
          <div className="flex flex-wrap items-center gap-3 border-b border-prolimal-ink-900/5 px-5 py-4 dark:border-prolimal-sand-100/10">
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-prolimal-ink-400 dark:text-prolimal-ink-300" />
              <input
                type="search"
                value={busqueda}
                onChange={(e) => {
                  setBusqueda(e.target.value);
                  setPagina(1);
                }}
                placeholder="Buscar por N°, cliente, email o teléfono"
                aria-label="Buscar pedidos"
                className="prolimal-input pl-9"
              />
            </div>
            <select
              value={filtroEstado}
              onChange={(e) => {
                setFiltroEstado(e.target.value);
                setPagina(1);
              }}
              aria-label="Filtrar por estado"
              className="prolimal-input w-auto"
            >
              <option value="">Todos los estados</option>
              {estados.map((estado) => (
                <option key={estado} value={estado}>
                  {estado.charAt(0).toUpperCase() + estado.slice(1)}
                </option>
              ))}
            </select>
            <span className="shrink-0 rounded-full bg-prolimal-sand-100 px-3 py-2 text-[11px] font-bold text-prolimal-ink-600 dark:bg-prolimal-ink-800 dark:text-prolimal-sand-100">
              {filtrados.length} pedido{filtrados.length === 1 ? '' : 's'}
            </span>
          </div>

          {error && (
            <p
              role="alert"
              className="mx-5 mt-4 rounded-xl border border-prolimal-red-200 bg-prolimal-red-50 px-4 py-3 text-sm font-semibold text-prolimal-red-700 dark:border-prolimal-red-700/40 dark:bg-prolimal-red-900/20 dark:text-prolimal-red-300"
            >
              {error}
            </p>
          )}

          <p className="mb-2 text-[11px] font-medium text-prolimal-ink-400 md:hidden dark:text-prolimal-ink-300">
            Deslizá para ver más columnas →
          </p>
          <div className="scrollbar-hide overflow-x-auto">
            <table
              className="w-full min-w-[720px] lg:min-w-[820px]"
              aria-label="Listado de pedidos con fecha, monto y estado"
            >
              <thead>
                <tr className="border-b border-prolimal-ink-900/5 bg-prolimal-sand-50/60 dark:border-prolimal-sand-100/10 dark:bg-prolimal-ink-800/40">
                  {encabezado('id', 'Pedido')}
                  <th scope="col" className={th}>
                    Cliente
                  </th>
                  {encabezado('fecha', 'Fecha')}
                  {encabezado('monto', 'Monto')}
                  {encabezado('estado', 'Estado')}
                </tr>
              </thead>
              <tbody>
                {cargando && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-14 text-center text-sm font-medium text-prolimal-ink-400 dark:text-prolimal-ink-300"
                    >
                      Cargando pedidos...
                    </td>
                  </tr>
                )}

                {!cargando && filas.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-14 text-center">
                      <ClipboardList className="mx-auto h-10 w-10 text-prolimal-ink-300 dark:text-prolimal-ink-500" />
                      <p className="mt-3 text-sm font-bold text-prolimal-ink-700 dark:text-prolimal-sand-100">
                        {pedidos.length === 0
                          ? 'Todavía no hay pedidos registrados'
                          : 'No hay pedidos que coincidan con la búsqueda'}
                      </p>
                    </td>
                  </tr>
                )}

                {!cargando &&
                  filas.map((pedido) => (
                    <tr
                      key={pedido.id}
                      className="border-b border-prolimal-ink-900/5 last:border-0 dark:border-prolimal-sand-100/5"
                    >
                      <td className={`${td} whitespace-nowrap font-extrabold text-prolimal-ink-800 dark:text-prolimal-sand-50`}>
                        #{pedido.id}
                      </td>
                      <td className={`${td} min-w-[200px] break-words`}>
                        <span className="font-bold text-prolimal-ink-700 dark:text-prolimal-sand-100">
                          {pedido.usuario?.nombre || `Cliente #${pedido.id}`}
                        </span>
                        {pedido.usuario?.email && (
                          <span className="mt-0.5 block text-[11px] font-medium text-prolimal-ink-400 dark:text-prolimal-ink-300">
                            {pedido.usuario.email}
                          </span>
                        )}
                      </td>
                      <td className={`${td} whitespace-nowrap tabular-nums`}>
                        {formatearFecha(pedido.creado_en)}
                      </td>
                      <td className={`${td} whitespace-nowrap text-base font-extrabold tabular-nums text-prolimal-ink-900 dark:text-prolimal-sand-50`}>
                        {formatCurrency(pedido.total)}
                      </td>
                      <td className={td}>
                        <span
                          className={`inline-flex shrink-0 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.1em] ${getColorEstado(pedido.estado)}`}
                        >
                          {pedido.estado || '—'}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {!cargando && filtrados.length > POR_PAGINA && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-prolimal-ink-900/5 px-5 py-4 dark:border-prolimal-sand-100/10">
              <p className="text-xs font-medium text-prolimal-ink-500 dark:text-prolimal-ink-300">
                Mostrando {inicio + 1}–{Math.min(inicio + POR_PAGINA, filtrados.length)} de{' '}
                {filtrados.length}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPagina((p) => Math.max(1, p - 1))}
                  disabled={paginaSegura <= 1}
                  className="prolimal-btn-secondary px-3 py-2 text-xs disabled:opacity-50"
                >
                  Anterior
                </button>
                <span className="self-center text-xs font-bold text-prolimal-ink-600 dark:text-prolimal-ink-200">
                  {paginaSegura} / {totalPaginas}
                </span>
                <button
                  type="button"
                  onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                  disabled={paginaSegura >= totalPaginas}
                  className="prolimal-btn-secondary px-3 py-2 text-xs disabled:opacity-50"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { ArrowLeft, RefreshCw, Search } from 'lucide-react';

interface MovimientoKardex {
  id: number;
  producto_id: number;
  producto: { id: number; nombre: string; codigo?: string | null } | null;
  tipo: string;
  cantidad: number;
  /** Cantidad con signo: + para entradas, - para salidas. */
  delta: number;
  cantidad_anterior: number | null;
  cantidad_nueva: number | null;
  motivo: string | null;
  referencia_id: number | null;
  referencia_tipo: string | null;
  usuario: { id: number; nombre: string } | null;
  creado_en: string;
  saldo_actual: number;
}

interface ProductoOption {
  id: number;
  nombre: string;
}

const ETIQUETA_TIPO: Record<string, string> = {
  entrada: 'Entrada (compra/ingreso)',
  devolucion: 'Devolución (entrada)',
  salida: 'Salida',
  venta: 'Venta (salida)',
  ajuste: 'Ajuste',
};

const TIPOS = ['entrada', 'salida', 'venta', 'devolucion', 'ajuste'];

const th =
  'whitespace-nowrap px-5 py-3 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-prolimal-ink-400 dark:text-prolimal-ink-300';
const td =
  'px-5 py-4 text-sm font-medium text-prolimal-ink-500 dark:text-prolimal-ink-200';

function esEntrada(tipo: string) {
  const t = tipo.toLowerCase();
  return t === 'entrada' || t === 'devolucion';
}

function claseTipo(tipo: string) {
  const t = tipo.toLowerCase();
  if (esEntrada(t)) {
    return 'bg-prolimal-teal-100 text-prolimal-teal-800 dark:bg-prolimal-teal-900/30 dark:text-prolimal-teal-200';
  }
  if (t === 'salida' || t === 'venta') {
    return 'bg-prolimal-red-100 text-prolimal-red-800 dark:bg-prolimal-red-900/30 dark:text-prolimal-red-200';
  }
  return 'bg-prolimal-sand-200 text-prolimal-sand-800 dark:bg-prolimal-ink-700 dark:text-prolimal-sand-100';
}

function formatearFecha(valor: string) {
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return valor || '—';
  return fecha.toLocaleString('es-BO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function referenciaDe(movimiento: MovimientoKardex) {
  if (movimiento.referencia_id != null) {
    const tipo = movimiento.referencia_tipo
      ? `${movimiento.referencia_tipo} `
      : '';
    return `${tipo}#${movimiento.referencia_id}`;
  }
  return movimiento.motivo?.trim() || movimiento.referencia_tipo || '—';
}

export default function KardexPage() {
  const [movimientos, setMovimientos] = useState<MovimientoKardex[]>([]);
  const [productos, setProductos] = useState<ProductoOption[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [productoFiltro, setProductoFiltro] = useState('all');
  const [tipoFiltro, setTipoFiltro] = useState('all');

  const cargar = async () => {
    setCargando(true);
    setError('');
    try {
      const [resKardex, resInventario] = await Promise.all([
        api.get<MovimientoKardex[]>('/inventario-movimientos/kardex'),
        api.get('/inventario', { params: { limit: 100 } }).catch(() => ({ data: [] })),
      ]);

      const filas = Array.isArray(resKardex.data) ? resKardex.data : [];
      setMovimientos(filas);

      const inventario = Array.isArray(resInventario.data)
        ? resInventario.data
        : [];
      const opciones = new Map<number, string>();
      inventario.forEach((item: {
        producto_id?: number;
        producto?: { id?: number; nombre?: string } | null;
      }) => {
        const id = item.producto_id ?? item.producto?.id;
        if (id && item.producto?.nombre) opciones.set(id, item.producto.nombre);
      });
      filas.forEach((m) => {
        if (m.producto && !opciones.has(m.producto_id)) {
          opciones.set(m.producto_id, m.producto.nombre);
        }
      });
      setProductos(
        [...opciones.entries()]
          .map(([id, nombre]) => ({ id, nombre }))
          .sort((a, b) => a.nombre.localeCompare(b.nombre)),
      );
    } catch {
      setError('No se pudo cargar el Kardex. Revisá la conexión e intentá nuevamente.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar(); // eslint-disable-line react-hooks/set-state-in-effect
  }, []);

  const filasVisibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return movimientos.filter((m) => {
      if (productoFiltro !== 'all' && m.producto_id !== Number(productoFiltro)) {
        return false;
      }
      if (tipoFiltro !== 'all' && m.tipo.toLowerCase() !== tipoFiltro) {
        return false;
      }
      if (!q) return true;
      const texto = [
        m.producto?.nombre,
        m.producto?.codigo,
        m.tipo,
        ETIQUETA_TIPO[m.tipo.toLowerCase()] || m.tipo,
        m.motivo,
        m.referencia_tipo,
        m.referencia_id != null ? `#${m.referencia_id}` : '',
        m.usuario?.nombre,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return texto.includes(q);
    });
  }, [movimientos, busqueda, productoFiltro, tipoFiltro]);

  const resumen = useMemo(() => {
    const entradas = movimientos.filter((m) => esEntrada(m.tipo)).length;
    const salidas = movimientos.filter((m) =>
      ['salida', 'venta'].includes(m.tipo.toLowerCase()),
    ).length;
    return { entradas, salidas };
  }, [movimientos]);

  return (
    <div className="pb-10">
      <section className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="prolimal-eyebrow">Operaciones · Inventario</p>
          <h2 className="prolimal-display mt-2 text-3xl tracking-[-0.04em] text-prolimal-innk-900 dark:text-prolimal-sand-50">
            Kardex de inventario
          </h2>
          <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-prolimal-innk-500 dark:text-prolimal-innk-200">
            Entradas (compra/ingreso) y salidas (venta) con fecha, referencia y
            saldo de unidades actualizado de cada producto.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/inventario"
            prefetch={false}
            className="inline-flex items-center gap-2 rounded-full border border-prolimal-innk-900/10 bg-card px-4 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-prolimal-innk-500 transition-colors hover:bg-prolimal-sand-100 dark:border-prolimal-sand-100/10 dark:bg-card-dark dark:text-prolimal-innk-200"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Inventario
          </Link>
          <button
            type="button"
            onClick={cargar}
            disabled={cargando}
            className="inline-flex items-center gap-2 rounded-full bg-prolimal-teal-700 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-white transition-colors hover:bg-prolimal-innk-900 disabled:opacity-60 dark:bg-prolimal-teal-400 dark:text-prolimal-innk-900"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${cargando ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>
      </section>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="relative sm:col-span-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-prolimal-innk-400 dark:text-prolimal-ink-300" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar producto, referencia o motivo"
            className="prolimal-search-input w-full"
          />
        </div>
        <select
          aria-label="Filtrar por producto"
          value={productoFiltro}
          onChange={(e) => setProductoFiltro(e.target.value)}
          className="prolimal-input"
        >
          <option value="all">Todos los productos</option>
          {productos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </select>
        <select
          aria-label="Filtrar por tipo de movimiento"
          value={tipoFiltro}
          onChange={(e) => setTipoFiltro(e.target.value)}
          className="prolimal-input"
        >
          <option value="all">Todos los movimientos</option>
          {TIPOS.map((tipo) => (
            <option key={tipo} value={tipo}>
              {ETIQUETA_TIPO[tipo]}
            </option>
          ))}
        </select>
      </div>

      <section className="overflow-hidden rounded-[2rem] border border-prolimal-innk-900/10 bg-card shadow-[0_24px_60px_-46px_rgba(11,37,32,0.45)] dark:border-prolimal-sand-100/10 dark:bg-card-dark">
        <div className="flex flex-wrap items-center justify-between gap-2 px-6 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-prolimal-innk-400 dark:text-prolimal-ink-300">
              Movimientos
            </p>
            <p className="mt-1 text-sm font-extrabold text-prolimal-innk-900 dark:text-prolimal-sand-50">
              {filasVisibles.length} de {movimientos.length} registros
            </p>
          </div>
          <p className="text-xs font-medium text-prolimal-innk-400 dark:text-prolimal-ink-300">
            {resumen.entradas} entradas · {resumen.salidas} salidas
          </p>
        </div>

        {error && (
          <p className="mx-6 mb-4 rounded-xl border border-prolimal-red-200 bg-prolimal-red-50 px-4 py-3 text-sm font-medium text-prolimal-red-700 dark:border-prolimal-red-700/40 dark:bg-prolimal-red-900/20 dark:text-prolimal-red-300">
            {error}
          </p>
        )}

        {/* El scroll horizontal evita recortar tipo, cantidad y saldo en pantallas chicas. */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px]" aria-label="Kardex de inventario">
            <thead>
              <tr className="border-b border-prolimal-innk-900/5 bg-prolimal-sand-50/60 dark:border-prolimal-sand-100/10 dark:bg-prolimal-ink-800/40">
                <th className={`${th} min-w-[175px]`}>Fecha</th>
                <th className={`${th} min-w-[230px]`}>Producto</th>
                <th className={`${th} min-w-[210px]`}>Tipo de movimiento</th>
                <th className={`${th} min-w-[120px] text-right`}>Cantidad</th>
                <th className={`${th} min-w-[250px]`}>Referencia / Motivo</th>
                <th className={`${th} min-w-[150px]`}>Usuario</th>
                <th className={`${th} min-w-[120px] text-right`}>Saldo</th>
              </tr>
            </thead>
            <tbody>
              {cargando && (
                <tr>
                  <td colSpan={7} className="px-6 py-14 text-center text-sm font-medium text-prolimal-innk-400 dark:text-prolimal-ink-300">
                    Cargando Kardex...
                  </td>
                </tr>
              )}
              {!cargando && filasVisibles.map((m) => (
                <tr
                  key={m.id}
                  className="border-b border-prolimal-innk-900/5 last:border-0 dark:border-prolimal-sand-100/5"
                >
                  <td className={`${td} min-w-[175px] whitespace-nowrap tabular-nums`}>
                    {formatearFecha(m.creado_en)}
                  </td>
                  <td className={`${td} min-w-[230px] whitespace-normal break-words font-bold text-prolimal-innk-800 dark:text-prolimal-sand-50`}>
                    {m.producto?.nombre || `Producto #${m.producto_id}`}
                    {m.producto?.codigo && (
                      <span className="mt-0.5 block text-[11px] font-medium text-prolimal-innk-400 dark:text-prolimal-ink-300">
                        Código: {m.producto.codigo}
                      </span>
                    )}
                  </td>
                  <td className={`${td} min-w-[210px] whitespace-nowrap`}>
                    <span className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-bold ${claseTipo(m.tipo)}`}>
                      {ETIQUETA_TIPO[m.tipo.toLowerCase()] || m.tipo}
                    </span>
                  </td>
                  <td
                    className={`${td} min-w-[120px] whitespace-nowrap text-right tabular-nums text-base font-extrabold ${
                      m.delta >= 0
                        ? 'text-prolimal-teal-700 dark:text-prolimal-teal-300'
                        : 'text-prolimal-red-600 dark:text-prolimal-red-300'
                    }`}
                  >
                    {m.delta >= 0 ? '+' : '−'}{Math.abs(m.delta)}
                  </td>
                  <td className={`${td} min-w-[250px] whitespace-normal break-words`}>
                    {referenciaDe(m)}
                    {m.referencia_id != null && m.motivo?.trim() && (
                      <span className="mt-0.5 block text-[11px] text-prolimal-innk-400 dark:text-prolimal-ink-300">
                        {m.motivo}
                      </span>
                    )}
                  </td>
                  <td className={`${td} min-w-[150px] whitespace-nowrap`}>
                    {m.usuario?.nombre || '—'}
                  </td>
                  <td className={`${td} min-w-[120px] whitespace-nowrap text-right tabular-nums text-base font-extrabold text-prolimal-innk-900 dark:text-prolimal-sand-50`}>
                    {m.saldo_actual} u.
                  </td>
                </tr>
              ))}
              {!cargando && filasVisibles.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-14 text-center text-sm font-medium text-prolimal-innk-400 dark:text-prolimal-ink-300">
                    No hay movimientos para los filtros seleccionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <p className="mt-4 text-xs font-medium text-prolimal-innk-400 dark:text-prolimal-ink-300">
        El saldo se acumula por producto en orden cronológico; las entradas suman
        unidades y las salidas (ventas) las descuentan.
      </p>
    </div>
  );
}

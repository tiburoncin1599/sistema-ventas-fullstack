'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api, apiFetchBlob } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import GraficoBarras from '@/components/charts/GraficoBarras';
import { aFechaISO, rangoMes } from '@/components/charts/chart-utils';
import { Search } from 'lucide-react';

interface DiaVenta {
  fecha: string;
  total_pedidos: number;
  total_vendido: number;
  cancelados: number;
}

interface FilaProducto {
  id: number;
  nombre: string;
  precio: number;
  categoria: string | null;
  unidades_vendidas: number;
  total_ingresos: number;
}

interface FilaCategoria {
  id: number;
  nombre: string;
  unidades_vendidas: number;
  total_ingresos: number;
}

interface FilaInventario {
  id: number;
  nombre: string;
  precio: number;
  precio_costo: number;
  cantidad: number;
  cantidad_minima: number;
  categoria: string | null;
}

interface FilaCliente {
  id: number;
  nombre: string;
  email: string;
  total_compras: number;
  total_gastado: number;
  ultima_compra: string;
}

type Seccion = 'ventas' | 'ganancias' | 'producto' | 'categoria' | 'inventario' | 'clientes';

const SECCIONES: { id: Seccion; etiqueta: string }[] = [
  { id: 'ventas', etiqueta: 'Ventas por fecha' },
  { id: 'ganancias', etiqueta: 'Ganancias' },
  { id: 'producto', etiqueta: 'Por producto' },
  { id: 'categoria', etiqueta: 'Por categoría' },
  { id: 'inventario', etiqueta: 'Inventario' },
  { id: 'clientes', etiqueta: 'Clientes frecuentes' },
];

function descargar(url: string, nombre: string, setCargando: (b: boolean) => void) {
  setCargando(true);
  apiFetchBlob(url)
    .then((blob) => {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = nombre;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    })
    .catch(() => alert('No se pudo descargar el archivo'))
    .finally(() => setCargando(false));
}

const th = 'px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-prolimal-ink-400 dark:text-prolimal-ink-300';
const td = 'px-4 py-4 text-sm text-prolimal-ink-600 dark:text-prolimal-sand-100';

export default function AdminReportes() {
  const hoy = useMemo(() => new Date(), []);
  const inicioMes = useMemo(() => rangoMes().desde, []);

  const [desde, setDesde] = useState(aFechaISO(inicioMes));
  const [hasta, setHasta] = useState(aFechaISO(hoy));
  const [seccion, setSeccion] = useState<Seccion>('ventas');
  const [busqueda, setBusqueda] = useState('');

  const [cargando, setCargando] = useState(false);
  const [ventasFecha, setVentasFecha] = useState<DiaVenta[]>([]);
  const [ganancias, setGanancias] = useState<{ ingresos: number; costo: number; ganancia: number } | null>(null);
  const [productos, setProductos] = useState<FilaProducto[]>([]);
  const [categorias, setCategorias] = useState<FilaCategoria[]>([]);
  const [inventario, setInventario] = useState<FilaInventario[]>([]);
  const [clientes, setClientes] = useState<FilaCliente[]>([]);
  const [descargando, setDescargando] = useState(false);

  useEffect(() => {
    const params = { desde, hasta };
setCargando(true); // eslint-disable-line react-hooks/set-state-in-effect
    Promise.all([
      api.get('/reportes/ventas-por-fecha', { params }),
      api.get('/reportes/ganancias', { params }),
      api.get('/reportes/ventas-por-producto', { params }),
      api.get('/reportes/ventas-por-categoria', { params }),
      api.get('/reportes/inventario'),
      api.get('/reportes/clientes-frecuentes'),
    ])
      .then(([vf, g, pr, ct, inv, cl]) => {
        setVentasFecha(vf.data || []);
        setGanancias((g.data && g.data[0]) || null);
        setProductos(pr.data || []);
        setCategorias(ct.data || []);
        setInventario(inv.data || []);
        setClientes(cl.data || []);
      })
      .catch(() => {})
      .finally(() => setCargando(false));
  }, [desde, hasta]);

  const serieVentas = useMemo(() => {
    return [...ventasFecha]
      .map((d) => ({
        fecha: String(d.fecha).slice(0, 10),
        etiqueta: String(d.fecha).slice(8, 10),
        valor: Number(d.total_vendido || 0),
        pedidos: Number(d.total_pedidos || 0),
      }))
      .sort((a, b) => a.fecha.localeCompare(b.fecha));
  }, [ventasFecha]);

  const totalesVentas = useMemo(() => {
    return ventasFecha.reduce(
      (acc, d) => ({
        vendido: acc.vendido + Number(d.total_vendido || 0),
        pedidos: acc.pedidos + Number(d.total_pedidos || 0),
        cancelados: acc.cancelados + Number(d.cancelados || 0),
      }),
      { vendido: 0, pedidos: 0, cancelados: 0 },
    );
  }, [ventasFecha]);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) {
      return {
        productos,
        categorias,
        inventario,
        clientes,
      };
    }
    return {
      productos: productos.filter((p) =>
        p.nombre.toLowerCase().includes(q) || (p.categoria || '').toLowerCase().includes(q),
      ),
      categorias: categorias.filter((c) => c.nombre.toLowerCase().includes(q)),
      inventario: inventario.filter((i) =>
        i.nombre.toLowerCase().includes(q) || (i.categoria || '').toLowerCase().includes(q),
      ),
      clientes: clientes.filter((c) =>
        c.nombre.toLowerCase().includes(q) || c.email.toLowerCase().includes(q),
      ),
    };
  }, [busqueda, productos, categorias, inventario, clientes]);

  const aplicarPreset = (desdeD: Date, hastaD: Date) => {
    setDesde(aFechaISO(desdeD));
    setHasta(aFechaISO(hastaD));
  };

  const presets = useMemo(() => {
    const hoyD = new Date();
    const hacervicios = (dias: number) => {
      const d = new Date(hoyD);
      d.setDate(hoyD.getDate() - (dias - 1));
      return d;
    };
    return {
      '7 días': [hacervicios(7), hoyD],
      '30 días': [hacervicios(30), hoyD],
      'Este mes': [rangoMes().desde, rangoMes().hasta],
    } as const;
  }, []);

  const paramActivos = hasta && desde ? `&desde=${desde}&hasta=${hasta}` : '';
  const exportar = (tipo: string, nombre: string, conPDF?: boolean) => {
    const base = `/reportes/exportar/csv?tipo=${tipo}${paramActivos}`;
    if (conPDF) {
      descargar(`/reportes/exportar/pdf?tipo=${tipo}${paramActivos}`, `${nombre}.pdf`, setDescargando);
    } else {
      descargar(base, `${nombre}.csv`, setDescargando);
    }
  };

  return (
    <div className="pb-10">
      <section className="mb-8">
        <Link href="/admin" className="text-xs font-bold uppercase tracking-[0.14em] text-prolimal-teal-700 hover:underline dark:text-prolimal-teal-300">
          ← Panel admin
        </Link>
        <h2 className="prolimal-display mt-2 text-3xl tracking-[-0.04em] text-prolimal-ink-900 dark:text-prolimal-sand-50">
          Reportes
        </h2>
        <p className="mt-2 max-w-xl text-sm font-medium leading-relaxed text-prolimal-ink-500 dark:text-prolimal-ink-200">
          Ventas, ganancias, inventario y clientes con exportación.
        </p>
      </section>

      <div className="mb-6 rounded-[2rem] border border-prolimal-ink-900/10 bg-card p-5 shadow-[0_24px_60px_-46px_rgba(11,37,32,0.45)] dark:border-prolimal-sand-100/10 dark:bg-card-dark">
        <div className="flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.16em] text-prolimal-ink-400 dark:text-prolimal-ink-300">Desde</span>
            <input
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              className="prolimal-input"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.16em] text-prolimal-ink-400 dark:text-prolimal-ink-300">Hasta</span>
            <input
              type="date"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              className="prolimal-input"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(presets).map(([etiqueta, [desdeD, hastaD]]) => (
              <button
                key={etiqueta}
                onClick={() => aplicarPreset(desdeD, hastaD)}
                className="rounded-full border border-prolimal-ink-900/10 bg-prolimal-sand-100 px-4 py-2.5 text-xs font-bold text-prolimal-ink-600 transition-colors hover:bg-prolimal-sand-200 dark:border-prolimal-sand-100/10 dark:bg-prolimal-ink-800 dark:text-prolimal-sand-100 dark:hover:bg-prolimal-ink-700"
              >
                {etiqueta}
              </button>
            ))}
            <button
              onClick={() => { setDesde(''); setHasta(''); }}
              className="prolimal-btn-ghost px-4 py-2.5 text-xs"
            >
              Todo
            </button>
          </div>
          {!desde && !hasta && (
            <span className="text-xs font-medium text-prolimal-ink-400 dark:text-prolimal-ink-300">Sin filtro de fechas (todo el historial)</span>
          )}
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {SECCIONES.map((s) => (
          <button
            key={s.id}
            onClick={() => setSeccion(s.id)}
            className={`rounded-full px-4 py-2.5 text-xs font-bold transition-colors ${
              seccion === s.id
                ? 'bg-prolimal-teal-700 text-white dark:bg-prolimal-teal-400 dark:text-prolimal-ink-900'
                : 'border border-prolimal-ink-900/10 bg-white text-prolimal-ink-600 hover:bg-prolimal-sand-100 dark:border-prolimal-sand-100/10 dark:bg-prolimal-ink-800 dark:text-prolimal-sand-100 dark:hover:bg-prolimal-ink-700'
            }`}
          >
            {s.etiqueta}
          </button>
        ))}
      </div>

      {(seccion === 'producto' || seccion === 'categoria' || seccion === 'inventario' || seccion === 'clientes') && (
        <div className="relative mb-6 w-full max-w-sm">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-prolimal-ink-400 dark:text-prolimal-ink-300" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar..."
            className="prolimal-search-input"
          />
        </div>
      )}

      {cargando ? (
        <div className="prolimal-surface px-6 py-20 text-center text-sm font-medium text-prolimal-ink-400 dark:text-prolimal-ink-300">
          Cargando reportes...
        </div>
      ) : (
        <div>
          {seccion === 'ventas' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {[
                  { label: 'Total vendido', value: formatCurrency(totalesVentas.vendido) },
                  { label: 'Pedidos', value: totalesVentas.pedidos },
                  { label: 'Cancelados', value: totalesVentas.cancelados },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-[2rem] border border-prolimal-ink-900/10 bg-card p-5 shadow-[0_24px_60px_-46px_rgba(11,37,32,0.45)] dark:border-prolimal-sand-100/10 dark:bg-card-dark">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-prolimal-ink-400 dark:text-prolimal-ink-300">{label}</p>
                    <p className="mt-1 text-2xl font-extrabold tracking-[-0.04em] text-prolimal-ink-900 dark:text-prolimal-sand-50">{value}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-[2rem] border border-prolimal-ink-900/10 bg-card p-6 shadow-[0_24px_60px_-46px_rgba(11,37,32,0.45)] dark:border-prolimal-sand-100/10 dark:bg-card-dark">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-sm font-extrabold uppercase tracking-[0.14em] text-prolimal-ink-600 dark:text-prolimal-ink-200">
                    Ventas por día ·{' '}
                    <span className="font-semibold normal-case tracking-normal text-prolimal-ink-400 dark:text-prolimal-ink-300">
                      {desde || 'inicio'} al {hasta || 'hoy'}
                    </span>
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => exportar('ventas-por-fecha', 'ventas-por-fecha')}
                      disabled={descargando}
                      className="rounded-full border border-prolimal-ink-900/10 bg-prolimal-sand-100 px-4 py-2 text-xs font-bold text-prolimal-ink-600 transition-colors hover:bg-prolimal-sand-200 disabled:opacity-50 dark:border-prolimal-sand-100/10 dark:bg-prolimal-ink-800 dark:text-prolimal-sand-100 dark:hover:bg-prolimal-ink-700"
                    >
                      CSV
                    </button>
                    <button
                      onClick={() => exportar('ventas-por-fecha', 'ventas-por-fecha', true)}
                      disabled={descargando}
                      className="rounded-full bg-prolimal-teal-700 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-prolimal-ink-900 disabled:opacity-50 dark:bg-prolimal-teal-400 dark:text-prolimal-ink-900 dark:hover:bg-prolimal-teal-300"
                    >
                      PDF
                    </button>
                  </div>
                </div>
                {serieVentas.length > 0 ? (
                  <div className="text-prolimal-ink-900 dark:text-prolimal-sand-50">
                    <GraficoBarras datos={serieVentas} />
                  </div>
                ) : (
                  <p className="py-10 text-center text-sm font-medium text-prolimal-ink-400 dark:text-prolimal-ink-300">Sin ventas en el período.</p>
                )}
              </div>

              <div className="overflow-hidden rounded-[2rem] border border-prolimal-ink-900/10 bg-card shadow-[0_24px_60px_-46px_rgba(11,37,32,0.45)] dark:border-prolimal-sand-100/10 dark:bg-card-dark">
                <div className="border-b border-prolimal-ink-900/5 px-6 py-4 dark:border-prolimal-sand-100/10">
                  <h3 className="text-sm font-extrabold uppercase tracking-[0.14em] text-prolimal-ink-600 dark:text-prolimal-ink-200">Detalle por día</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px]">
                    <thead>
                      <tr className="border-b border-prolimal-ink-900/5 dark:border-prolimal-sand-100/10">
                        <th className={th}>Fecha</th>
                        <th className={th}>Pedidos</th>
                        <th className={th}>Cancelados</th>
                        <th className={th}>Total vendido</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ventasFecha.map((d) => (
                        <tr key={String(d.fecha)} className="border-b border-prolimal-ink-900/5 last:border-0 dark:border-prolimal-sand-100/5">
                          <td className={td}>{new Date(String(d.fecha).slice(0, 10)).toLocaleDateString()}</td>
                          <td className={td}>{d.total_pedidos}</td>
                          <td className={td}>{d.cancelados}</td>
                          <td className={`${td} font-extrabold text-prolimal-teal-700 dark:text-prolimal-teal-300`}>{formatCurrency(Number(d.total_vendido))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {seccion === 'ganancias' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {[
                  { label: 'Ingresos', value: formatCurrency(Number(ganancias?.ingresos || 0)), tono: 'text-prolimal-ink-900 dark:text-prolimal-sand-50' },
                  { label: 'Costo', value: formatCurrency(Number(ganancias?.costo || 0)), tono: 'text-prolimal-ink-900 dark:text-prolimal-sand-50' },
                  { label: 'Ganancia', value: formatCurrency(Number(ganancias?.ganancia || 0)), tono: 'text-prolimal-teal-700 dark:text-prolimal-teal-300' },
                ].map(({ label, value, tono }) => (
                  <div key={label} className="rounded-[2rem] border border-prolimal-ink-900/10 bg-card p-5 shadow-[0_24px_60px_-46px_rgba(11,37,32,0.45)] dark:border-prolimal-sand-100/10 dark:bg-card-dark">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-prolimal-ink-400 dark:text-prolimal-ink-300">{label}</p>
                    <p className={`mt-1 text-2xl font-extrabold tracking-[-0.04em] ${tono}`}>{value}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-[2rem] border border-prolimal-ink-900/10 bg-card p-6 shadow-[0_24px_60px_-46px_rgba(11,37,32,0.45)] dark:border-prolimal-sand-100/10 dark:bg-card-dark">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-sm font-extrabold uppercase tracking-[0.14em] text-prolimal-ink-600 dark:text-prolimal-ink-200">
                    Resumen de ganancias ·{' '}
                    <span className="font-semibold normal-case tracking-normal text-prolimal-ink-400 dark:text-prolimal-ink-300">
                      {desde || 'inicio'} al {hasta || 'hoy'}
                    </span>
                  </h3>
                  <button
                    onClick={() => exportar('ganancias', 'ganancias', true)}
                    disabled={descargando}
                    className="rounded-full bg-prolimal-teal-700 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-prolimal-ink-900 disabled:opacity-50 dark:bg-prolimal-teal-400 dark:text-prolimal-ink-900 dark:hover:bg-prolimal-teal-300"
                  >
                    PDF
                  </button>
                </div>
                {!ganancias || (Number(ganancias.ingresos) === 0 && Number(ganancias.ganancia) === 0) ? (
                  <p className="py-10 text-center text-sm font-medium text-prolimal-ink-400 dark:text-prolimal-ink-300">Sin ventas en el período.</p>
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    {[
                      ['Ingresos', Number(ganancias.ingresos)],
                      ['Costo', Number(ganancias.costo)],
                      ['Ganancia', Number(ganancias.ganancia)],
                    ].map(([label, valor]) => (
                      <div key={label as string} className="rounded-2xl bg-prolimal-sand-100/70 p-4 dark:bg-prolimal-ink-800/60">
                        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-prolimal-ink-400 dark:text-prolimal-ink-300">{label as string}</p>
                        <p className="mt-1 text-xl font-extrabold text-prolimal-ink-900 dark:text-prolimal-sand-50">{formatCurrency(valor as number)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {seccion === 'producto' && (
            <div className="overflow-hidden rounded-[2rem] border border-prolimal-ink-900/10 bg-card shadow-[0_24px_60px_-46px_rgba(11,37,32,0.45)] dark:border-prolimal-sand-100/10 dark:bg-card-dark">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-prolimal-ink-900/5 px-6 py-4 dark:border-prolimal-sand-100/10">
                <h3 className="text-sm font-extrabold uppercase tracking-[0.14em] text-prolimal-ink-600 dark:text-prolimal-ink-200">Ventas por producto</h3>
                <button
                  onClick={() => exportar('ventas-por-producto', 'ventas-por-producto')}
                  disabled={descargando}
                  className="rounded-full border border-prolimal-ink-900/10 bg-prolimal-sand-100 px-4 py-2 text-xs font-bold text-prolimal-ink-600 transition-colors hover:bg-prolimal-sand-200 disabled:opacity-50 dark:border-prolimal-sand-100/10 dark:bg-prolimal-ink-800 dark:text-prolimal-sand-100 dark:hover:bg-prolimal-ink-700"
                >
                  CSV
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px]">
                  <thead>
                    <tr className="border-b border-prolimal-ink-900/5 dark:border-prolimal-sand-100/10">
                      <th className={th}>Producto</th>
                      <th className={th}>Categoría</th>
                      <th className={th}>Precio</th>
                      <th className={th}>Unidades</th>
                      <th className={th}>Ingresos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtrados.productos.map((p) => (
                      <tr key={p.id} className="border-b border-prolimal-ink-900/5 last:border-0 dark:border-prolimal-sand-100/5">
                        <td className={`${td} font-bold text-prolimal-ink-800 dark:text-prolimal-sand-50`}>{p.nombre}</td>
                        <td className={td}>{p.categoria || '—'}</td>
                        <td className={td}>{formatCurrency(Number(p.precio))}</td>
                        <td className={td}>{p.unidades_vendidas}</td>
                        <td className={`${td} font-extrabold text-prolimal-teal-700 dark:text-prolimal-teal-300`}>{formatCurrency(Number(p.total_ingresos))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {seccion === 'categoria' && (
            <div className="overflow-hidden rounded-[2rem] border border-prolimal-ink-900/10 bg-card shadow-[0_24px_60px_-46px_rgba(11,37,32,0.45)] dark:border-prolimal-sand-100/10 dark:bg-card-dark">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-prolimal-ink-900/5 px-6 py-4 dark:border-prolimal-sand-100/10">
                <h3 className="text-sm font-extrabold uppercase tracking-[0.14em] text-prolimal-ink-600 dark:text-prolimal-ink-200">Ventas por categoría</h3>
                <button
                  onClick={() => exportar('ventas-por-categoria', 'ventas-por-categoria')}
                  disabled={descargando}
                  className="rounded-full border border-prolimal-ink-900/10 bg-prolimal-sand-100 px-4 py-2 text-xs font-bold text-prolimal-ink-600 transition-colors hover:bg-prolimal-sand-200 disabled:opacity-50 dark:border-prolimal-sand-100/10 dark:bg-prolimal-ink-800 dark:text-prolimal-sand-100 dark:hover:bg-prolimal-ink-700"
                >
                  CSV
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px]">
                  <thead>
                    <tr className="border-b border-prolimal-ink-900/5 dark:border-prolimal-sand-100/10">
                      <th className={th}>Categoría</th>
                      <th className={th}>Unidades</th>
                      <th className={th}>Ingresos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtrados.categorias.map((c) => (
                      <tr key={c.id} className="border-b border-prolimal-ink-900/5 last:border-0 dark:border-prolimal-sand-100/5">
                        <td className={`${td} font-bold text-prolimal-ink-800 dark:text-prolimal-sand-50`}>{c.nombre}</td>
                        <td className={td}>{c.unidades_vendidas}</td>
                        <td className={`${td} font-extrabold text-prolimal-teal-700 dark:text-prolimal-teal-300`}>{formatCurrency(Number(c.total_ingresos))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {seccion === 'inventario' && (
            <div className="overflow-hidden rounded-[2rem] border border-prolimal-ink-900/10 bg-card shadow-[0_24px_60px_-46px_rgba(11,37,32,0.45)] dark:border-prolimal-sand-100/10 dark:bg-card-dark">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-prolimal-ink-900/5 px-6 py-4 dark:border-prolimal-sand-100/10">
                <h3 className="text-sm font-extrabold uppercase tracking-[0.14em] text-prolimal-ink-600 dark:text-prolimal-ink-200">Inventario actual</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => exportar('inventario', 'inventario')}
                    disabled={descargando}
                    className="rounded-full border border-prolimal-ink-900/10 bg-prolimal-sand-100 px-4 py-2 text-xs font-bold text-prolimal-ink-600 transition-colors hover:bg-prolimal-sand-200 disabled:opacity-50 dark:border-prolimal-sand-100/10 dark:bg-prolimal-ink-800 dark:text-prolimal-sand-100 dark:hover:bg-prolimal-ink-700"
                  >
                    CSV
                  </button>
                  <button
                    onClick={() => exportar('inventario', 'inventario', true)}
                    disabled={descargando}
                    className="rounded-full bg-prolimal-teal-700 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-prolimal-ink-900 disabled:opacity-50 dark:bg-prolimal-teal-400 dark:text-prolimal-ink-900 dark:hover:bg-prolimal-teal-300"
                  >
                    PDF
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px]">
                  <thead>
                    <tr className="border-b border-prolimal-ink-900/5 dark:border-prolimal-sand-100/10">
                      <th className={th}>Producto</th>
                      <th className={th}>Categoría</th>
                      <th className={th}>Stock</th>
                      <th className={th}>Mínimo</th>
                      <th className={th}>Costo</th>
                      <th className={th}>Precio venta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtrados.inventario.map((i) => (
                      <tr key={i.id} className="border-b border-prolimal-ink-900/5 last:border-0 dark:border-prolimal-sand-100/5">
                        <td className={`${td} font-bold text-prolimal-ink-800 dark:text-prolimal-sand-50`}>{i.nombre}</td>
                        <td className={td}>{i.categoria || '—'}</td>
                        <td className={td}>
                          <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold tracking-[0.05em] ${
                            i.cantidad <= i.cantidad_minima
                              ? 'bg-prolimal-coral-100 text-prolimal-coral-700 dark:bg-prolimal-coral-900/25 dark:text-prolimal-coral-300'
                              : 'bg-prolimal-teal-100 text-prolimal-teal-700 dark:bg-prolimal-teal-900/30 dark:text-prolimal-teal-300'
                          }`}>
                            {i.cantidad}
                          </span>
                        </td>
                        <td className={td}>{i.cantidad_minima}</td>
                        <td className={td}>{formatCurrency(Number(i.precio_costo || 0))}</td>
                        <td className={`${td} font-extrabold text-prolimal-ink-900 dark:text-prolimal-sand-50`}>{formatCurrency(Number(i.precio))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {seccion === 'clientes' && (
            <div className="overflow-hidden rounded-[2rem] border border-prolimal-ink-900/10 bg-card shadow-[0_24px_60px_-46px_rgba(11,37,32,0.45)] dark:border-prolimal-sand-100/10 dark:bg-card-dark">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-prolimal-ink-900/5 px-6 py-4 dark:border-prolimal-sand-100/10">
                <h3 className="text-sm font-extrabold uppercase tracking-[0.14em] text-prolimal-ink-600 dark:text-prolimal-ink-200">Clientes frecuentes</h3>
                <button
                  onClick={() => exportar('clientes', 'clientes')}
                  disabled={descargando}
                  className="rounded-full border border-prolimal-ink-900/10 bg-prolimal-sand-100 px-4 py-2 text-xs font-bold text-prolimal-ink-600 transition-colors hover:bg-prolimal-sand-200 disabled:opacity-50 dark:border-prolimal-sand-100/10 dark:bg-prolimal-ink-800 dark:text-prolimal-sand-100 dark:hover:bg-prolimal-ink-700"
                >
                  CSV
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px]">
                  <thead>
                    <tr className="border-b border-prolimal-ink-900/5 dark:border-prolimal-sand-100/10">
                      <th className={th}>Cliente</th>
                      <th className={th}>Compras</th>
                      <th className={th}>Total gastado</th>
                      <th className={th}>Última compra</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtrados.clientes.map((c) => (
                      <tr key={c.id} className="border-b border-prolimal-ink-900/5 last:border-0 dark:border-prolimal-sand-100/5">
                        <td className={td}>
                          <p className="font-bold text-prolimal-ink-800 dark:text-prolimal-sand-50">{c.nombre}</p>
                          <p className="text-xs font-medium text-prolimal-ink-400 dark:text-prolimal-ink-300">{c.email}</p>
                        </td>
                        <td className={td}>{c.total_compras}</td>
                        <td className={`${td} font-extrabold text-prolimal-teal-700 dark:text-prolimal-teal-300`}>{formatCurrency(Number(c.total_gastado))}</td>
                        <td className={td}>
                          {c.ultima_compra ? new Date(c.ultima_compra).toLocaleDateString() : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
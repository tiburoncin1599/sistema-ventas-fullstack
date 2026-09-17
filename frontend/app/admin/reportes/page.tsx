'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api, apiFetchBlob } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import GraficoBarras from '@/components/charts/GraficoBarras';
import { aFechaISO, rangoMes } from '@/components/charts/chart-utils';

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

const th = 'text-left px-4 py-2 font-semibold text-xs dark:text-white';
const td = 'px-4 py-3 text-sm';

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
    <main className="max-w-6xl mx-auto px-4 sm:px-8 py-12">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <Link href="/admin" className="text-sm text-green-700 dark:text-green-400 hover:underline">
            ← Panel admin
          </Link>
          <h1 className="text-3xl font-bold mt-1 dark:text-white">Reportes</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Ventas, ganancias, inventario y clientes
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl p-5 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            Desde
            <input
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              className="border dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-sm"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            Hasta
            <input
              type="date"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              className="border dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-sm"
            />
          </label>
          <div className="flex gap-2">
            {Object.entries(presets).map(([etiqueta, [desdeD, hastaD]]) => (
              <button
                key={etiqueta}
                onClick={() => aplicarPreset(desdeD, hastaD)}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                {etiqueta}
              </button>
            ))}
            <button
              onClick={() => { setDesde(''); setHasta(''); }}
              className="px-4 py-2 rounded-xl text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              Todo
            </button>
          </div>
          {!desde && !hasta && (
            <span className="text-xs text-gray-400">Sin filtro de fechas (todo el historial)</span>
          )}
        </div>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {SECCIONES.map((s) => (
          <button
            key={s.id}
            onClick={() => setSeccion(s.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              seccion === s.id
                ? 'bg-[#005a24] text-white'
                : 'bg-white dark:bg-gray-800 border dark:border-gray-600 text-gray-600 dark:text-gray-300'
            }`}
          >
            {s.etiqueta}
          </button>
        ))}
      </div>

      {(seccion === 'producto' || seccion === 'categoria' || seccion === 'inventario' || seccion === 'clientes') && (
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar..."
          className="border dark:border-gray-600 rounded-xl px-4 py-2.5 bg-white dark:bg-gray-800 text-sm mb-6 w-full max-w-sm"
        />
      )}

      {cargando ? (
        <p className="text-center py-20 text-gray-500 dark:text-gray-400">Cargando reportes...</p>
      ) : (
        <div>
          {seccion === 'ventas' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl p-5">
                  <p className="text-xs uppercase tracking-wide text-gray-400 font-semibold">Total vendido</p>
                  <p className="text-2xl font-bold mt-1 dark:text-white">{formatCurrency(totalesVentas.vendido)}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl p-5">
                  <p className="text-xs uppercase tracking-wide text-gray-400 font-semibold">Pedidos</p>
                  <p className="text-2xl font-bold mt-1 dark:text-white">{totalesVentas.pedidos}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl p-5">
                  <p className="text-xs uppercase tracking-wide text-gray-400 font-semibold">Cancelados</p>
                  <p className="text-2xl font-bold mt-1 dark:text-white">{totalesVentas.cancelados}</p>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl p-6">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <h2 className="font-bold dark:text-white">
                    Ventas por día ·{' '}
                    <span className="text-gray-500 dark:text-gray-400 font-normal">
                      {desde || 'inicio'} al {hasta || 'hoy'}
                    </span>
                  </h2>
                  <div className="flex gap-2">
                    <button
                      onClick={() => exportar('ventas-por-fecha', 'ventas-por-fecha')}
                      disabled={descargando}
                      className="px-4 py-2 rounded-xl text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                    >
                      CSV
                    </button>
                    <button
                      onClick={() => exportar('ventas-por-fecha', 'ventas-por-fecha', true)}
                      disabled={descargando}
                      className="px-4 py-2 rounded-xl text-sm font-medium bg-[#005a24] text-white hover:bg-[#00401a] transition-colors disabled:opacity-50"
                    >
                      PDF
                    </button>
                  </div>
                </div>
                {serieVentas.length > 0 ? (
                  <div className="text-gray-900 dark:text-gray-100">
                    <GraficoBarras datos={serieVentas} />
                  </div>
                ) : (
                  <p className="text-center py-10 text-gray-400">Sin ventas en el período.</p>
                )}
              </div>

              <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl p-6">
                <h2 className="font-bold mb-3 dark:text-white">Detalle por día</h2>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px]">
                    <thead>
                      <tr className="border-t dark:border-gray-700">
                        <th className={th}>Fecha</th>
                        <th className={th}>Pedidos</th>
                        <th className={th}>Cancelados</th>
                        <th className={th}>Total vendido</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ventasFecha.map((d) => (
                        <tr key={String(d.fecha)} className="border-t dark:border-gray-700 dark:text-white">
                          <td className={td}>{new Date(String(d.fecha).slice(0, 10)).toLocaleDateString()}</td>
                          <td className={td}>{d.total_pedidos}</td>
                          <td className={td}>{d.cancelados}</td>
                          <td className={`${td} font-bold text-blue-600 dark:text-blue-400`}>{formatCurrency(Number(d.total_vendido))}</td>
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl p-5">
                  <p className="text-xs uppercase tracking-wide text-gray-400 font-semibold">Ingresos</p>
                  <p className="text-2xl font-bold mt-1 dark:text-white">{formatCurrency(Number(ganancias?.ingresos || 0))}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl p-5">
                  <p className="text-xs uppercase tracking-wide text-gray-400 font-semibold">Costo</p>
                  <p className="text-2xl font-bold mt-1 dark:text-white">{formatCurrency(Number(ganancias?.costo || 0))}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl p-5">
                  <p className="text-xs uppercase tracking-wide text-gray-400 font-semibold">Ganancia</p>
                  <p className="text-2xl font-bold mt-1 text-green-600 dark:text-green-400">{formatCurrency(Number(ganancias?.ganancia || 0))}</p>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl p-6">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <h2 className="font-bold dark:text-white">
                    Resumen de ganancias ·{' '}
                    <span className="text-gray-500 dark:text-gray-400 font-normal">
                      {desde || 'inicio'} al {hasta || 'hoy'}
                    </span>
                  </h2>
                  <button
                    onClick={() => exportar('ganancias', 'ganancias', true)}
                    disabled={descargando}
                    className="px-4 py-2 rounded-xl text-sm font-medium bg-[#005a24] text-white hover:bg-[#00401a] transition-colors disabled:opacity-50"
                  >
                    PDF
                  </button>
                </div>
                {!ganancias || (Number(ganancias.ingresos) === 0 && Number(ganancias.ganancia) === 0) ? (
                  <p className="text-center py-10 text-gray-400">Sin ventas en el período.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                      ['Ingresos', Number(ganancias.ingresos)],
                      ['Costo', Number(ganancias.costo)],
                      ['Ganancia', Number(ganancias.ganancia)],
                    ].map(([label, valor]) => (
                      <div key={label as string} className="border dark:border-gray-700 rounded-xl p-4">
                        <p className="text-xs text-gray-500 dark:text-gray-400">{label as string}</p>
                        <p className="text-xl font-bold mt-1 dark:text-white">{formatCurrency(valor as number)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {seccion === 'producto' && (
            <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <h2 className="font-bold dark:text-white">Ventas por producto</h2>
                <button
                  onClick={() => exportar('ventas-por-producto', 'ventas-por-producto')}
                  disabled={descargando}
                  className="px-4 py-2 rounded-xl text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                >
                  CSV
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px]">
                  <thead>
                    <tr className="border-t dark:border-gray-700">
                      <th className={th}>Producto</th>
                      <th className={th}>Categoría</th>
                      <th className={th}>Precio</th>
                      <th className={th}>Unidades</th>
                      <th className={th}>Ingresos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtrados.productos.map((p) => (
                      <tr key={p.id} className="border-t dark:border-gray-700 dark:text-white">
                        <td className={`${td} font-medium`}>{p.nombre}</td>
                        <td className={td}>{p.categoria || '—'}</td>
                        <td className={td}>{formatCurrency(Number(p.precio))}</td>
                        <td className={td}>{p.unidades_vendidas}</td>
                        <td className={`${td} font-bold text-blue-600 dark:text-blue-400`}>{formatCurrency(Number(p.total_ingresos))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {seccion === 'categoria' && (
            <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <h2 className="font-bold dark:text-white">Ventas por categoría</h2>
                <button
                  onClick={() => exportar('ventas-por-categoria', 'ventas-por-categoria')}
                  disabled={descargando}
                  className="px-4 py-2 rounded-xl text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                >
                  CSV
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px]">
                  <thead>
                    <tr className="border-t dark:border-gray-700">
                      <th className={th}>Categoría</th>
                      <th className={th}>Unidades</th>
                      <th className={th}>Ingresos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtrados.categorias.map((c) => (
                      <tr key={c.id} className="border-t dark:border-gray-700 dark:text-white">
                        <td className={`${td} font-medium`}>{c.nombre}</td>
                        <td className={td}>{c.unidades_vendidas}</td>
                        <td className={`${td} font-bold text-blue-600 dark:text-blue-400`}>{formatCurrency(Number(c.total_ingresos))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {seccion === 'inventario' && (
            <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <h2 className="font-bold dark:text-white">Inventario actual</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => exportar('inventario', 'inventario')}
                    disabled={descargando}
                    className="px-4 py-2 rounded-xl text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                  >
                    CSV
                  </button>
                  <button
                    onClick={() => exportar('inventario', 'inventario', true)}
                    disabled={descargando}
                    className="px-4 py-2 rounded-xl text-sm font-medium bg-[#005a24] text-white hover:bg-[#00401a] transition-colors disabled:opacity-50"
                  >
                    PDF
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px]">
                  <thead>
                    <tr className="border-t dark:border-gray-700">
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
                      <tr key={i.id} className="border-t dark:border-gray-700 dark:text-white">
                        <td className={`${td} font-medium`}>{i.nombre}</td>
                        <td className={td}>{i.categoria || '—'}</td>
                        <td className={td}>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            i.cantidad <= i.cantidad_minima
                              ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
                              : 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                          }`}>
                            {i.cantidad}
                          </span>
                        </td>
                        <td className={td}>{i.cantidad_minima}</td>
                        <td className={td}>{formatCurrency(Number(i.precio_costo || 0))}</td>
                        <td className={td}>{formatCurrency(Number(i.precio))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {seccion === 'clientes' && (
            <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <h2 className="font-bold dark:text-white">Clientes frecuentes</h2>
                <button
                  onClick={() => exportar('clientes', 'clientes')}
                  disabled={descargando}
                  className="px-4 py-2 rounded-xl text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                >
                  CSV
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px]">
                  <thead>
                    <tr className="border-t dark:border-gray-700">
                      <th className={th}>Cliente</th>
                      <th className={th}>Compras</th>
                      <th className={th}>Total gastado</th>
                      <th className={th}>Última compra</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtrados.clientes.map((c) => (
                      <tr key={c.id} className="border-t dark:border-gray-700 dark:text-white">
                        <td className={td}>
                          <p className="font-medium">{c.nombre}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{c.email}</p>
                        </td>
                        <td className={td}>{c.total_compras}</td>
                        <td className={`${td} font-bold text-blue-600 dark:text-blue-400`}>{formatCurrency(Number(c.total_gastado))}</td>
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
    </main>
  );
}
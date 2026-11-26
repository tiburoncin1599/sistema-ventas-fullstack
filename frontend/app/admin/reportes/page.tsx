'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api, apiFetchBlob } from '@/lib/api';
import { esRol, normalizarRol } from '@/lib/roles';
import { formatCurrency } from '@/lib/utils';
import GraficoLineasVentas, {
  type PuntoLinea,
} from '@/components/charts/GraficoLineasVentas';
import GraficoBarrasHorizontales from '@/components/charts/GraficoBarrasHorizontales';
import { aFechaISO, rangoMes } from '@/components/charts/chart-utils';
import ToastNotificacion, {
  type ToastDatos,
} from '@/components/ui/ToastNotificacion';
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  MessageCircle,
} from 'lucide-react';

interface VentaDia {
  fecha: string;
  total_pedidos: number;
  unidades_vendidas: number;
  total_vendido: number;
  ticket_promedio: number;
}

interface Ganancias {
  ingresos: number;
  costo: number;
  utilidad_bruta: number;
  margen_porcentual: number;
  total_pedidos: number;
  ticket_promedio?: number;
  promedio_ticket?: number;
}

interface ProductoRanking {
  producto_id: number;
  nombre: string;
  codigo: string | null;
  unidades_vendidas: number;
  ingresos: number;
  costo: number;
  utilidad: number;
  margen_porcentual: number;
}

interface TopProductos {
  masVendidos: ProductoRanking[];
  masRentables: ProductoRanking[];
}

interface Opcion {
  id: number;
  nombre: string;
}

interface RegistroHistorial {
  id: number;
  tipo: 'STOCK_BAJO' | 'REPORTE_VENTAS' | 'COMPROBANTE';
  destinatario_telefono: string | null;
  mensaje: string;
  estado: 'ENVIADO' | 'GENERADO_LINK' | 'ERROR';
  creado_en: string;
  usuario?: { nombre: string } | null;
}

interface RespuestaHistorial {
  data: RegistroHistorial[];
  total: number;
  page: number;
  limit: number;
}

interface RespuestaWhatsapp {
  modo: 'API' | 'LINK';
  urlWhatsapp: string | null;
  registro: RegistroHistorial;
  error?: string;
}

const POR_PAGINA = 10;

const th = 'px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-prolimal-ink-400 dark:text-prolimal-ink-300';
const td = 'px-4 py-4 text-sm text-prolimal-ink-600 dark:text-prolimal-sand-100';

/** Normaliza respuestas que pueden venir como arreglo o como `{ data: [] }`. */
function comoArreglo<T>(valor: unknown): T[] {
  if (Array.isArray(valor)) return valor as T[];
  if (valor && typeof valor === 'object') {
    const data = (valor as { data?: unknown }).data;
    if (Array.isArray(data)) return data as T[];
  }
  return [];
}

function rolActual(): string {
  if (typeof window === 'undefined') return '';
  try {
    const raw = localStorage.getItem('usuario');
    if (!raw) return '';
    return normalizarRol((JSON.parse(raw) as { rol?: unknown }).rol);
  } catch {
    return '';
  }
}

export default function AdminReportes() {
  const hoy = useMemo(() => new Date(), []);
  const inicioMes = useMemo(() => rangoMes().desde, []);

  const [fechaInicio, setFechaInicio] = useState(aFechaISO(inicioMes));
  const [fechaFin, setFechaFin] = useState(aFechaISO(hoy));
  const [productoId, setProductoId] = useState('');
  const [vendedorId, setVendedorId] = useState('');
  const [rol, setRol] = useState('');

  const [productos, setProductos] = useState<Opcion[]>([]);
  const [vendedores, setVendedores] = useState<Opcion[]>([]);

  const [ventas, setVentas] = useState<VentaDia[]>([]);
  const [ganancias, setGanancias] = useState<Ganancias | null>(null);
  const [top, setTop] = useState<TopProductos>({
    masVendidos: [],
    masRentables: [],
  });

  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagina, setPagina] = useState(1);
  const [copiado, setCopiado] = useState(false);

  const [enviandoWhatsapp, setEnviandoWhatsapp] = useState(false);
  const [toast, setToast] = useState<ToastDatos | null>(null);
  const cerrarToast = useCallback(() => setToast(null), []);

  const [historialAbierto, setHistorialAbierto] = useState(false);
  const [historial, setHistorial] = useState<RespuestaHistorial>({
    data: [],
    total: 0,
    page: 1,
    limit: 5,
  });
  const [historialPagina, setHistorialPagina] = useState(1);

  useEffect(() => {
    setRol(rolActual());
  }, []);

  const esAdmin = esRol(rol, 'admin');

  /**
   * Filtros compartidos por consultas y exportación. Se envían las claves
   * canónicas y, además, los alias legacy `desde`/`hasta` porque el backend
   * de exportación todavía puede leer cualquiera de las dos nomenclaturas.
   */
  const filtros = useMemo<Record<string, string | number>>(() => {
    const params: Record<string, string | number> = {};
    if (fechaInicio) {
      params.fechaInicio = fechaInicio;
      params.desde = fechaInicio;
    }
    if (fechaFin) {
      params.fechaFin = fechaFin;
      params.hasta = fechaFin;
    }
    if (productoId) params.productoId = Number(productoId);
    // Un vendedor no puede enviar vendedorId: el backend fuerza el suyo.
    if (vendedorId && esAdmin) params.vendedorId = Number(vendedorId);
    return params;
  }, [fechaInicio, fechaFin, productoId, vendedorId, esAdmin]);

  useEffect(() => {
    setCargando(true); // eslint-disable-line react-hooks/set-state-in-effect
    setError(null); // eslint-disable-line react-hooks/set-state-in-effect
    setPagina(1);

    Promise.all([
      api.get('/reportes/ventas-por-fecha', { params: filtros }),
      api.get('/reportes/ganancias', { params: filtros }),
      api.get('/reportes/top-productos', { params: filtros }),
    ])
      .then(([rv, rg, rt]) => {
        setVentas(comoArreglo<VentaDia>(rv.data));
        setGanancias((rg.data as Ganancias) ?? null);
        const respuestaTop = rt.data as Partial<TopProductos> | undefined;
        setTop({
          masVendidos: comoArreglo<ProductoRanking>(respuestaTop?.masVendidos),
          masRentables: comoArreglo<ProductoRanking>(respuestaTop?.masRentables),
        });
      })
      .catch((err: unknown) => {
        setVentas([]);
        setGanancias(null);
        setTop({ masVendidos: [], masRentables: [] });
        setError(
          err instanceof Error && err.message
            ? err.message
            : 'No se pudieron cargar los reportes. Verificá la conexión con el servidor.',
        );
      })
      .finally(() => setCargando(false));
  }, [filtros]);

  useEffect(() => {
    api
      .get('/productos', { params: { limit: 100 } })
      .then((r) => setProductos(comoArreglo<Opcion>(r.data)))
      .catch(() => setProductos([]));

    if (esAdmin) {
      api
        .get('/usuarios/vendedores')
        .then((r) => setVendedores(comoArreglo<Opcion>(r.data)))
        .catch(() => setVendedores([]));
    }
  }, [esAdmin]);

  const serieLineas = useMemo<PuntoLinea[]>(
    () =>
      ventas.map((d) => ({
        fecha: String(d.fecha).slice(0, 10),
        etiqueta: String(d.fecha).slice(5, 10),
        valor: Number(d.total_vendido || 0),
        pedidos: Number(d.total_pedidos || 0),
      })),
    [ventas],
  );

  const totales = useMemo(
    () =>
      ventas.reduce(
        (acc, d) => ({
          ingresos: acc.ingresos + Number(d.total_vendido || 0),
          pedidos: acc.pedidos + Number(d.total_pedidos || 0),
          unidades: acc.unidades + Number(d.unidades_vendidas || 0),
        }),
        { ingresos: 0, pedidos: 0, unidades: 0 },
      ),
    [ventas],
  );

  // El backend calcula el ticket sobre `pedidos.total` (una fila por pedido).
  const ticketPromedio =
    ganancias?.ticket_promedio ??
    ganancias?.promedio_ticket ??
    (totales.pedidos ? totales.ingresos / totales.pedidos : 0);

  const paginas = Math.max(1, Math.ceil(ventas.length / POR_PAGINA));
  const filaInicio = (pagina - 1) * POR_PAGINA;
  const filasPagina = ventas.slice(filaInicio, filaInicio + POR_PAGINA);

  const rangoTexto = `${fechaInicio || 'inicio'} al ${fechaFin || 'hoy'}`;

  const resumenTexto = useMemo(() => {
    const lineas = [
      '📊 *RESUMEN EJECUTIVO — PROLIMAC SRL*',
      `Período: ${rangoTexto}`,
      `Ingresos totales: ${formatCurrency(totales.ingresos)}`,
      `Utilidad bruta estimada: ${formatCurrency(ganancias?.utilidad_bruta || 0)}`,
      `Margen: ${Number(ganancias?.margen_porcentual || 0).toFixed(2)}%`,
      `Pedidos: ${totales.pedidos}`,
      `Ticket promedio: ${formatCurrency(ticketPromedio)}`,
      '',
      'Top productos más vendidos:',
      ...(top.masVendidos.length
        ? top.masVendidos
            .slice(0, 5)
            .map(
              (p, i) =>
                `${i + 1}. ${p.nombre} — ${p.unidades_vendidas} uds. (${formatCurrency(p.ingresos)})`,
            )
        : ['Sin datos en el período.']),
    ];
    return lineas.join('\n');
  }, [rangoTexto, totales, ganancias, ticketPromedio, top.masVendidos]);

  const copiarResumen = async () => {
    try {
      await navigator.clipboard.writeText(resumenTexto);
    } catch {
      const area = document.createElement('textarea');
      area.value = resumenTexto;
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      document.body.removeChild(area);
    }
    setCopiado(true);
    window.setTimeout(() => setCopiado(false), 2200);
  };

  const exportar = (tipo: string, nombre: string, conPDF = false) => {
    const params = new URLSearchParams({ tipo });
    Object.entries(filtros).forEach(([clave, valor]) => {
      params.set(clave, String(valor));
    });
    const url = `/reportes/exportar/${conPDF ? 'pdf' : 'csv'}?${params.toString()}`;
    setError(null);
    apiFetchBlob(url)
      .then((blob) => {
        const enlace = document.createElement('a');
        enlace.href = URL.createObjectURL(blob);
        enlace.download = `${nombre}.${conPDF ? 'pdf' : 'csv'}`;
        document.body.appendChild(enlace);
        enlace.click();
        document.body.removeChild(enlace);
        URL.revokeObjectURL(enlace.href);
      })
      .catch((err: unknown) => {
        setError(
          err instanceof Error && err.message
            ? err.message
            : 'No se pudo descargar el archivo.',
        );
      });
  };

  const cargarHistorial = useCallback((paginaHistorial: number) => {
    api
      .get<RespuestaHistorial>('/notificaciones/historial', {
        params: { page: paginaHistorial, limit: 5 },
      })
      .then((r) => setHistorial(r.data))
      .catch(() =>
        setHistorial({ data: [], total: 0, page: 1, limit: 5 }),
      );
  }, []);

  useEffect(() => {
    if (historialAbierto) cargarHistorial(historialPagina);
  }, [historialAbierto, historialPagina, cargarHistorial]);

  const enviarReporteWhatsapp = async () => {
    // Abrimos la pestaña dentro del click: tras un `await` los navegadores
    // bloquean window.open por perder la activación del usuario.
    const ventana = window.open('', '_blank');
    if (ventana) ventana.opener = null;

    setEnviandoWhatsapp(true);
    try {
      const { data } = await api.post<RespuestaWhatsapp>(
        '/notificaciones/whatsapp/reporte',
        {
          fechaInicio: fechaInicio || undefined,
          fechaFin: fechaFin || undefined,
        },
      );

      if (data.urlWhatsapp) {
        if (ventana) ventana.location.href = data.urlWhatsapp;
        else window.open(data.urlWhatsapp, '_blank', 'noopener,noreferrer');
      } else {
        ventana?.close();
      }

      const fallo = data.registro?.estado === 'ERROR';
      setToast({
        id: Date.now(),
        tipo: fallo ? 'error' : 'exito',
        mensaje: fallo
          ? data.error || 'No se pudo enviar el reporte por WhatsApp.'
          : data.modo === 'LINK'
            ? 'Enlace de WhatsApp abierto. El envío quedó registrado.'
            : 'Reporte enviado por WhatsApp.',
      });
      setHistorialPagina(1);
      cargarHistorial(1);
    } catch {
      ventana?.close();
      setToast({
        id: Date.now(),
        tipo: 'error',
        mensaje: 'No se pudo generar el reporte para WhatsApp.',
      });
    } finally {
      setEnviandoWhatsapp(false);
    }
  };

  const kpis = [
    {
      etiqueta: 'Ingresos totales',
      valor: formatCurrency(ganancias?.ingresos ?? totales.ingresos),
      detalle: `${totales.unidades} unidades vendidas`,
    },
    {
      etiqueta: 'Utilidad bruta estimada',
      valor: formatCurrency(ganancias?.utilidad_bruta || 0),
      detalle: `Margen ${Number(ganancias?.margen_porcentual || 0).toFixed(2)}%`,
    },
    {
      etiqueta: 'Total de pedidos',
      valor: String(totales.pedidos),
      detalle: `${ventas.length} días con ventas`,
    },
    {
      etiqueta: 'Ticket promedio',
      valor: formatCurrency(ticketPromedio),
      detalle: 'Por pedido concretado (no cancelado)',
    },
  ];

  return (
    <div className="pb-10">
      <section className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link
            href="/admin"
            className="text-xs font-bold uppercase tracking-[0.14em] text-prolimal-teal-700 hover:underline dark:text-prolimal-teal-300"
          >
            ← Panel admin
          </Link>
          <h2 className="prolimal-display mt-2 text-3xl tracking-[-0.04em] text-prolimal-ink-900 dark:text-prolimal-sand-50">
            Reportes ejecutivos
          </h2>
          <p className="mt-2 max-w-xl text-sm font-medium leading-relaxed text-prolimal-ink-500 dark:text-prolimal-ink-200">
            Ventas, rentabilidad y ranking de productos en el período seleccionado.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={copiarResumen}
            className="inline-flex items-center gap-2 rounded-full border border-prolimal-ink-900/10 bg-card px-5 py-3 text-xs font-bold text-prolimal-ink-600 transition-colors hover:bg-prolimal-sand-100 dark:border-prolimal-sand-100/10 dark:bg-card-dark dark:text-prolimal-sand-100"
          >
            {copiado ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copiado ? 'Resumen copiado' : 'Copiar resumen'}
          </button>
          <button
            onClick={enviarReporteWhatsapp}
            disabled={enviandoWhatsapp}
            className="inline-flex items-center gap-2 rounded-full bg-prolimal-teal-700 px-5 py-3 text-xs font-bold text-white transition-colors hover:bg-prolimal-ink-900 disabled:opacity-60 dark:bg-prolimal-teal-400 dark:text-prolimal-ink-900"
          >
            <MessageCircle className="h-4 w-4" />
            {enviandoWhatsapp ? 'Enviando...' : 'Enviar reporte por WhatsApp'}
          </button>
        </div>
      </section>

      {/* Barra de filtros */}
      <div className="mb-6 rounded-[2rem] border border-prolimal-ink-900/10 bg-card p-5 shadow-[0_24px_60px_-46px_rgba(11,37,32,0.45)] dark:border-prolimal-sand-100/10 dark:bg-card-dark">
        <div className="flex flex-wrap items-end gap-4">
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.16em] text-prolimal-ink-400 dark:text-prolimal-ink-300">
              Fecha inicio
            </span>
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              className="prolimal-input"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.16em] text-prolimal-ink-400 dark:text-prolimal-ink-300">
              Fecha fin
            </span>
            <input
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              className="prolimal-input"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.16em] text-prolimal-ink-400 dark:text-prolimal-ink-300">
              Producto
            </span>
            <select
              value={productoId}
              onChange={(e) => setProductoId(e.target.value)}
              className="prolimal-input"
            >
              <option value="">Todos los productos</option>
              {productos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </label>
          {esAdmin && (
            <label className="block">
              <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.16em] text-prolimal-ink-400 dark:text-prolimal-ink-300">
                Vendedor
              </span>
              <select
                value={vendedorId}
                onChange={(e) => setVendedorId(e.target.value)}
                className="prolimal-input"
              >
                <option value="">Todos los vendedores</option>
                {vendedores.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.nombre}
                  </option>
                ))}
              </select>
            </label>
          )}
          <button
            onClick={() => {
              setFechaInicio(aFechaISO(rangoMes().desde));
              setFechaFin(aFechaISO(new Date()));
              setProductoId('');
              setVendedorId('');
            }}
            className="prolimal-btn-ghost px-4 py-2.5 text-xs"
          >
            Limpiar filtros
          </button>
        </div>
        <p className="mt-3 text-xs font-medium text-prolimal-ink-400 dark:text-prolimal-ink-300">
          Período activo: {rangoTexto}
          {esRol(rol, 'ventas') && ' · Solo tus propias ventas'}
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-6 rounded-2xl border border-prolimal-red-300/60 bg-prolimal-red-50 px-5 py-4 dark:border-prolimal-red-700/40 dark:bg-prolimal-red-900/20"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-prolimal-red-600 dark:text-prolimal-red-300" />
            <div>
              <p className="text-sm font-extrabold text-prolimal-red-800 dark:text-prolimal-red-100">
                No se pudo completar la operación
              </p>
              <p className="mt-1 text-sm font-medium text-prolimal-red-700/80 dark:text-prolimal-red-200/80">
                {error}
              </p>
            </div>
          </div>
        </div>
      )}

      {cargando ? (
        <div className="prolimal-surface px-6 py-20 text-center text-sm font-medium text-prolimal-ink-400 dark:text-prolimal-ink-300">
          Cargando reportes...
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {kpis.map((kpi) => (
              <div
                key={kpi.etiqueta}
                className="rounded-[2rem] border border-prolimal-ink-900/10 bg-card p-5 shadow-[0_24px_60px_-46px_rgba(11,37,32,0.45)] dark:border-prolimal-sand-100/10 dark:bg-card-dark"
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-prolimal-ink-400 dark:text-prolimal-ink-300">
                  {kpi.etiqueta}
                </p>
                <p className="mt-1 text-2xl font-extrabold tracking-[-0.04em] text-prolimal-ink-900 dark:text-prolimal-sand-50">
                  {kpi.valor}
                </p>
                <p className="mt-1 text-xs font-medium text-prolimal-ink-400 dark:text-prolimal-ink-300">
                  {kpi.detalle}
                </p>
              </div>
            ))}
          </div>

          {/* Gráficas */}
          <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
            <div className="rounded-[2rem] border border-prolimal-ink-900/10 bg-card p-6 shadow-[0_24px_60px_-46px_rgba(11,37,32,0.45)] dark:border-prolimal-sand-100/10 dark:bg-card-dark">
              <h3 className="mb-4 text-sm font-extrabold uppercase tracking-[0.14em] text-prolimal-ink-600 dark:text-prolimal-ink-200">
                Evolución de ventas · {rangoTexto}
              </h3>
              <div className="text-prolimal-ink-900 dark:text-prolimal-sand-50">
                {serieLineas.length ? (
                  <GraficoLineasVentas datos={serieLineas} />
                ) : (
                  <p className="py-10 text-center text-sm font-medium text-prolimal-ink-400 dark:text-prolimal-ink-300">
                    Sin ventas en el período.
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-[2rem] border border-prolimal-ink-900/10 bg-card p-6 shadow-[0_24px_60px_-46px_rgba(11,37,32,0.45)] dark:border-prolimal-sand-100/10 dark:bg-card-dark">
              <h3 className="mb-4 text-sm font-extrabold uppercase tracking-[0.14em] text-prolimal-ink-600 dark:text-prolimal-ink-200">
                Top productos más vendidos
              </h3>
              <div className="text-prolimal-ink-900 dark:text-prolimal-sand-50">
                <GraficoBarrasHorizontales
                  datos={top.masVendidos.map((p) => ({
                    etiqueta: p.nombre,
                    valor: p.ingresos,
                    detalle: `${p.unidades_vendidas} unidades`,
                  }))}
                />
              </div>
              {top.masRentables.length > 0 && (
                <div className="mt-5 border-t border-prolimal-ink-900/5 pt-4 dark:border-prolimal-sand-100/10">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-prolimal-ink-400 dark:text-prolimal-ink-300">
                    Más rentables (utilidad)
                  </p>
                  <div className="space-y-1.5">
                    {top.masRentables.slice(0, 4).map((p) => (
                      <div
                        key={p.producto_id}
                        className="flex items-center justify-between gap-3 text-xs"
                      >
                        <span className="truncate font-semibold text-prolimal-ink-700 dark:text-prolimal-sand-100">
                          {p.nombre}
                        </span>
                        <span className="shrink-0 font-extrabold text-prolimal-teal-700 dark:text-prolimal-teal-300">
                          {formatCurrency(p.utilidad)} · {p.margen_porcentual.toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Tabla de detalle */}
          <div className="overflow-hidden rounded-[2rem] border border-prolimal-ink-900/10 bg-card shadow-[0_24px_60px_-46px_rgba(11,37,32,0.45)] dark:border-prolimal-sand-100/10 dark:bg-card-dark">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-prolimal-ink-900/5 px-6 py-4 dark:border-prolimal-sand-100/10">
              <h3 className="text-sm font-extrabold uppercase tracking-[0.14em] text-prolimal-ink-600 dark:text-prolimal-ink-200">
                Detalle de ventas filtradas
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => exportar('ventas-por-fecha', 'ventas-por-fecha')}
                  className="inline-flex items-center gap-1.5 rounded-full border border-prolimal-ink-900/10 bg-prolimal-sand-100 px-4 py-2 text-xs font-bold text-prolimal-ink-600 hover:bg-prolimal-sand-200 dark:border-prolimal-sand-100/10 dark:bg-prolimal-ink-800 dark:text-prolimal-sand-100"
                >
                  <Download className="h-3.5 w-3.5" /> CSV
                </button>
                <button
                  onClick={() => exportar('ventas-por-fecha', 'ventas-por-fecha', true)}
                  className="rounded-full bg-prolimal-teal-700 px-4 py-2 text-xs font-bold text-white hover:bg-prolimal-ink-900 dark:bg-prolimal-teal-400 dark:text-prolimal-ink-900"
                >
                  PDF
                </button>
              </div>
            </div>

            <p className="mb-2 text-[11px] font-medium text-prolimal-ink-400 md:hidden dark:text-prolimal-ink-300">
              Deslizá para ver más columnas →
            </p>
            <div className="scrollbar-hide overflow-x-auto">
              <table className="w-full min-w-[620px] lg:min-w-[700px]">
                <thead>
                  <tr className="border-b border-prolimal-ink-900/5 dark:border-prolimal-sand-100/10">
                    <th className={th}>Fecha</th>
                    <th className={th}>Pedidos</th>
                    <th className={th}>Unidades</th>
                    <th className={th}>Total vendido</th>
                    <th className={th}>Ticket promedio</th>
                  </tr>
                </thead>
                <tbody>
                  {filasPagina.map((d) => (
                    <tr
                      key={String(d.fecha)}
                      className="border-b border-prolimal-ink-900/5 last:border-0 dark:border-prolimal-sand-100/5"
                    >
                      <td className={td}>
                        {new Date(String(d.fecha).slice(0, 10)).toLocaleDateString()}
                      </td>
                      <td className={td}>{Number(d.total_pedidos)}</td>
                      <td className={td}>{Number(d.unidades_vendidas)}</td>
                      <td className={`${td} font-extrabold text-prolimal-teal-700 dark:text-prolimal-teal-300`}>
                        {formatCurrency(Number(d.total_vendido))}
                      </td>
                      <td className={td}>{formatCurrency(Number(d.ticket_promedio))}</td>
                    </tr>
                  ))}
                  {filasPagina.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-sm text-prolimal-ink-400 dark:text-prolimal-ink-300">
                        Sin datos para los filtros seleccionados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between border-t border-prolimal-ink-900/5 px-6 py-4 dark:border-prolimal-sand-100/10">
              <p className="text-xs font-medium text-prolimal-ink-400 dark:text-prolimal-ink-300">
                Página {pagina} de {paginas}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPagina((p) => Math.max(1, p - 1))}
                  disabled={pagina <= 1}
                  className="rounded-full border border-prolimal-ink-900/10 p-2 text-prolimal-ink-600 disabled:opacity-40 dark:border-prolimal-sand-100/10 dark:text-prolimal-sand-100"
                  aria-label="Página anterior"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setPagina((p) => Math.min(paginas, p + 1))}
                  disabled={pagina >= paginas}
                  className="rounded-full border border-prolimal-ink-900/10 p-2 text-prolimal-ink-600 disabled:opacity-40 dark:border-prolimal-sand-100/10 dark:text-prolimal-sand-100"
                  aria-label="Página siguiente"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Historial de notificaciones de WhatsApp */}
          <div className="mt-6 overflow-hidden rounded-[2rem] border border-prolimal-ink-900/10 bg-card shadow-[0_24px_60px_-46px_rgba(11,37,32,0.45)] dark:border-prolimal-sand-100/10 dark:bg-card-dark">
            <button
              onClick={() => setHistorialAbierto((abierto) => !abierto)}
              className="flex w-full items-center justify-between gap-3 px-6 py-4 text-left"
              aria-expanded={historialAbierto}
            >
              <span className="flex flex-wrap items-center gap-2 text-sm font-extrabold uppercase tracking-[0.14em] text-prolimal-ink-600 dark:text-prolimal-ink-200">
                <MessageCircle className="h-4 w-4" />
                Historial de notificaciones
                <span className="rounded-full bg-prolimal-teal-100 px-2.5 py-0.5 text-[10px] font-bold text-prolimal-teal-800 dark:bg-prolimal-teal-900/30 dark:text-prolimal-teal-200">
                  {historial.total}
                </span>
              </span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-prolimal-ink-400 transition-transform dark:text-prolimal-ink-300 ${historialAbierto ? 'rotate-180' : ''}`}
              />
            </button>

            {historialAbierto && (
              <div className="border-t border-prolimal-ink-900/5 dark:border-prolimal-sand-100/10">
                <p className="mb-2 text-[11px] font-medium text-prolimal-ink-400 md:hidden dark:text-prolimal-ink-300">
                  Deslizá para ver más columnas →
                </p>
                <div className="scrollbar-hide overflow-x-auto">
                  <table className="w-full min-w-[680px] lg:min-w-[760px]">
                    <thead>
                      <tr className="border-b border-prolimal-ink-900/5 dark:border-prolimal-sand-100/10">
                        <th className={th}>Fecha</th>
                        <th className={th}>Tipo</th>
                        <th className={th}>Destinatario</th>
                        <th className={th}>Estado</th>
                        <th className={th}>Vista previa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historial.data.map((n) => (
                        <tr
                          key={n.id}
                          className="border-b border-prolimal-ink-900/5 align-top last:border-0 dark:border-prolimal-sand-100/5"
                        >
                          <td className={td}>
                            {new Date(n.creado_en).toLocaleString()}
                          </td>
                          <td className={td}>{n.tipo.replace('_', ' ')}</td>
                          <td className={td}>
                            {n.destinatario_telefono || 'Sin número fijo'}
                          </td>
                          <td className={td}>
                            <span
                              className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] ${
                                n.estado === 'ERROR'
                                  ? 'bg-prolimal-red-100 text-prolimal-red-700 dark:bg-prolimal-red-900/30 dark:text-prolimal-red-300'
                                  : 'bg-prolimal-teal-100 text-prolimal-teal-700 dark:bg-prolimal-teal-900/30 dark:text-prolimal-teal-300'
                              }`}
                            >
                              {n.estado}
                            </span>
                          </td>
                          <td className={`${td} max-w-md`}>
                            <p className="line-clamp-2 whitespace-pre-line text-xs font-medium text-prolimal-ink-500 dark:text-prolimal-ink-200">
                              {n.mensaje}
                            </p>
                          </td>
                        </tr>
                      ))}
                      {historial.data.length === 0 && (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-4 py-10 text-center text-sm text-prolimal-ink-400 dark:text-prolimal-ink-300"
                          >
                            Aún no hay notificaciones registradas.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-between border-t border-prolimal-ink-900/5 px-6 py-4 dark:border-prolimal-sand-100/10">
                  <p className="text-xs font-medium text-prolimal-ink-400 dark:text-prolimal-ink-300">
                    {historial.total} registros · Página {historial.page}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        setHistorialPagina((p) => Math.max(1, p - 1))
                      }
                      disabled={historialPagina <= 1}
                      className="rounded-full border border-prolimal-ink-900/10 p-2 text-prolimal-ink-600 disabled:opacity-40 dark:border-prolimal-sand-100/10 dark:text-prolimal-sand-100"
                      aria-label="Página anterior del historial"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setHistorialPagina((p) => p + 1)}
                      disabled={
                        historialPagina * historial.limit >= historial.total
                      }
                      className="rounded-full border border-prolimal-ink-900/10 p-2 text-prolimal-ink-600 disabled:opacity-40 dark:border-prolimal-sand-100/10 dark:text-prolimal-sand-100"
                      aria-label="Página siguiente del historial"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
            <div className="border-t border-prolimal-ink-900/5 px-6 py-3 dark:border-prolimal-sand-100/10">
              <Link
                href="/admin/notificaciones"
                prefetch={false}
                className="text-xs font-bold text-prolimal-teal-700 transition-colors hover:underline dark:text-prolimal-teal-300"
              >
                Ver centro de notificaciones →
              </Link>
            </div>
          </div>
        </>
      )}

      <ToastNotificacion toast={toast} onClose={cerrarToast} />
    </div>
  );
}

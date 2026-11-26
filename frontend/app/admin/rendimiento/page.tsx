'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import GraficoLineasVentas, {
  type PuntoLinea,
} from '@/components/charts/GraficoLineasVentas';
import { aFechaISO, MESES } from '@/components/charts/chart-utils';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  BarChart3,
  RefreshCw,
  ShoppingBag,
  TrendingUp,
  Users,
  type LucideIcon,
} from 'lucide-react';

type Periodo = 'dia' | 'semana' | 'mes' | 'ano';

interface PuntoVenta {
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
}

interface Vendedor {
  usuario_id: number;
  usuario_nombre: string;
  total_pedidos: number;
  total_vendido: number;
  promedio_ticket: number;
}

interface Tarjeta {
  titulo: string;
  valor: string;
  detalle: string;
  Icono: LucideIcon;
  color: string;
}

const ETIQUETA_PERIODO: Record<Periodo, string> = {
  dia: 'Diario',
  semana: 'Semanal',
  mes: 'Mensual',
  ano: 'Anual',
};

const num = (valor: unknown): number => {
  const n = Number(valor);
  return Number.isFinite(n) ? n : 0;
};

/** Normaliza respuestas que pueden venir como arreglo o como `{ data: [] }`. */
function comoArreglo<T>(valor: unknown): T[] {
  if (Array.isArray(valor)) return valor as T[];
  if (valor && typeof valor === 'object') {
    const data = (valor as { data?: unknown }).data;
    if (Array.isArray(data)) return data as T[];
  }
  return [];
}

function rangoDelPeriodo(
  periodo: Periodo,
  hoy: Date,
): { desde: string; hasta: string; descripcion: string } {
  const desde = new Date(hoy);
  switch (periodo) {
    case 'dia':
      desde.setDate(hoy.getDate() - 6);
      return {
        desde: aFechaISO(desde),
        hasta: aFechaISO(hoy),
        descripcion: 'últimos 7 días',
      };
    case 'semana': {
      const inicioSemana = (hoy.getDay() + 6) % 7;
      desde.setDate(hoy.getDate() - inicioSemana - 7 * 7);
      return {
        desde: aFechaISO(desde),
        hasta: aFechaISO(hoy),
        descripcion: 'últimas 8 semanas',
      };
    }
    case 'mes':
      desde.setDate(1);
      desde.setMonth(hoy.getMonth() - 11);
      return {
        desde: aFechaISO(desde),
        hasta: aFechaISO(hoy),
        descripcion: 'últimos 12 meses',
      };
    case 'ano':
      desde.setMonth(0, 1);
      desde.setFullYear(hoy.getFullYear() - 4);
      return {
        desde: aFechaISO(desde),
        hasta: aFechaISO(hoy),
        descripcion: 'últimos 5 años',
      };
  }
}

function etiquetaDe(fecha: string, periodo: Periodo): string {
  if (periodo === 'ano') return fecha.slice(0, 4);
  if (periodo === 'mes') {
    const mes = MESES[num(fecha.slice(5, 7)) - 1] ?? fecha.slice(5, 7);
    return `${mes} ${fecha.slice(2, 4)}`;
  }
  if (periodo === 'semana') return `Sem ${fecha.slice(5)}`;
  return fecha.slice(5);
}

const th =
  'px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-prolimal-ink-400 dark:text-prolimal-ink-300';
const td =
  'px-4 py-3 text-sm text-prolimal-ink-600 dark:text-prolimal-sand-100';

export default function AdminRendimiento() {
  const hoy = useMemo(() => new Date(), []);
  const [periodo, setPeriodo] = useState<Periodo>('mes');
  const [serie, setSerie] = useState<PuntoVenta[]>([]);
  const [ganancias, setGanancias] = useState<Ganancias | null>(null);
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);

  const rango = useMemo(() => rangoDelPeriodo(periodo, hoy), [periodo, hoy]);

  useEffect(() => {
    const control = new AbortController();
    setCargando(true);
    setError(null);

    const cargar = async () => {
      try {
        const [respuestaSerie, respuestaGanancias, respuestaVendedores] =
          await Promise.all([
            api.get('/reportes/ventas-por-fecha', {
              params: {
                fechaInicio: rango.desde,
                fechaFin: rango.hasta,
                agrupacion: periodo,
              },
              signal: control.signal,
            }),
            api.get('/reportes/ganancias', {
              params: { fechaInicio: rango.desde, fechaFin: rango.hasta },
              signal: control.signal,
            }),
            api.get('/pedidos/ventas/personal', {
              params: { desde: rango.desde, hasta: rango.hasta },
              signal: control.signal,
            }),
          ]);

        if (control.signal.aborted) return;

        setSerie(
          comoArreglo<PuntoVenta>(respuestaSerie.data).map((p) => ({
            fecha: String(p.fecha ?? '').slice(0, 10),
            total_pedidos: num(p.total_pedidos),
            unidades_vendidas: num(p.unidades_vendidas),
            total_vendido: num(p.total_vendido),
            ticket_promedio: num(p.ticket_promedio),
          })),
        );
        setGanancias((respuestaGanancias.data as Ganancias | undefined) ?? null);
        setVendedores(
          comoArreglo<Vendedor>(respuestaVendedores.data).map((v) => ({
            usuario_id: num(v.usuario_id),
            usuario_nombre: String(v.usuario_nombre ?? 'Sin nombre'),
            total_pedidos: num(v.total_pedidos),
            total_vendido: num(v.total_vendido),
            promedio_ticket: num(v.promedio_ticket),
          })),
        );
      } catch {
        if (!control.signal.aborted) {
          setSerie([]);
          setGanancias(null);
          setVendedores([]);
          setError('No se pudieron cargar los datos de rendimiento.');
        }
      } finally {
        if (!control.signal.aborted) setCargando(false);
      }
    };

    void cargar();
    return () => control.abort();
  }, [periodo, rango.desde, rango.hasta, intento]);

  const totales = useMemo(
    () =>
      serie.reduce(
        (acc, punto) => ({
          ingresos: acc.ingresos + punto.total_vendido,
          pedidos: acc.pedidos + punto.total_pedidos,
          unidades: acc.unidades + punto.unidades_vendidas,
        }),
        { ingresos: 0, pedidos: 0, unidades: 0 },
      ),
    [serie],
  );

  const ticketPromedio = totales.pedidos
    ? totales.ingresos / totales.pedidos
    : 0;
  const margen = num(ganancias?.margen_porcentual);

  const tarjetas: Tarjeta[] = [
    {
      titulo: 'Ingresos del período',
      valor: formatCurrency(totales.ingresos),
      detalle: `Ticket promedio ${formatCurrency(ticketPromedio)}`,
      Icono: TrendingUp,
      color: 'border-prolimal-teal-500/25 bg-prolimal-teal-50/60 dark:bg-prolimal-teal-900/15',
    },
    {
      titulo: 'Pedidos registrados',
      valor: String(totales.pedidos),
      detalle: `${totales.unidades} unidades vendidas`,
      Icono: ShoppingBag,
      color: 'border-prolimal-ink-900/10 bg-white/70 dark:bg-prolimal-ink-800/50',
    },
    {
      titulo: 'Utilidad bruta estimada',
      valor: formatCurrency(ganancias?.utilidad_bruta ?? 0),
      detalle: `Margen ${margen.toFixed(2)}%`,
      Icono: BarChart3,
      color: 'border-prolimal-ink-900/10 bg-white/70 dark:bg-prolimal-ink-800/50',
    },
    {
      titulo: 'Vendedores activos',
      valor: String(vendedores.length),
      detalle: `Con ventas en ${rango.descripcion}`,
      Icono: Users,
      color: 'border-prolimal-ink-900/10 bg-white/70 dark:bg-prolimal-ink-800/50',
    },
  ];

  const puntosLinea = useMemo<PuntoLinea[]>(
    () =>
      serie.map((p) => ({
        fecha: p.fecha,
        etiqueta: etiquetaDe(p.fecha, periodo),
        valor: p.total_vendido,
        pedidos: p.total_pedidos,
      })),
    [serie, periodo],
  );

  const tablaVendedores = useMemo(
    () => [...vendedores].sort((a, b) => b.total_vendido - a.total_vendido),
    [vendedores],
  );

  return (
    <main className="prolimal-page mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:py-12">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="prolimal-display text-2xl tracking-[-0.04em] text-prolimal-ink-900 dark:text-prolimal-sand-50">
            Rendimiento
          </h1>
          <p className="text-sm font-medium text-prolimal-ink-500 dark:text-prolimal-ink-200">
            Control de ventas y performance por vendedor · {rango.descripcion} (
            {rango.desde} al {rango.hasta})
          </p>
        </div>
        <div className="w-full sm:w-56">
          <label
            htmlFor="periodo-rendimiento"
            className="mb-1 block text-[10px] font-bold uppercase tracking-[0.16em] text-prolimal-ink-400 dark:text-prolimal-ink-300"
          >
            Período
          </label>
          <select
            id="periodo-rendimiento"
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value as Periodo)}
            className="prolimal-input w-full rounded-2xl border border-prolimal-ink-900/15 bg-white/75 px-4 py-3 text-sm text-prolimal-ink-800 focus:outline-none focus:ring-2 focus:ring-prolimal-teal-500/20 dark:border-prolimal-sand-100/10 dark:bg-prolimal-ink-800 dark:text-prolimal-sand-50"
          >
            {(Object.keys(ETIQUETA_PERIODO) as Periodo[]).map((clave) => (
              <option key={clave} value={clave}>
                {ETIQUETA_PERIODO[clave]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {cargando && (
        <div className="rounded-[2rem] border border-prolimal-ink-900/10 bg-card p-10 text-center text-sm font-medium text-prolimal-ink-500 dark:border-prolimal-sand-100/10 dark:bg-card-dark dark:text-prolimal-ink-200">
          Cargando datos del período…
        </div>
      )}

      {!cargando && error && (
        <div
          role="alert"
          className="flex flex-col items-center gap-3 rounded-[2rem] border border-prolimal-red-500/25 bg-prolimal-red-50 p-8 text-center dark:bg-prolimal-red-900/15"
        >
          <AlertCircle className="h-7 w-7 text-prolimal-red-600 dark:text-prolimal-red-300" />
          <p className="text-sm font-medium text-prolimal-ink-700 dark:text-prolimal-sand-100">
            {error}
          </p>
          <button
            type="button"
            onClick={() => setIntento((n) => n + 1)}
            className="prolimal-btn-primary inline-flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Reintentar
          </button>
        </div>
      )}

      {!cargando && !error && (
        <>
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {tarjetas.map((tarjeta) => {
              const Icono = tarjeta.Icono;
              return (
              <motion.div
                key={tarjeta.titulo}
                whileHover={{ y: -3 }}
                transition={{ duration: 0.2 }}
                className={`rounded-[2rem] border p-6 ${tarjeta.color}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="prolimal-display text-sm font-bold text-prolimal-ink-900 dark:text-prolimal-sand-50">
                    {tarjeta.titulo}
                  </p>
                  <Icono className="h-5 w-5 shrink-0 text-prolimal-teal-600 dark:text-prolimal-teal-300" />
                </div>
                <p className="mt-4 text-2xl font-extrabold tracking-[-0.04em] text-prolimal-ink-900 dark:text-prolimal-sand-50">
                  {tarjeta.valor}
                </p>
                <p className="mt-1 text-[11px] font-medium text-prolimal-ink-500 dark:text-prolimal-ink-300">
                  {tarjeta.detalle}
                </p>
              </motion.div>
              );
            })}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <motion.section
              whileHover={{ y: -4 }}
              transition={{ duration: 0.2 }}
              className="rounded-[2rem] border border-prolimal-ink-900/10 bg-card p-6 shadow-[0_24px_60px_-46px_rgba(11,37,32,0.45)] dark:border-prolimal-sand-100/10 dark:bg-card-dark"
            >
              <p className="prolimal-eyebrow">Ventas por Vendedor</p>
              <h2 className="prolimal-display mt-2 text-xl tracking-[-0.04em] text-prolimal-ink-900 dark:text-prolimal-sand-50">
                Top Performance
              </h2>
              {tablaVendedores.length === 0 ? (
                <p className="mt-6 rounded-2xl bg-prolimal-sand-100/70 p-6 text-center text-sm text-prolimal-ink-500 dark:bg-prolimal-ink-800/60 dark:text-prolimal-ink-300">
                  Sin vendedores con ventas en el período seleccionado.
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  {tablaVendedores.map((vendedor) => (
                    <div
                      key={vendedor.usuario_id}
                      className="flex items-start justify-between gap-3"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <Users className="h-5 w-5 shrink-0 text-prolimal-teal-400" />
                        <span className="truncate text-sm font-medium text-prolimal-ink-800 dark:text-prolimal-sand-50">
                          {vendedor.usuario_nombre}
                        </span>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-xs font-medium text-prolimal-ink-500 dark:text-prolimal-ink-200">
                          Pedidos: {vendedor.total_pedidos}
                        </p>
                        <p className="text-sm font-bold text-prolimal-teal-700 dark:text-prolimal-teal-300">
                          {formatCurrency(vendedor.total_vendido)}
                        </p>
                        <p className="text-[11px] text-prolimal-ink-400 dark:text-prolimal-ink-300">
                          Ticket {formatCurrency(vendedor.promedio_ticket)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.section>

            <motion.section
              whileHover={{ y: -4 }}
              transition={{ duration: 0.2 }}
              className="rounded-[2rem] border border-prolimal-ink-900/10 bg-card p-6 shadow-[0_24px_60px_-46px_rgba(11,37,32,0.45)] dark:border-prolimal-sand-100/10 dark:bg-card-dark"
            >
              <p className="prolimal-eyebrow">Ventas por Período</p>
              <h2 className="prolimal-display mt-2 text-xl tracking-[-0.04em] text-prolimal-ink-900 dark:text-prolimal-sand-50">
                Evolución {ETIQUETA_PERIODO[periodo]}
              </h2>
              <div className="mt-4 min-h-64 text-prolimal-ink-800 dark:text-prolimal-sand-50">
                {puntosLinea.length > 0 ? (
                  <GraficoLineasVentas datos={puntosLinea} />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-2 text-prolimal-ink-400 dark:text-prolimal-ink-300">
                    <BarChart3 className="h-7 w-7" />
                    <span className="text-sm">
                      Sin ventas registradas en {rango.descripcion}.
                    </span>
                  </div>
                )}
              </div>
            </motion.section>
          </div>

          <section className="mt-6 overflow-hidden rounded-[2rem] border border-prolimal-ink-900/10 bg-card dark:border-prolimal-sand-100/10 dark:bg-card-dark">
            <div className="px-6 py-5">
              <p className="prolimal-eyebrow">Desglose del período</p>
              <h2 className="prolimal-display mt-2 text-xl tracking-[-0.04em] text-prolimal-ink-900 dark:text-prolimal-sand-50">
                Detalle de ventas
              </h2>
            </div>
            {serie.length === 0 ? (
              <p className="px-6 pb-6 text-sm text-prolimal-ink-500 dark:text-prolimal-ink-300">
                No hay movimientos para mostrar.
              </p>
            ) : (
              <>
                <p className="mb-2 text-[11px] font-medium text-prolimal-ink-400 md:hidden dark:text-prolimal-ink-300">
                  Deslizá para ver más columnas →
                </p>
                <div className="scrollbar-hide overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead className="bg-prolimal-sand-100/70 dark:bg-prolimal-ink-800/70">
                    <tr>
                      <th className={th}>Período</th>
                      <th className={th}>Pedidos</th>
                      <th className={th}>Unidades</th>
                      <th className={th}>Total vendido</th>
                      <th className={th}>Ticket promedio</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-prolimal-ink-900/5 dark:divide-prolimal-sand-100/10">
                    {[...serie].reverse().map((punto) => (
                      <tr key={punto.fecha}>
                        <td className={td}>{etiquetaDe(punto.fecha, periodo)}</td>
                        <td className={td}>{punto.total_pedidos}</td>
                        <td className={td}>{punto.unidades_vendidas}</td>
                        <td className={td}>{formatCurrency(punto.total_vendido)}</td>
                        <td className={td}>{formatCurrency(punto.ticket_promedio)}</td>
                      </tr>
                    ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        </>
      )}
    </main>
  );
}

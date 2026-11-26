'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { esRol, normalizarRol } from '@/lib/roles';
import { formatCurrency } from '@/lib/utils';
import ToastNotificacion, {
  type ToastDatos,
} from '@/components/ui/ToastNotificacion';
import {
  AlertTriangle,
  BarChart3,
  BellRing,
  Boxes,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Link2,
  MessageCircle,
  Package,
  Receipt,
  RefreshCw,
  Search,
  Send,
  ShoppingBag,
  XCircle,
  type LucideIcon,
} from 'lucide-react';

interface StockBajo {
  id: number;
  producto_id: number;
  nombre: string;
  cantidad: number | string;
  cantidad_minima: number | string;
  faltante: number | string;
  tipo: string;
}

interface PedidoReciente {
  id: number;
  total: number | string;
  estado: string;
  creado_en: string;
  cliente: string | null;
  tipo: string;
}

interface DeudaPendiente {
  id: number;
  monto: number | string;
  monto_pagado: number | string;
  saldo: number | string;
  fecha_creacion: string;
  cliente: string | null;
  tipo: string;
}

interface UltimoIngreso {
  id: number;
  cantidad: number | string;
  motivo: string | null;
  creado_en: string;
  producto: string;
  tipo: string;
}

interface Alertas {
  stockBajo: StockBajo[];
  pedidosRecientes: PedidoReciente[];
  deudasPendientes: DeudaPendiente[];
  ultimosIngresos: UltimoIngreso[];
  total: number;
}

type TipoHistorial = 'STOCK_BAJO' | 'REPORTE_VENTAS' | 'COMPROBANTE';
type EstadoHistorial = 'ENVIADO' | 'GENERADO_LINK' | 'ERROR';

interface RegistroHistorial {
  id: number;
  tipo: TipoHistorial;
  destinatario_telefono: string | null;
  mensaje: string;
  estado: EstadoHistorial;
  creado_en: string;
  usuario?: { nombre: string } | null;
}

interface RespuestaHistorial {
  data: RegistroHistorial[];
  total: number;
  page: number;
  limit: number;
}

interface RespuestaEnvio {
  modo: 'API' | 'LINK';
  urlWhatsapp: string | null;
  registro?: { estado: EstadoHistorial };
  error?: string;
}

const ALERTAS_VACIAS: Alertas = {
  stockBajo: [],
  pedidosRecientes: [],
  deudasPendientes: [],
  ultimosIngresos: [],
  total: 0,
};

const HISTORIAL_VACIO: RespuestaHistorial = {
  data: [],
  total: 0,
  page: 1,
  limit: 10,
};

const POR_PAGINA = 10;

const TIPOS: Record<TipoHistorial, { etiqueta: string; Icono: LucideIcon }> = {
  STOCK_BAJO: { etiqueta: 'Alerta de stock', Icono: Package },
  REPORTE_VENTAS: { etiqueta: 'Reporte de ventas', Icono: BarChart3 },
  COMPROBANTE: { etiqueta: 'Comprobante', Icono: Receipt },
};

const ESTADOS: Record<
  EstadoHistorial,
  { etiqueta: string; detalle: string; Icono: LucideIcon; clases: string }
> = {
  ENVIADO: {
    etiqueta: 'Enviado',
    detalle: 'Entregado por WhatsApp',
    Icono: CheckCircle2,
    clases:
      'bg-prolimal-teal-100 text-prolimal-teal-800 dark:bg-prolimal-teal-900/30 dark:text-prolimal-teal-200',
  },
  GENERADO_LINK: {
    etiqueta: 'Enlace generado',
    detalle: 'Listo para abrir en WhatsApp',
    Icono: Link2,
    clases:
      'bg-prolimal-sand-200 text-prolimal-sand-800 dark:bg-prolimal-ink-700 dark:text-prolimal-sand-100',
  },
  ERROR: {
    etiqueta: 'Error en el envío',
    detalle: 'No se pudo completar el envío',
    Icono: XCircle,
    clases:
      'bg-prolimal-red-100 text-prolimal-red-800 dark:bg-prolimal-red-900/30 dark:text-prolimal-red-200',
  },
};

const th =
  'whitespace-nowrap px-3 py-3 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-prolimal-ink-400 sm:px-5 dark:text-prolimal-ink-300';
const td =
  'px-3 py-4 text-xs font-medium align-top text-prolimal-ink-500 sm:px-5 sm:text-sm dark:text-prolimal-ink-200';

function numero(valor: number | string | null | undefined) {
  const n = Number(valor ?? 0);
  return Number.isFinite(n) ? n : 0;
}

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

function diasDesde(valor: string) {
  const milisegundos = Date.now() - new Date(valor).getTime();
  if (!Number.isFinite(milisegundos)) return 0;
  return Math.max(0, Math.floor(milisegundos / 86_400_000));
}

/** Quita el formato Markdown de los mensajes de WhatsApp para leerlos mejor. */
function lineasMensaje(mensaje: string) {
  return String(mensaje || '')
    .split(/\r?\n/)
    .map((linea) => linea.replace(/\*/g, '').trim())
    .filter(Boolean);
}

function GrupoAvisos({
  titulo,
  detalle,
  Icono,
  cantidad,
  tono,
  href,
  textoEnlace,
  children,
}: {
  titulo: string;
  detalle: string;
  Icono: LucideIcon;
  cantidad: number;
  tono: 'coral' | 'sand' | 'teal';
  href: string;
  textoEnlace: string;
  children: React.ReactNode;
}) {
  const tonoIcono = {
    coral: 'bg-prolimal-red-100 text-prolimal-red-700 dark:bg-prolimal-red-900/30 dark:text-prolimal-red-300',
    sand: 'bg-prolimal-sand-200 text-prolimal-sand-800 dark:bg-prolimal-ink-700 dark:text-prolimal-sand-100',
    teal: 'bg-prolimal-teal-100 text-prolimal-teal-700 dark:bg-prolimal-teal-900/30 dark:text-prolimal-teal-300',
  }[tono];

  return (
    <section className="flex flex-col overflow-hidden rounded-[1.75rem] border border-prolimal-ink-900/10 bg-card shadow-[0_24px_60px_-46px_rgba(11,37,32,0.45)] dark:border-prolimal-sand-100/10 dark:bg-card-dark">
      <div className="flex items-start gap-3 border-b border-prolimal-ink-900/5 px-5 py-4 dark:border-prolimal-sand-100/10">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tonoIcono}`}>
          <Icono className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-extrabold text-prolimal-ink-900 dark:text-prolimal-sand-50">
              {titulo}
            </h3>
            <span className="rounded-full bg-prolimal-sand-100 px-2 py-0.5 text-[10px] font-bold text-prolimal-ink-600 dark:bg-prolimal-ink-800 dark:text-prolimal-sand-100">
              {cantidad}
            </span>
          </div>
          <p className="mt-1 text-xs font-medium leading-relaxed text-prolimal-ink-500 dark:text-prolimal-ink-300">
            {detalle}
          </p>
        </div>
      </div>
      <div className="flex-1 divide-y divide-prolimal-ink-900/5 dark:divide-prolimal-sand-100/10">
        {children}
      </div>
      <Link
        href={href}
        prefetch={false}
        className="border-t border-prolimal-ink-900/5 px-5 py-3 text-xs font-bold text-prolimal-teal-700 transition-colors hover:bg-prolimal-sand-50 dark:border-prolimal-sand-100/10 dark:text-prolimal-teal-300 dark:hover:bg-prolimal-ink-800/50"
      >
        {textoEnlace} →
      </Link>
    </section>
  );
}

function FilaAviso({
  titulo,
  detalle,
  badge,
  tono,
}: {
  titulo: string;
  detalle: string;
  badge: string;
  tono: 'coral' | 'sand' | 'teal';
}) {
  const clasesBadge = {
    coral: 'bg-prolimal-red-100 text-prolimal-red-700 dark:bg-prolimal-red-900/30 dark:text-prolimal-red-300',
    sand: 'bg-prolimal-sand-200 text-prolimal-sand-800 dark:bg-prolimal-ink-700 dark:text-prolimal-sand-100',
    teal: 'bg-prolimal-teal-100 text-prolimal-teal-700 dark:bg-prolimal-teal-900/30 dark:text-prolimal-teal-300',
  }[tono];

  return (
    <div className="px-5 py-3.5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="break-words text-sm font-bold text-prolimal-ink-800 dark:text-prolimal-sand-50">
          {titulo}
        </p>
        <span className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-[10px] font-bold ${clasesBadge}`}>
          {badge}
        </span>
      </div>
      <p className="mt-1 break-words text-xs font-medium leading-relaxed text-prolimal-ink-500 dark:text-prolimal-ink-300">
        {detalle}
      </p>
    </div>
  );
}

export default function NotificacionesPage() {
  const [rol, setRol] = useState('');
  const [alertas, setAlertas] = useState<Alertas>(ALERTAS_VACIAS);
  const [historial, setHistorial] = useState<RespuestaHistorial>(HISTORIAL_VACIO);
  const [cargandoAlertas, setCargandoAlertas] = useState(true);
  const [cargandoHistorial, setCargandoHistorial] = useState(true);
  const [errorAlertas, setErrorAlertas] = useState('');
  const [errorHistorial, setErrorHistorial] = useState('');
  const [enviandoAlerta, setEnviandoAlerta] = useState(false);
  const [toast, setToast] = useState<ToastDatos | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('all');
  const [filtroEstado, setFiltroEstado] = useState('all');
  const [pagina, setPagina] = useState(1);

  useEffect(() => {
    try {
      const guardado = localStorage.getItem('usuario');
      if (guardado) {
        const parsed = JSON.parse(guardado) as { rol?: unknown };
        setRol(normalizarRol(parsed.rol, undefined) ?? '');
      }
    } catch {
      setRol('');
    }
  }, []);

  const cargarAlertas = async () => {
    setCargandoAlertas(true);
    setErrorAlertas('');
    try {
      const { data } = await api.get<Alertas>('/notificaciones');
      setAlertas(data ?? ALERTAS_VACIAS);
    } catch {
      setErrorAlertas('No se pudieron cargar los avisos activos.');
    } finally {
      setCargandoAlertas(false);
    }
  };

  const cargarHistorial = async () => {
    setCargandoHistorial(true);
    setErrorHistorial('');
    try {
      const { data } = await api.get<RespuestaHistorial>(
        '/notificaciones/historial',
        { params: { page: 1, limit: 100 } },
      );
      setHistorial(data ?? HISTORIAL_VACIO);
    } catch {
      setErrorHistorial('No se pudo cargar el historial de envíos.');
    } finally {
      setCargandoHistorial(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargarAlertas();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargarHistorial();
  }, []);

  const recargar = () => {
    cargarAlertas();
    cargarHistorial();
  };

  const enviarAlertaStock = async () => {
    const ventana = window.open('', '_blank');
    if (ventana) ventana.opener = null;

    setEnviandoAlerta(true);
    try {
      const { data } = await api.post<RespuestaEnvio>(
        '/notificaciones/whatsapp/alerta-stock',
        {},
      );
      if (data?.urlWhatsapp) {
        if (ventana) ventana.location.href = data.urlWhatsapp;
        else window.open(data.urlWhatsapp, '_blank', 'noopener,noreferrer');
      } else {
        ventana?.close();
      }

      const fallo = data?.registro?.estado === 'ERROR';
      setToast({
        id: Date.now(),
        tipo: fallo ? 'error' : 'exito',
        mensaje: fallo
          ? data?.error || 'No se pudo enviar la alerta de stock.'
          : data?.modo === 'LINK'
            ? 'Enlace de WhatsApp abierto. La alerta quedó registrada.'
            : 'Alerta de stock enviada por WhatsApp.',
      });
      cargarHistorial();
    } catch {
      ventana?.close();
      setToast({
        id: Date.now(),
        tipo: 'error',
        mensaje: 'No se pudo generar la alerta de stock.',
      });
    } finally {
      setEnviandoAlerta(false);
    }
  };

  const filasFiltradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return historial.data.filter((n) => {
      if (filtroTipo !== 'all' && n.tipo !== filtroTipo) return false;
      if (filtroEstado !== 'all' && n.estado !== filtroEstado) return false;
      if (!q) return true;
      const texto = [
        TIPOS[n.tipo]?.etiqueta ?? n.tipo,
        ESTADOS[n.estado]?.etiqueta ?? n.estado,
        n.destinatario_telefono,
        n.usuario?.nombre,
        n.mensaje,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return texto.includes(q);
    });
  }, [historial.data, busqueda, filtroTipo, filtroEstado]);

  const paginas = Math.max(1, Math.ceil(filasFiltradas.length / POR_PAGINA));
  const paginaSegura = Math.min(pagina, paginas);
  const filasPagina = filasFiltradas.slice(
    (paginaSegura - 1) * POR_PAGINA,
    paginaSegura * POR_PAGINA,
  );

  const cambiarFiltro = (accion: () => void) => {
    accion();
    setPagina(1);
  };

  const saldoCobranza = alertas.deudasPendientes.reduce(
    (suma, deuda) => suma + numero(deuda.saldo),
    0,
  );

  const kpis = [
    { etiqueta: 'Avisos activos', valor: alertas.total, Icono: BellRing },
    {
      etiqueta: 'Productos con stock bajo',
      valor: alertas.stockBajo.length,
      Icono: Package,
    },
    {
      etiqueta: 'Cobranza pendiente',
      valor: formatCurrency(saldoCobranza),
      Icono: Receipt,
    },
    {
      etiqueta: 'Envíos registrados',
      valor: historial.total,
      Icono: MessageCircle,
    },
  ];

  return (
    <div className="pb-10">
      <section className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="prolimal-eyebrow">Operaciones · Avisos</p>
          <h2 className="prolimal-display mt-2 text-3xl tracking-[-0.04em] text-prolimal-ink-900 dark:text-prolimal-sand-50">
            Centro de notificaciones
          </h2>
          <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-prolimal-ink-500 dark:text-prolimal-ink-200">
            Alertas de stock, cobranza y actividad reciente, junto al historial
            de todos los envíos por WhatsApp o sistema.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={recargar}
            disabled={cargandoAlertas || cargandoHistorial}
            className="inline-flex items-center gap-2 rounded-full border border-prolimal-ink-900/10 bg-card px-4 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-prolimal-ink-500 transition-colors hover:bg-prolimal-sand-100 disabled:opacity-60 dark:border-prolimal-sand-100/10 dark:bg-card-dark dark:text-prolimal-ink-200"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${cargandoAlertas || cargandoHistorial ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
          {esRol(rol, 'admin', 'inventario') && (
            <button
              type="button"
              onClick={enviarAlertaStock}
              disabled={enviandoAlerta}
              className="inline-flex items-center gap-2 rounded-full bg-prolimal-teal-700 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-white transition-colors hover:bg-prolimal-ink-900 disabled:opacity-60 dark:bg-prolimal-teal-400 dark:text-prolimal-ink-900"
            >
              <Send className="h-3.5 w-3.5" />
              {enviandoAlerta ? 'Enviando...' : 'Enviar alerta de stock'}
            </button>
          )}
          {esRol(rol, 'admin', 'ventas') && (
            <Link
              href="/admin/reportes"
              prefetch={false}
              className="inline-flex items-center gap-2 rounded-full border border-prolimal-teal-700/25 bg-prolimal-teal-50 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-prolimal-teal-800 transition-colors hover:bg-prolimal-teal-100 dark:border-prolimal-teal-400/25 dark:bg-prolimal-teal-900/20 dark:text-prolimal-teal-200"
            >
              <BarChart3 className="h-3.5 w-3.5" />
              Enviar reporte
            </Link>
          )}
        </div>
      </section>

      <div className="mb-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map(({ etiqueta, valor, Icono }) => (
          <div
            key={etiqueta}
            className="flex items-center gap-4 rounded-[1.5rem] border border-prolimal-ink-900/10 bg-card px-5 py-4 dark:border-prolimal-sand-100/10 dark:bg-card-dark"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-prolimal-sand-100 text-prolimal-teal-700 dark:bg-prolimal-ink-800 dark:text-prolimal-teal-300">
              <Icono className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-prolimal-ink-400 dark:text-prolimal-ink-300">
                {etiqueta}
              </p>
              <p className="mt-1 break-words text-xl font-extrabold tracking-[-0.03em] text-prolimal-ink-900 dark:text-prolimal-sand-50">
                {valor}
              </p>
            </div>
          </div>
        ))}
      </div>

      <h3 className="mb-4 text-sm font-extrabold uppercase tracking-[0.14em] text-prolimal-ink-600 dark:text-prolimal-ink-200">
        Avisos activos
      </h3>
      {errorAlertas && (
        <p className="mb-4 rounded-xl border border-prolimal-red-200 bg-prolimal-red-50 px-4 py-3 text-sm font-medium text-prolimal-red-700 dark:border-prolimal-red-700/40 dark:bg-prolimal-red-900/20 dark:text-prolimal-red-300">
          {errorAlertas}
        </p>
      )}
      <div className="mb-10 grid gap-4 lg:grid-cols-2">
        <GrupoAvisos
          titulo="Stock bajo"
          detalle="Productos en o por debajo de su mínimo configurado."
          Icono={Package}
          cantidad={alertas.stockBajo.length}
          tono="coral"
          href="/admin/inventario"
          textoEnlace="Gestionar inventario"
        >
          {alertas.stockBajo.map((item) => (
            <FilaAviso
              key={item.id}
              titulo={item.nombre}
              detalle={`Quedan ${numero(item.cantidad)} uds. · mínimo ${numero(item.cantidad_minima)} · faltan ${numero(item.faltante)}`}
              badge={numero(item.cantidad) === 0 ? 'Sin stock' : 'Stock bajo'}
              tono={numero(item.cantidad) === 0 ? 'coral' : 'sand'}
            />
          ))}
          {!cargandoAlertas && alertas.stockBajo.length === 0 && (
            <p className="px-5 py-6 text-center text-sm font-medium text-prolimal-ink-400 dark:text-prolimal-ink-300">
              Todos los productos están por encima de su mínimo.
            </p>
          )}
        </GrupoAvisos>

        <GrupoAvisos
          titulo="Cobranza pendiente"
          detalle={`Saldo total por recuperar: ${formatCurrency(saldoCobranza)}.`}
          Icono={Receipt}
          cantidad={alertas.deudasPendientes.length}
          tono="sand"
          href="/admin/deudas"
          textoEnlace="Gestionar cobranzas"
        >
          {alertas.deudasPendientes.map((deuda) => {
            const dias = diasDesde(deuda.fecha_creacion);
            return (
              <FilaAviso
                key={deuda.id}
                titulo={deuda.cliente || `Deuda #${deuda.id}`}
                detalle={`Saldo ${formatCurrency(deuda.saldo)} · ${dias} ${dias === 1 ? 'día' : 'días'} pendiente${dias === 1 ? '' : 's'} · desde ${formatearFecha(deuda.fecha_creacion)}`}
                badge={numero(deuda.monto_pagado) > 0 ? 'Pago parcial' : 'Pendiente'}
                tono={dias >= 30 ? 'coral' : 'sand'}
              />
            );
          })}
          {!cargandoAlertas && alertas.deudasPendientes.length === 0 && (
            <p className="px-5 py-6 text-center text-sm font-medium text-prolimal-ink-400 dark:text-prolimal-ink-300">
              No hay deudas pendientes ni parciales.
            </p>
          )}
        </GrupoAvisos>

        <GrupoAvisos
          titulo="Pedidos recientes"
          detalle="Pedidos registrados en las últimas 24 horas."
          Icono={ShoppingBag}
          cantidad={alertas.pedidosRecientes.length}
          tono="teal"
          href="/admin/pedidos"
          textoEnlace="Ver pedidos"
        >
          {alertas.pedidosRecientes.map((pedido) => (
            <FilaAviso
              key={pedido.id}
              titulo={`Pedido #${pedido.id} · ${pedido.cliente || 'Sin cliente'}`}
              detalle={`${formatCurrency(pedido.total)} · ${formatearFecha(pedido.creado_en)}`}
              badge={pedido.estado || 'Registrado'}
              tono="teal"
            />
          ))}
          {!cargandoAlertas && alertas.pedidosRecientes.length === 0 && (
            <p className="px-5 py-6 text-center text-sm font-medium text-prolimal-ink-400 dark:text-prolimal-ink-300">
              No se registraron pedidos en las últimas 24 horas.
            </p>
          )}
        </GrupoAvisos>

        <GrupoAvisos
          titulo="Últimos ingresos"
          detalle="Entradas de inventario registradas en las últimas 24 horas."
          Icono={Boxes}
          cantidad={alertas.ultimosIngresos.length}
          tono="teal"
          href="/admin/kardex"
          textoEnlace="Ver Kardex"
        >
          {alertas.ultimosIngresos.map((movimiento) => (
            <FilaAviso
              key={movimiento.id}
              titulo={movimiento.producto}
              detalle={`+${numero(movimiento.cantidad)} uds. · ${movimiento.motivo?.trim() || 'Sin motivo'} · ${formatearFecha(movimiento.creado_en)}`}
              badge="Entrada"
              tono="teal"
            />
          ))}
          {!cargandoAlertas && alertas.ultimosIngresos.length === 0 && (
            <p className="px-5 py-6 text-center text-sm font-medium text-prolimal-ink-400 dark:text-prolimal-ink-300">
              No se registraron ingresos en las últimas 24 horas.
            </p>
          )}
        </GrupoAvisos>
      </div>

      <section className="overflow-hidden rounded-[2rem] border border-prolimal-ink-900/10 bg-card shadow-[0_24px_60px_-46px_rgba(11,37,32,0.45)] dark:border-prolimal-sand-100/10 dark:bg-card-dark">
        <div className="flex flex-wrap items-center justify-between gap-2 px-6 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-prolimal-ink-400 dark:text-prolimal-ink-300">
              Trazabilidad
            </p>
            <h3 className="mt-1 text-lg font-extrabold text-prolimal-ink-900 dark:text-prolimal-sand-50">
              Historial de envíos
            </h3>
          </div>
          <p className="text-xs font-medium text-prolimal-ink-500 dark:text-prolimal-ink-300">
            {historial.data.length} de {historial.total} registros disponibles
          </p>
        </div>

        <div className="grid gap-3 border-t border-prolimal-ink-900/5 px-6 py-4 dark:border-prolimal-sand-100/10 sm:grid-cols-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-prolimal-ink-400 dark:text-prolimal-ink-300" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => cambiarFiltro(() => setBusqueda(e.target.value))}
              placeholder="Buscar en el historial"
              aria-label="Buscar en el historial"
              className="prolimal-search-input w-full"
            />
          </div>
          <select
            aria-label="Filtrar por tipo de notificación"
            value={filtroTipo}
            onChange={(e) => cambiarFiltro(() => setFiltroTipo(e.target.value))}
            className="prolimal-input"
          >
            <option value="all">Todos los tipos</option>
            {(Object.keys(TIPOS) as TipoHistorial[]).map((tipo) => (
              <option key={tipo} value={tipo}>
                {TIPOS[tipo].etiqueta}
              </option>
            ))}
          </select>
          <select
            aria-label="Filtrar por estado de envío"
            value={filtroEstado}
            onChange={(e) => cambiarFiltro(() => setFiltroEstado(e.target.value))}
            className="prolimal-input"
          >
            <option value="all">Todos los estados</option>
            {(Object.keys(ESTADOS) as EstadoHistorial[]).map((estado) => (
              <option key={estado} value={estado}>
                {ESTADOS[estado].etiqueta}
              </option>
            ))}
          </select>
        </div>

        {errorHistorial && (
          <p className="mx-6 mb-4 rounded-xl border border-prolimal-red-200 bg-prolimal-red-50 px-4 py-3 text-sm font-medium text-prolimal-red-700 dark:border-prolimal-red-700/40 dark:bg-prolimal-red-900/20 dark:text-prolimal-red-300">
            {errorHistorial}
          </p>
        )}

        <p className="mb-2 text-[11px] font-medium text-prolimal-ink-400 md:hidden dark:text-prolimal-ink-300">
          Deslizá para ver más columnas →
        </p>
        <div className="scrollbar-hide overflow-x-auto">
          <table className="w-full min-w-[820px] xl:min-w-[1100px]" aria-label="Historial de notificaciones">
            <thead>
              <tr className="border-b border-prolimal-ink-900/5 bg-prolimal-sand-50/60 dark:border-prolimal-sand-100/10 dark:bg-prolimal-ink-800/40">
                <th className={`${th} min-w-[170px]`}>Fecha</th>
                <th className={`${th} min-w-[170px]`}>Tipo</th>
                <th className={`${th} min-w-[160px]`}>Destinatario</th>
                <th className={`${th} min-w-[190px]`}>Estado</th>
                <th className={`${th} min-w-[140px]`}>Usuario</th>
                <th className={`${th} min-w-[340px]`}>Contenido del mensaje</th>
              </tr>
            </thead>
            <tbody>
              {cargandoHistorial && (
                <tr>
                  <td colSpan={6} className="px-6 py-14 text-center text-sm font-medium text-prolimal-ink-400 dark:text-prolimal-ink-300">
                    Cargando historial...
                  </td>
                </tr>
              )}
              {!cargandoHistorial && filasPagina.map((n) => {
                const tipo = TIPOS[n.tipo];
                const estado = ESTADOS[n.estado] ?? ESTADOS.ERROR;
                const lineas = lineasMensaje(n.mensaje);
                const IconoTipo = tipo?.Icono ?? MessageCircle;
                const IconoEstado = estado.Icono;

                return (
                  <tr
                    key={n.id}
                    className="border-b border-prolimal-ink-900/5 last:border-0 dark:border-prolimal-sand-100/5"
                  >
                    <td className={`${td} min-w-[170px] whitespace-nowrap tabular-nums`}>
                      {formatearFecha(n.creado_en)}
                    </td>
                    <td className={`${td} min-w-[170px]`}>
                      <span className="inline-flex items-center gap-2 font-bold text-prolimal-ink-800 dark:text-prolimal-sand-50">
                        <IconoTipo className="h-4 w-4 shrink-0 text-prolimal-teal-700 dark:text-prolimal-teal-300" />
                        {tipo?.etiqueta ?? n.tipo}
                      </span>
                    </td>
                    <td className={`${td} min-w-[160px] break-words`}>
                      {n.destinatario_telefono || 'Sin número fijo'}
                    </td>
                    <td className={`${td} min-w-[190px]`}>
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold ${estado.clases}`}>
                        <IconoEstado className="h-3.5 w-3.5 shrink-0" />
                        {estado.etiqueta}
                      </span>
                      <p className="mt-1.5 text-[11px] font-medium text-prolimal-ink-400 dark:text-prolimal-ink-300">
                        {estado.detalle}
                      </p>
                    </td>
                    <td className={`${td} min-w-[140px] break-words`}>
                      {n.usuario?.nombre || 'Automático'}
                    </td>
                    <td className={`${td} min-w-[340px]`}>
                      <div className="space-y-1">
                        {lineas.slice(0, 3).map((linea, i) => (
                          <p key={i} className="break-words whitespace-pre-line text-xs font-medium leading-relaxed text-prolimal-ink-600 dark:text-prolimal-ink-200">
                            {linea}
                          </p>
                        ))}
                      </div>
                      {lineas.length > 3 && (
                        <details className="mt-2 text-xs">
                          <summary className="w-fit cursor-pointer list-none font-bold text-prolimal-teal-700 hover:underline dark:text-prolimal-teal-300">
                            Ver mensaje completo ({lineas.length} líneas)
                          </summary>
                          <div className="mt-2 space-y-1 rounded-xl border border-prolimal-ink-900/10 bg-prolimal-sand-50 p-3 dark:border-prolimal-sand-100/10 dark:bg-prolimal-ink-800/50">
                            {lineas.map((linea, i) => (
                              <p key={i} className="break-words whitespace-pre-line font-medium leading-relaxed text-prolimal-ink-600 dark:text-prolimal-ink-200">
                                {linea}
                              </p>
                            ))}
                          </div>
                        </details>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!cargandoHistorial && filasPagina.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-14 text-center text-sm font-medium text-prolimal-ink-400 dark:text-prolimal-ink-300">
                    {historial.data.length === 0
                      ? 'Aún no hay envíos registrados. Cuando se envíe una alerta o un reporte aparecerá aquí.'
                      : 'No hay envíos que coincidan con los filtros seleccionados.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-prolimal-ink-900/5 px-6 py-4 dark:border-prolimal-sand-100/10">
          <p className="text-xs font-medium text-prolimal-ink-500 dark:text-prolimal-ink-300">
            {filasFiltradas.length === 0
              ? 'Sin resultados'
              : `Mostrando ${(paginaSegura - 1) * POR_PAGINA + 1}–${Math.min(paginaSegura * POR_PAGINA, filasFiltradas.length)} de ${filasFiltradas.length}`}
            {' · '}Página {paginaSegura} de {paginas}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPagina((p) => Math.max(1, p - 1))}
              disabled={paginaSegura <= 1}
              aria-label="Página anterior del historial"
              className="rounded-full border border-prolimal-ink-900/10 p-2 text-prolimal-ink-600 disabled:opacity-40 dark:border-prolimal-sand-100/10 dark:text-prolimal-sand-100"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setPagina((p) => Math.min(paginas, p + 1))}
              disabled={paginaSegura >= paginas}
              aria-label="Página siguiente del historial"
              className="rounded-full border border-prolimal-ink-900/10 p-2 text-prolimal-ink-600 disabled:opacity-40 dark:border-prolimal-sand-100/10 dark:text-prolimal-sand-100"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      <p className="mt-4 flex items-center gap-2 text-xs font-medium text-prolimal-ink-400 dark:text-prolimal-ink-300">
        <Clock3 className="h-3.5 w-3.5" />
        Los estados indican si el mensaje fue entregado, si quedó listo como
        enlace de WhatsApp o si el envío falló. El contenido completo siempre
        se puede desplegar sin recortes.
      </p>
      <p className="mt-1 flex items-center gap-2 text-xs font-medium text-prolimal-ink-400 dark:text-prolimal-ink-300">
        <AlertTriangle className="h-3.5 w-3.5" />
        El historial muestra los últimos 100 envíos disponibles.
      </p>

      <ToastNotificacion toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}

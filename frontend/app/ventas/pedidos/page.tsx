'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { normalizarPedido, type PedidoEditable } from '@/lib/pedidos';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, MapPin, Plus, X } from 'lucide-react';
import BotonComprobantePdf from '@/components/ui/BotonComprobantePdf';
import EditorPedido from '@/components/pedidos/EditorPedido';

type Pedido = PedidoEditable;

const COLORES_ESTADO: Record<string, string> = {
  pendiente: 'bg-prolimal-orange-100 text-prolimal-orange-700 dark:bg-prolimal-orange-900/25 dark:text-prolimal-orange-300',
  confirmado: 'bg-prolimal-teal-100 text-prolimal-teal-700 dark:bg-prolimal-teal-900/30 dark:text-prolimal-teal-300',
  enviado: 'bg-prolimal-purple-100 text-prolimal-purple-700 dark:bg-prolimal-purple-900/25 dark:text-prolimal-purple-300',
  entregado: 'bg-prolimal-green-100 text-prolimal-green-700 dark:bg-prolimal-green-900/25 dark:text-prolimal-green-300',
  cancelado: 'bg-prolimal-coral-100 text-prolimal-coral-700 dark:bg-prolimal-coral-900/25 dark:text-prolimal-coral-300',
};

const ESTADOS = ['pendiente', 'confirmado', 'enviado', 'entregado', 'cancelado'];

const TRANSICIONES: Record<string, string[]> = {
  pendiente: ['confirmado', 'cancelado'],
  confirmado: ['enviado', 'cancelado'],
  enviado: ['entregado', 'cancelado'],
  entregado: [],
  cancelado: [],
};

export default function VentasPedidosPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [pedidoSel, setPedidoSel] = useState<Pedido | null>(null);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState('');

  const cargar = useCallback(async () => {
    try {
      const res = await api.get('/pedidos');
      setPedidos(
        Array.isArray(res.data) ? res.data.map(normalizarPedido) : [],
      );
    } catch {
      setPedidos([]);
    } finally {
      setCargando(false);
    }
  }, []);

  const recargarDetalle = useCallback(
    async (id: number) => {
      const res = await api.get(`/pedidos/${id}`);
      setPedidoSel(normalizarPedido(res.data));
      await cargar();
    },
    [cargar],
  );

  const abrirDetalle = async (id: number) => {
    try {
      const res = await api.get(`/pedidos/${id}`);
      setPedidoSel(normalizarPedido(res.data));
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'No se pudo cargar el detalle del pedido.';
      alert(msg);
    }
  };

  useEffect(() => {
    cargar(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [cargar]);

  const cambiarEstado = async (id: number, estado: string) => {
    try {
      await api.put(`/pedidos/${id}/estado`, { estado });
      await cargar();
      if (pedidoSel?.id === id) await recargarDetalle(id);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'No se pudo actualizar el estado.';
      alert(msg);
    }
  };

  if (cargando) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="prolimal-surface px-6 py-20 text-center text-sm font-medium text-prolimal-ink-400 dark:text-prolimal-ink-300">
          Cargando pedidos...
        </div>
      </main>
    );
  }

  const visibles = filtro ? pedidos.filter(p => p.estado === filtro) : pedidos;

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-12">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="prolimal-eyebrow">Seguimiento</p>
          <h1 className="prolimal-display mt-2 text-3xl tracking-[-0.04em] text-prolimal-ink-900 dark:text-prolimal-sand-50">
            Pedidos
          </h1>
          <p className="mt-2 text-sm font-medium text-prolimal-ink-400 dark:text-prolimal-ink-300">
            {visibles.length} pedido{visibles.length !== 1 ? 's' : ''} en esta vista
          </p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-end">
          <Link
            href="/ventas/nuevo-pedido"
            className="prolimal-btn-primary inline-flex justify-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Nuevo Pedido
          </Link>
          <div className="relative w-full sm:w-56">
            <select
              value={filtro}
              onChange={e => setFiltro(e.target.value)}
              className="prolimal-input appearance-none pr-10"
              aria-label="Filtrar por estado"
            >
              <option value="">Todos los estados</option>
              {ESTADOS.map(e => (
                <option key={e} value={e}>
                  {e.charAt(0).toUpperCase() + e.slice(1)}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-prolimal-ink-400 dark:text-prolimal-ink-300" />
          </div>
        </div>
      </div>

      {visibles.length === 0 ? (
        <div className="prolimal-surface px-6 py-20 text-center">
          <p className="text-sm font-medium text-prolimal-ink-400 dark:text-prolimal-ink-300">
            No hay pedidos en esta vista.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visibles.map(p => (
            <article
              key={p.id}
              className="rounded-[2rem] border border-prolimal-ink-900/10 bg-card p-5 shadow-[0_24px_60px_-46px_rgba(11,37,32,0.45)] dark:border-prolimal-sand-100/10 dark:bg-card-dark"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="prolimal-display text-xl tracking-[-0.03em] text-prolimal-ink-900 dark:text-prolimal-sand-50">
                    #{p.id}
                  </p>
                  <p className="mt-1 truncate text-sm font-extrabold text-prolimal-ink-800 dark:text-prolimal-sand-50">
                    {p.usuario?.nombre || `Cliente #${p.id}`}
                  </p>
                  <p className="mt-0.5 truncate text-xs font-medium text-prolimal-ink-400 dark:text-prolimal-ink-300">
                    CI: {p.usuario?.carnet || '—'} · Tel: {p.usuario?.telefono || '—'}
                  </p>
                  <p className="mt-0.5 truncate text-xs font-medium text-prolimal-ink-400 dark:text-prolimal-ink-300">
                    {p.usuario?.email || '—'}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${COLORES_ESTADO[p.estado] || ''}`}
                >
                  {p.estado}
                </span>
              </div>
              <div className="mb-3 space-y-1 rounded-2xl bg-prolimal-sand-100/60 p-3 text-xs font-medium text-prolimal-ink-500 dark:bg-prolimal-ink-800/50 dark:text-prolimal-sand-200">
                <p className="flex items-start gap-1.5">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span className="break-words">
                    Entrega: {p.direccion_entrega || p.usuario?.ubicacion || 'Sin dirección'}
                  </span>
                </p>
                <p>Ubicación: {p.usuario?.ubicacion || '—'}</p>
                <p>Pago: {p.tipo_pago || 'CONTADO'}</p>
                <p>Atendido por: {p.procesador?.nombre || 'Sin asignar'}</p>
                {p.notas && <p className="break-words">Notas: {p.notas}</p>}
              </div>
              <div className="mb-4 flex items-end justify-between gap-3">
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-prolimal-ink-400 dark:text-prolimal-ink-300">
                  {new Date(p.creado_en).toLocaleDateString()}
                </span>
                <p className="text-lg font-extrabold tracking-[-0.03em] text-prolimal-teal-700 dark:text-prolimal-teal-300">
                  {formatCurrency(p.total)}
                </p>
              </div>
              <select
                value={p.estado}
                onChange={e => cambiarEstado(p.id, e.target.value)}
                className="prolimal-input py-2.5 text-xs font-semibold"
                aria-label={`Estado del pedido ${p.id}`}
              >
                {ESTADOS.map(e => (
                  <option
                    key={e}
                    value={e}
                    disabled={e !== p.estado && !(TRANSICIONES[p.estado] || []).includes(e)}
                  >
                    {e.charAt(0).toUpperCase() + e.slice(1)}
                  </option>
                ))}
              </select>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => abrirDetalle(p.id)}
                  className="prolimal-btn-secondary flex-1 px-3 py-2 text-xs"
                >
                  Ver detalle y editar ítems
                </button>
                <BotonComprobantePdf pedidoId={p.id} label="Comprobante PDF" compacta />
              </div>
            </article>
          ))}
        </div>
      )}

      <AnimatePresence>
        {pedidoSel && (
          <motion.div
            key="modal-detalle-ventas"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-prolimal-ink-900/50 p-4 backdrop-blur-sm"
            onClick={() => setPedidoSel(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.97 }}
              className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] border border-prolimal-ink-900/10 bg-card p-6 shadow-[0_40px_90px_-40px_rgba(11,37,32,0.6)] dark:border-prolimal-sand-100/10 dark:bg-card-dark sm:p-8"
              onClick={e => e.stopPropagation()}
            >
              <div className="mb-6 flex items-start justify-between gap-3">
                <div>
                  <p className="prolimal-eyebrow">Detalle de pedido</p>
                  <h2 className="prolimal-display mt-2 text-2xl tracking-[-0.04em] text-prolimal-ink-900 dark:text-prolimal-sand-50">
                    Pedido #{pedidoSel.id}
                  </h2>
                  <p className="mt-1 text-xs font-medium text-prolimal-ink-400 dark:text-prolimal-ink-300">
                    {pedidoSel.usuario?.nombre || `Cliente #${pedidoSel.id}`} ·{' '}
                    {pedidoSel.usuario?.telefono || 'Sin teléfono'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPedidoSel(null)}
                  aria-label="Cerrar detalle"
                  className="prolimal-icon-btn h-9 w-9"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mb-5 grid gap-3 rounded-2xl bg-prolimal-sand-100/70 p-4 dark:bg-prolimal-ink-800/60 sm:grid-cols-2">
                <p className="text-xs font-medium text-prolimal-ink-500 dark:text-prolimal-ink-200">
                  Entrega: {pedidoSel.direccion_entrega || pedidoSel.usuario?.ubicacion || 'Sin dirección'}
                </p>
                <p className="text-xs font-medium text-prolimal-ink-500 dark:text-prolimal-ink-200">
                  Pago: {pedidoSel.tipo_pago || 'CONTADO'} · Atendido por:{' '}
                  {pedidoSel.procesador?.nombre || 'Sin asignar'}
                </p>
              </div>

              <div className="mb-6">
                <label
                  htmlFor={`estado-detalle-${pedidoSel.id}`}
                  className="mb-1 block text-[10px] font-bold uppercase tracking-[0.14em] text-prolimal-ink-400 dark:text-prolimal-ink-300"
                >
                  Estado del pedido
                </label>
                <select
                  id={`estado-detalle-${pedidoSel.id}`}
                  value={pedidoSel.estado}
                  onChange={e => cambiarEstado(pedidoSel.id, e.target.value)}
                  className="prolimal-input"
                >
                  {ESTADOS.map(e => (
                    <option
                      key={e}
                      value={e}
                      disabled={e !== pedidoSel.estado && !(TRANSICIONES[pedidoSel.estado] || []).includes(e)}
                    >
                      {e.charAt(0).toUpperCase() + e.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <EditorPedido
                pedido={pedidoSel}
                urlProductos="/productos?limit=100"
                onActualizado={() => recargarDetalle(pedidoSel.id)}
              />

              <div className="mt-6 flex items-center justify-between rounded-2xl bg-prolimal-ink-900 px-5 py-4 text-prolimal-sand-50 dark:bg-prolimal-ink-800">
                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-prolimal-sand-100/60">
                  Total del pedido
                </span>
                <span className="text-2xl font-extrabold tracking-[-0.04em]">
                  {formatCurrency(pedidoSel.total)}
                </span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

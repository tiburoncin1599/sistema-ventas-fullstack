'use client';

import { useEffect, useState } from 'react';
import { api, API_URL, apiFetchBlob } from '@/lib/api';
import { formatCurrency, parseCurrency } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { QrCode, Search, Trash2, X } from 'lucide-react';

interface Pedido {
  id: number;
  total: number;
  estado: string;
  creado_en: string;
  direccion_entrega: string;
  usuario: { nombre: string; email: string };
  detalles?: Detalle[];
}

interface Detalle {
  id: number;
  cantidad: number;
  precio_unitario: number;
  producto: { id: number; nombre: string; imagen_url: string };
}

const getColorEstado = (estado: string) => {
  const colores: Record<string, string> = {
    pendiente: 'bg-prolimal-sand-200 text-prolimal-sand-800 dark:bg-prolimal-sand-900/30 dark:text-prolimal-sand-200',
    confirmado: 'bg-prolimal-teal-100 text-prolimal-teal-700 dark:bg-prolimal-teal-900/30 dark:text-prolimal-teal-300',
    enviado: 'bg-prolimal-purple-100 text-prolimal-purple-700 dark:bg-prolimal-purple-900/30 dark:text-prolimal-purple-300',
    entregado: 'bg-prolimal-green-100 text-prolimal-green-700 dark:bg-prolimal-green-900/30 dark:text-prolimal-green-300',
    cancelado: 'bg-prolimal-coral-100 text-prolimal-coral-700 dark:bg-prolimal-coral-900/25 dark:text-prolimal-coral-300',
  };
  return colores[estado] || 'bg-prolimal-ink-100 text-prolimal-ink-700 dark:bg-prolimal-ink-800 dark:text-prolimal-ink-200';
};

const ESTADOS = ['pendiente', 'confirmado', 'enviado', 'entregado', 'cancelado'];

const TRANSICIONES: Record<string, string[]> = {
  pendiente: ['confirmado', 'cancelado'],
  confirmado: ['enviado', 'cancelado'],
  enviado: ['entregado', 'cancelado'],
  entregado: [],
  cancelado: [],
};

function EstadoBadge({ estado, className }: { estado: string; className?: string }) {
  const bgClass = getColorEstado(estado);
  return (
    <span className={`${bgClass} ${className ?? ''} shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em]`}>{estado}</span>
  );
}

export default function AdminPedidos() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [pedidoSel, setPedidoSel] = useState<Pedido | null>(null);
  const [qrImg, setQrImg] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [busqueda, setBusqueda] = useState('');

  const q = busqueda.trim().toLowerCase();
  const visibles = pedidos.filter(p =>
    (!filtroEstado || p.estado === filtroEstado) &&
    (!q ||
      String(p.id).includes(q) ||
      (p.usuario?.nombre || '').toLowerCase().includes(q) ||
      (p.usuario?.email || '').toLowerCase().includes(q)),
  );

  useEffect(() => {
    api.get('/pedidos').then(res => setPedidos(res.data)).catch(() => {});
  }, []);

  const cambiarEstado = async (id: number, estado: string) => {
    await api.put(`/pedidos/${id}/estado`, { estado });
    const res = await api.get('/pedidos');
    setPedidos(res.data);
    if (pedidoSel?.id === id) {
      setPedidoSel({ ...pedidoSel, estado });
    }
  };

  const abrirDetalle = async (id: number) => {
    setQrImg('');
    try {
      const res = await api.get(`/pedidos/${id}`);
      setPedidoSel(res.data);
    } catch {}
  };

  const generarQR = async (id: number) => {
    try {
      const res = await api.get(`/pedidos/${id}/factura/qr`);
      setQrImg(res.data.qr);
    } catch {
      alert('Error al generar el QR. Verificá que el pedido tenga datos válidos.');
    }
  };

  const eliminarPedido = async (id: number) => {
    if (!confirm('¿Eliminar este pedido?')) return;
    try {
      await api.delete(`/pedidos/${id}`);
      setPedidoSel(null);
      const res = await api.get('/pedidos');
      setPedidos(res.data);
    } catch {}
  };

  return (
    <div className="pb-10">
      <section className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="prolimal-eyebrow">Operaciones</p>
          <h2 className="prolimal-display mt-2 text-3xl tracking-[-0.04em] text-prolimal-ink-900 dark:text-prolimal-sand-50">
            Pedidos
          </h2>
          <p className="mt-2 max-w-xl text-sm font-medium leading-relaxed text-prolimal-ink-500 dark:text-prolimal-ink-200">
            {visibles.length} de {pedidos.length} pedidos registrados.
          </p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="prolimal-input sm:w-48"
          >
            <option value="">Todos los estados</option>
            {ESTADOS.map(e => (
              <option key={e} value={e}>
                {e.charAt(0).toUpperCase() + e.slice(1)}
              </option>
            ))}
          </select>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-prolimal-ink-400 dark:text-prolimal-ink-300" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar #ID, cliente o email"
              className="prolimal-search-input"
            />
          </div>
        </div>
      </section>

      {pedidos.length === 0 ? (
        <div className="prolimal-surface px-6 py-20 text-center text-sm font-medium text-prolimal-ink-400 dark:text-prolimal-ink-300">
          No hay pedidos todavía
        </div>
      ) : visibles.length === 0 ? (
        <div className="prolimal-surface px-6 py-20 text-center text-sm font-medium text-prolimal-ink-400 dark:text-prolimal-ink-300">
          Sin resultados para tu búsqueda o filtro.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visibles.map(pedido => (
            <motion.div
              key={pedido.id}
              whileHover={{ y: -4 }}
              transition={{ duration: 0.2 }}
              onClick={() => abrirDetalle(pedido.id)}
              className="group cursor-pointer overflow-hidden rounded-[2rem] border border-prolimal-ink-900/10 bg-card shadow-[0_24px_60px_-50px_rgba(11,37,32,0.4)] transition-all hover:border-prolimal-teal-500/40 hover:shadow-[0_30px_70px_-45px_rgba(11,37,32,0.5)] dark:border-prolimal-sand-100/10 dark:bg-card-dark dark:hover:border-prolimal-teal-500/30"
            >
              <div className="flex items-start justify-between gap-3 border-b border-prolimal-ink-900/5 px-5 py-4 dark:border-prolimal-sand-100/10">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-prolimal-ink-400 dark:text-prolimal-ink-300">Pedido</p>
                  <p className="text-lg font-extrabold tracking-[-0.03em] text-prolimal-ink-900 dark:text-prolimal-sand-50">#{pedido.id}</p>
                  <p className="mt-0.5 truncate text-xs font-medium text-prolimal-ink-400 dark:text-prolimal-ink-300">
                    {pedido.usuario?.nombre}
                  </p>
                </div>
                <EstadoBadge estado={pedido.estado} />
              </div>
              <div className="px-5 py-4">
                <div className="flex items-end justify-between gap-3">
                  <p className="text-xs font-medium text-prolimal-ink-400 dark:text-prolimal-ink-300">
                    {new Date(pedido.creado_en).toLocaleDateString()}
                  </p>
                  <p className="text-xl font-extrabold tracking-[-0.04em] text-prolimal-teal-700 dark:text-prolimal-teal-300">
                    {formatCurrency(pedido.total)}
                  </p>
                </div>
                <div className="mt-4 flex gap-2 border-t border-prolimal-ink-900/5 pt-4 dark:border-prolimal-sand-100/10" onClick={e => e.stopPropagation()}>
                  <select
                    value={pedido.estado}
                    onChange={e => cambiarEstado(pedido.id, e.target.value)}
                    className="flex-1 rounded-xl border border-prolimal-ink-900/10 bg-white px-2 py-2 text-xs font-semibold text-prolimal-ink-700 focus:outline-none focus:ring-2 focus:ring-prolimal-teal-500/20 dark:border-prolimal-sand-100/10 dark:bg-prolimal-ink-800 dark:text-prolimal-sand-100"
                  >
                    <option value="pendiente">Pendiente</option>
                    <option value="confirmado">Confirmado</option>
                    <option value="enviado">Enviado</option>
                    <option value="entregado">Entregado</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                  <button
                    onClick={() => abrirDetalle(pedido.id)}
                    className="rounded-full px-3 py-2 text-xs font-bold text-prolimal-teal-700 transition-colors hover:bg-prolimal-teal-50 dark:text-prolimal-teal-300 dark:hover:bg-prolimal-teal-900/30"
                  >
                    Ver detalle
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {pedidoSel && (
          <motion.div
            key="modal-pedido"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-prolimal-ink-900/50 p-4 backdrop-blur-sm"
            onClick={() => setPedidoSel(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.97 }}
              transition={{ duration: 0.22 }}
              className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] border border-prolimal-ink-900/10 bg-card p-6 shadow-[0_40px_90px_-40px_rgba(11,37,32,0.6)] dark:border-prolimal-sand-100/10 dark:bg-card-dark sm:p-8"
              onClick={e => e.stopPropagation()}
            >
              <div className="mb-6 flex items-start justify-between gap-3">
                <div>
                  <p className="prolimal-eyebrow">Detalle de pedido</p>
                  <h2 className="prolimal-display mt-2 text-2xl tracking-[-0.04em] text-prolimal-ink-900 dark:text-prolimal-sand-50">
                    Pedido #{pedidoSel.id}
                  </h2>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => eliminarPedido(pedidoSel.id)}
                    className="prolimal-btn-ghost-danger px-3 py-2 text-xs">
                    <Trash2 className="h-3.5 w-3.5" />
                    Eliminar
                  </button>
                  <button onClick={() => setPedidoSel(null)} aria-label="Cerrar"
                    className="prolimal-icon-btn h-9 w-9">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-prolimal-sand-100/70 p-4 dark:bg-prolimal-ink-800/60">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-prolimal-ink-400 dark:text-prolimal-ink-300">Cliente</p>
                  <p className="mt-1 truncate text-sm font-extrabold text-prolimal-ink-800 dark:text-prolimal-sand-50">{pedidoSel.usuario?.nombre}</p>
                  <p className="mt-1 truncate text-xs font-medium text-prolimal-ink-400 dark:text-prolimal-ink-300">{pedidoSel.usuario?.email}</p>
                </div>
                <div className="rounded-2xl bg-prolimal-sand-100/70 p-4 dark:bg-prolimal-ink-800/60">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-prolimal-ink-400 dark:text-prolimal-ink-300">Entrega</p>
                  <p className="mt-1 text-sm font-semibold text-prolimal-ink-700 dark:text-prolimal-sand-100">{pedidoSel.direccion_entrega || 'Sin dirección'}</p>
                </div>
                <div className="rounded-2xl bg-prolimal-sand-100/70 p-4 dark:bg-prolimal-ink-800/60">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-prolimal-ink-400 dark:text-prolimal-ink-300">Fecha</p>
                  <p className="mt-1 text-sm font-semibold text-prolimal-ink-700 dark:text-prolimal-sand-100">{new Date(pedidoSel.creado_en).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="mb-6 flex flex-col gap-2 sm:flex-row">
                <select
                  value={pedidoSel.estado}
                  onChange={e => cambiarEstado(pedidoSel.id, e.target.value)}
                  className="prolimal-input sm:flex-1"
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
                <button
                  onClick={() => generarQR(pedidoSel.id)}
                  className="prolimal-btn-primary whitespace-nowrap"
                >
                  <QrCode className="h-4 w-4" />
                  {qrImg ? 'Regenerar QR' : 'Generar factura QR'}
                </button>
              </div>

              <h3 className="mb-3 text-sm font-extrabold uppercase tracking-[0.14em] text-prolimal-ink-600 dark:text-prolimal-ink-200">Productos</h3>
              <div className="mb-6 space-y-2">
                {pedidoSel.detalles?.map(d => (
                  <div
                    key={d.id}
                    className="flex items-start gap-4 rounded-2xl border border-prolimal-ink-900/5 bg-prolimal-sand-100/60 p-3 dark:border-prolimal-sand-100/10 dark:bg-prolimal-ink-800/60">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-1 dark:bg-prolimal-ink-900">
                      {d.producto?.imagen_url
                        ? <img src={`${API_URL}${d.producto.imagen_url}`} alt={d.producto.nombre} className="h-full w-full object-contain" />
                        : <span className="text-[10px] font-bold uppercase tracking-wide text-prolimal-ink-400 dark:text-prolimal-ink-300">Sin img</span>
                      }
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-sm font-bold text-prolimal-ink-800 dark:text-prolimal-sand-50">{d.producto?.nombre}</p>
                      <p className="mt-0.5 text-xs font-medium text-prolimal-ink-400 dark:text-prolimal-ink-300">x{d.cantidad} @ {formatCurrency(d.precio_unitario)}</p>
                    </div>
                    <p className="shrink-0 text-sm font-extrabold text-prolimal-teal-700 dark:text-prolimal-teal-300">{formatCurrency(d.cantidad * parseCurrency(d.precio_unitario))}</p>
                  </div>
                ))}
              </div>

              <div className="mb-6 flex items-center justify-between rounded-2xl bg-prolimal-ink-900 px-5 py-4 text-prolimal-sand-50 dark:bg-prolimal-ink-800">
                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-prolimal-sand-100/60">Total del pedido</span>
                <span className="text-2xl font-extrabold tracking-[-0.04em]">{formatCurrency(pedidoSel.total)}</span>
              </div>

              {qrImg && (
                <div className="border-t border-prolimal-ink-900/5 pt-5 text-center dark:border-prolimal-sand-100/10">
                  <h3 className="mb-3 text-sm font-extrabold uppercase tracking-[0.14em] text-prolimal-ink-600 dark:text-prolimal-ink-200">Factura QR</h3>
                  <img src={qrImg} alt="Factura QR" className="mx-auto h-48 w-48 rounded-2xl bg-white p-2" />
                  <div className="mt-4 flex flex-wrap justify-center gap-3">
                    <button
                      onClick={() => {
                        const a = document.createElement('a');
                        a.href = qrImg;
                        a.download = `factura-${pedidoSel.id}.png`;
                        a.click();
                      }}
                      className="prolimal-btn-secondary">
                      Descargar QR
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          const blob = await apiFetchBlob(`/pedidos/${pedidoSel.id}/factura/pdf`);
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `factura-${pedidoSel.id}.pdf`;
                          a.click();
                          setTimeout(() => URL.revokeObjectURL(url), 1000);
                        } catch {
                          alert('Error al descargar el PDF. Revisá que el pedido tenga datos de facturación.');
                        }
                      }}
                      className="prolimal-btn-primary">
                      Descargar PDF
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
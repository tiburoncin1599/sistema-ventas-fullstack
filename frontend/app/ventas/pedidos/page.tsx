'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { ChevronDown, MapPin } from 'lucide-react';

interface Pedido {
  id: number;
  total: number;
  estado: string;
  creado_en: string;
  direccion_entrega?: string;
  usuario?: { nombre?: string; email?: string };
}

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
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState('');

  const cargar = async () => {
    try {
      const res = await api.get('/pedidos');
      setPedidos(Array.isArray(res.data) ? res.data : []);
    } catch {
      setPedidos([]);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
cargar(); // eslint-disable-line react-hooks/set-state-in-effect
  }, []);

  const cambiarEstado = async (id: number, estado: string) => {
    try {
      await api.put(`/pedidos/${id}/estado`, { estado });
      await cargar();
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
                  <p className="mt-1 truncate text-sm font-medium text-prolimal-ink-400 dark:text-prolimal-ink-300">
                    {p.usuario?.nombre}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${COLORES_ESTADO[p.estado] || ''}`}
                >
                  {p.estado}
                </span>
              </div>
              {p.direccion_entrega && (
                <p className="mb-3 flex items-center gap-1.5 truncate text-xs font-medium text-prolimal-ink-400 dark:text-prolimal-ink-300">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{p.direccion_entrega}</span>
                </p>
              )}
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
            </article>
          ))}
        </div>
      )}
    </main>
  );
}

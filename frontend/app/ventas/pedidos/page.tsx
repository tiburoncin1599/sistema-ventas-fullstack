'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

interface Pedido {
  id: number;
  total: number;
  estado: string;
  creado_en: string;
  direccion_entrega?: string;
  usuario?: { nombre?: string; email?: string };
}

const COLORES_ESTADO: Record<string, string> = {
  pendiente: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300',
  confirmado: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
  enviado: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300',
  entregado: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
  cancelado: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300',
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
      <p className="text-center py-20 text-gray-500 dark:text-gray-400">
        Cargando pedidos...
      </p>
    );
  }

  const visibles = filtro ? pedidos.filter(p => p.estado === filtro) : pedidos;

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-8 py-10">
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold dark:text-white">Pedidos</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            {visibles.length} pedido{visibles.length !== 1 ? 's' : ''}
          </p>
        </div>
        <select
          value={filtro}
          onChange={e => setFiltro(e.target.value)}
          className="border dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm bg-white dark:bg-gray-800 dark:text-white"
        >
          <option value="">Todos los estados</option>
          {ESTADOS.map(e => (
            <option key={e} value={e}>
              {e.charAt(0).toUpperCase() + e.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {visibles.length === 0 ? (
        <p className="text-center py-20 text-gray-500 dark:text-gray-400">
          No hay pedidos en esta vista.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {visibles.map(p => (
            <div
              key={p.id}
              className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl p-5"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-bold text-lg dark:text-white">#{p.id}</p>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mt-0.5">
                    {p.usuario?.nombre}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold ${COLORES_ESTADO[p.estado] || ''}`}
                >
                  {p.estado}
                </span>
              </div>
              {p.direccion_entrega && (
                <p className="text-xs text-gray-400 dark:text-gray-500 truncate mb-2">
                  📍 {p.direccion_entrega}
                </p>
              )}
              <div className="flex items-end justify-between mb-3">
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {new Date(p.creado_en).toLocaleDateString()}
                </span>
                <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {formatCurrency(p.total)}
                </p>
              </div>
              <select
                value={p.estado}
                onChange={e => cambiarEstado(p.id, e.target.value)}
                className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-xs bg-white dark:bg-gray-700 dark:text-white"
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
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

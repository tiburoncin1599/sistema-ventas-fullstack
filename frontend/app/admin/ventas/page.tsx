'use client';
import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

interface VentaPersonal {
  usuario_id: number;
  usuario_nombre: string;
  total_pedidos: number;
  total_vendido: number;
  pedidos: { id: number; total: number; estado: string; fecha: string }[];
}

export default function AdminVentas() {
  const [ventas, setVentas] = useState<VentaPersonal[]>([]);
  const [cargando, setCargando] = useState(true);
  const [sel, setSel] = useState<VentaPersonal | null>(null);
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    const params: any = {};
    if (desde) params.desde = desde;
    if (hasta) params.hasta = hasta;
    try {
      const res = await api.get('/pedidos/ventas/personal', { params });
      setVentas(res.data);
    } catch {}
    setCargando(false);
  }, [desde, hasta]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const totalGeneral = ventas.reduce((s, v) => s + v.total_vendido, 0);

  if (cargando) return <p className="text-center py-20 text-gray-500 dark:text-gray-400">Cargando...</p>;

  return (
    <main className="max-w-6xl mx-auto px-8 py-12">
      <h1 className="text-3xl font-bold mb-2 dark:text-white">Historial de Ventas</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-6">Ventas registradas por cada miembro del personal</p>

      <div className="flex flex-wrap items-center gap-4 mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border dark:border-gray-700">
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Desde</label>
          <input type="date" value={desde} onChange={e => setDesde(e.target.value)}
            className="border dark:border-gray-600 rounded-xl px-4 py-2.5 dark:bg-gray-700 dark:text-white text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Hasta</label>
          <input type="date" value={hasta} onChange={e => setHasta(e.target.value)}
            className="border dark:border-gray-600 rounded-xl px-4 py-2.5 dark:bg-gray-700 dark:text-white text-sm" />
        </div>
        <button onClick={cargar}
          className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-blue-700 text-sm mt-4">
          Filtrar
        </button>
        {(desde || hasta) && (
          <button onClick={() => { setDesde(''); setHasta(''); }}
            className="text-gray-500 dark:text-gray-400 hover:underline text-sm mt-4">
            Limpiar filtro
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-2xl p-6">
          <p className="text-blue-600 dark:text-blue-400 font-medium mb-1">Personal activo</p>
          <p className="text-4xl font-bold text-blue-700 dark:text-blue-300">{ventas.length}</p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-2xl p-6">
          <p className="text-green-600 dark:text-green-400 font-medium mb-1">Total vendido</p>
          <p className="text-4xl font-bold text-green-700 dark:text-green-300">{formatCurrency(totalGeneral)}</p>
        </div>
        <div className="bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800 rounded-2xl p-6">
          <p className="text-purple-600 dark:text-purple-400 font-medium mb-1">Total pedidos</p>
          <p className="text-4xl font-bold text-purple-700 dark:text-purple-300">{ventas.reduce((s, v) => s + v.total_pedidos, 0)}</p>
        </div>
      </div>

      <div className="border dark:border-gray-700 rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="text-left px-6 py-4 font-semibold dark:text-white">Personal</th>
              <th className="text-left px-6 py-4 font-semibold dark:text-white">Pedidos</th>
              <th className="text-left px-6 py-4 font-semibold dark:text-white">Total vendido</th>
              <th className="text-left px-6 py-4 font-semibold dark:text-white">Promedio</th>
              <th className="text-left px-6 py-4 font-semibold dark:text-white">Detalle</th>
            </tr>
          </thead>
          <tbody>
            {ventas.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-12 text-gray-500 dark:text-gray-400">Sin datos de ventas</td>
              </tr>
            ) : ventas.map(v => (
              <tr key={v.usuario_id} className="border-t dark:border-gray-700 dark:text-white">
                <td className="px-6 py-4 font-medium">{v.usuario_nombre}</td>
                <td className="px-6 py-4">{v.total_pedidos}</td>
                <td className="px-6 py-4 font-bold text-blue-600 dark:text-blue-400">{formatCurrency(v.total_vendido)}</td>
                <td className="px-6 py-4">{formatCurrency(v.total_pedidos > 0 ? v.total_vendido / v.total_pedidos : 0)}</td>
                <td className="px-6 py-4">
                  <button onClick={() => setSel(sel?.usuario_id === v.usuario_id ? null : v)} className="text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium">
                    {sel?.usuario_id === v.usuario_id ? 'Ocultar' : 'Ver pedidos'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sel && (
        <div className="mt-6 border dark:border-gray-700 rounded-2xl p-6 dark:bg-gray-800">
          <h2 className="text-xl font-bold mb-4 dark:text-white">Pedidos de {sel.usuario_nombre}</h2>
          <div className="space-y-3">
            {sel.pedidos.map(p => (
              <div key={p.id} className="flex items-center justify-between border-b dark:border-gray-700 pb-3">
                <div>
                  <p className="font-medium dark:text-white">Pedido #{p.id}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{new Date(p.fecha).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    p.estado === 'entregado' ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300' :
                    p.estado === 'cancelado' ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300' :
                    'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300'
                  }`}>{p.estado}</span>
                  <p className="font-bold dark:text-white">{formatCurrency(p.total)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}

'use client';
import { useEffect, useState } from 'react';
import { api, apiFetchBlob } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

interface Deuda {
  id: number;
  monto: number;
  monto_pagado: number;
  descripcion: string;
  estado: string;
  fecha_creacion: string;
  usuario: { nombre: string };
  vendedor?: { nombre: string } | null;
}

export default function VentasDeudas() {
  const [deudas, setDeudas] = useState<Deuda[]>([]);
  const [resumen, setResumen] = useState<{
    total_deudas: number;
    deudas_pendientes: number;
    total_pendiente: number;
    total_pagado: number;
    deudas_pagadas: number;
  } | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/deudas').catch(() => ({ data: [] })),
      api.get('/deudas/resumen').catch(() => ({ data: null })),
    ]).then(([deudasRes, resumenRes]) => {
      setDeudas(Array.isArray(deudasRes.data) ? deudasRes.data : []);
      setResumen(resumenRes.data);
    }).finally(() => setCargando(false));
  }, []);

  const getColorEstado = (estado: string) => {
    const colores: Record<string, string> = {
      pendiente: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300',
      parcial: 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300',
      pagado: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
    };
    return colores[estado] || 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300';
  };

  const descargarFactura = async (id: number) => {
    try {
      const blob = await apiFetchBlob(`/deudas/${id}/factura/pdf`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `factura-deuda-${id}.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      alert('Error al descargar la factura');
    }
  };

  if (cargando) {
    return <p className="text-center py-20 text-gray-500 dark:text-gray-400">Cargando deudas...</p>;
  }

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold dark:text-white">Mis deudas</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          Deudas que gestionás como personal de ventas
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-2xl p-6">
          <p className="text-blue-600 dark:text-blue-400 font-medium mb-1 text-sm">Total deudas</p>
          <p className="text-4xl font-bold text-blue-700 dark:text-blue-300">{resumen?.total_deudas ?? deudas.length}</p>
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-2xl p-6">
          <p className="text-yellow-600 dark:text-yellow-400 font-medium mb-1 text-sm">Deudas pendientes</p>
          <p className="text-4xl font-bold text-yellow-700 dark:text-yellow-300">{resumen?.deudas_pendientes ?? 0}</p>
        </div>
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-2xl p-6">
          <p className="text-red-600 dark:text-red-400 font-medium mb-1 text-sm">Total por cobrar</p>
          <p className="text-2xl font-bold text-red-700 dark:text-red-300 mt-2">{formatCurrency(resumen?.total_pendiente ?? 0)}</p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-2xl p-6">
          <p className="text-green-600 dark:text-green-400 font-medium mb-1 text-sm">Total cobrado</p>
          <p className="text-2xl font-bold text-green-700 dark:text-green-300 mt-2">{formatCurrency(resumen?.total_pagado ?? 0)}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl overflow-hidden">
        {deudas.length === 0 ? (
          <p className="text-center py-16 text-gray-500 dark:text-gray-400">No tenés deudas registradas</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead>
                <tr className="border-b dark:border-gray-700">
                  <th className="text-left px-6 py-3 font-semibold text-sm dark:text-white">Cliente</th>
                  <th className="text-left px-6 py-3 font-semibold text-sm dark:text-white">Descripción</th>
                  <th className="text-left px-6 py-3 font-semibold text-sm dark:text-white">Monto</th>
                  <th className="text-left px-6 py-3 font-semibold text-sm dark:text-white">Pagado</th>
                  <th className="text-left px-6 py-3 font-semibold text-sm dark:text-white">Saldo</th>
                  <th className="text-left px-6 py-3 font-semibold text-sm dark:text-white">Estado</th>
                  <th className="text-left px-6 py-3 font-semibold text-sm dark:text-white">Fecha</th>
                  <th className="text-left px-6 py-3 font-semibold text-sm dark:text-white"></th>
                </tr>
              </thead>
              <tbody>
                {deudas.map(d => {
                  const saldo = d.monto - d.monto_pagado;
                  return (
                    <tr key={d.id} className="border-b dark:border-gray-700 last:border-0">
                      <td className="px-6 py-4 text-sm font-medium dark:text-white">{d.usuario?.nombre || '—'}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{d.descripcion || '—'}</td>
                      <td className="px-6 py-4 text-sm">{formatCurrency(d.monto)}</td>
                      <td className="px-6 py-4 text-sm">{formatCurrency(d.monto_pagado)}</td>
                      <td className={`px-6 py-4 text-sm font-bold ${saldo > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                        {formatCurrency(saldo)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getColorEstado(d.estado)}`}>{d.estado}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{new Date(d.fecha_creacion).toLocaleDateString()}</td>
                      <td className="px-6 py-4">
                        <button onClick={() => descargarFactura(d.id)}
                          className="text-blue-600 dark:text-blue-400 text-sm font-medium hover:underline">
                          PDF
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
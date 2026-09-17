'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

interface Cliente {
  id: number;
  nombre: string;
  telefono?: string;
}

interface Deuda {
  id: number;
  monto: number;
  monto_pagado: number;
  descripcion?: string;
  estado: string;
}

interface Pedido {
  id: number;
  total: number;
  estado: string;
}

export default function VentasDashboard() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [pedidosPendientes, setPedidosPendientes] = useState<Pedido[]>([]);
  const [deudas, setDeudas] = useState<Deuda[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/clientes').catch(() => ({ data: [] })),
      api.get('/pedidos?estado=pendiente').catch(() => ({ data: [] })),
      api.get('/deudas').catch(() => ({ data: [] })),
    ])
      .then(([clientesRes, pedidosRes, deudasRes]) => {
        setClientes(Array.isArray(clientesRes.data) ? clientesRes.data : []);
        setPedidosPendientes(Array.isArray(pedidosRes.data) ? pedidosRes.data : []);
        setDeudas(Array.isArray(deudasRes.data) ? deudasRes.data : []);
      })
      .finally(() => setCargando(false));
  }, []);

  const montoPorCobrar = deudas
    .filter(d => d.estado !== 'pagado')
    .reduce((s, d) => s + (Number(d.monto) - Number(d.monto_pagado)), 0);

  const deudasActivas = deudas.filter(d => d.estado !== 'pagado').length;

  const montoPendientePedidos = pedidosPendientes.reduce((s, p) => s + Number(p.total || 0), 0);

  if (cargando) {
    return (
      <p className="text-center py-20 text-gray-500 dark:text-gray-400">
        Cargando panel...
      </p>
    );
  }

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-8 py-10">
      <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold dark:text-white">Mis ventas</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Resumen de tu actividad comercial
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-2xl p-6">
          <p className="text-blue-600 dark:text-blue-400 font-medium mb-1 text-sm">Clientes registrados</p>
          <p className="text-4xl font-bold text-blue-700 dark:text-blue-300">{clientes.length}</p>
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-2xl p-6">
          <p className="text-yellow-600 dark:text-yellow-400 font-medium mb-1 text-sm">Pedidos pendientes</p>
          <p className="text-4xl font-bold text-yellow-700 dark:text-yellow-300">{pedidosPendientes.length}</p>
          <p className="text-xs text-yellow-500 dark:text-yellow-400 mt-2">{formatCurrency(montoPendientePedidos)} en pedidos</p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-2xl p-6">
          <p className="text-green-600 dark:text-green-400 font-medium mb-1 text-sm">Monto por cobrar</p>
          <p className="text-2xl font-bold text-green-700 dark:text-green-300 mt-2">
            {formatCurrency(montoPorCobrar)}
          </p>
          <p className="text-xs text-green-500 dark:text-green-400 mt-2">En deudas registradas</p>
        </div>
        <div className="bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800 rounded-2xl p-6">
          <p className="text-purple-600 dark:text-purple-400 font-medium mb-1 text-sm">Deudas activas</p>
          <p className="text-4xl font-bold text-purple-700 dark:text-purple-300">{deudasActivas}</p>
          <p className="text-xs text-purple-500 dark:text-purple-400 mt-2">{deudas.length} deudas registradas</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link
          href="/ventas/clientes"
          className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl p-6 hover:shadow-md dark:hover:shadow-gray-900/50 transition-shadow"
        >
          <h2 className="text-xl font-bold mb-2 dark:text-white">🧑‍🤝‍🧑 Clientes</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Registrá clientes con sus datos y días de visita.
          </p>
        </Link>
        <Link
          href="/ventas/pedidos"
          className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl p-6 hover:shadow-md dark:hover:shadow-gray-900/50 transition-shadow"
        >
          <h2 className="text-xl font-bold mb-2 dark:text-white">📦 Pedidos</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Consultá y actualizá el estado de tus pedidos.
          </p>
        </Link>
        <Link
          href="/ventas/deudas"
          className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl p-6 hover:shadow-md dark:hover:shadow-gray-900/50 transition-shadow"
        >
          <h2 className="text-xl font-bold mb-2 dark:text-white">🧾 Deudas</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Gestioná la cobranza de tus deudas registradas.
          </p>
        </Link>
        <Link
          href="/ventas/rendimiento"
          className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl p-6 hover:shadow-md dark:hover:shadow-gray-900/50 transition-shadow"
        >
          <h2 className="text-xl font-bold mb-2 dark:text-white">📊 Mi Rendimiento</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Visualizá tus ventas de la semana y el mes con gráficas.
          </p>
        </Link>
      </div>
    </main>
  );
}
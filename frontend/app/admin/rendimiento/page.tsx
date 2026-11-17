'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Users, Truck, Target, BarChart3, Users2, Calendar, LucideIcon } from 'lucide-react';

interface RendimientoMetric {
  id: number;
  titulo: string;
  valor: string;
  cambio: number;
  icono: LucideIcon;
  color: string;
}

interface VendedorPerformance {
  id: number;
  nombre: string;
  total_ventas: number;
  promedio_ticket: number;
  total_pedidos: number;
  estado: 'alto' | 'medio' | 'bajo';
}

export default function AdminRendimiento() {
  const [metricas, setMetricas] = useState<RendimientoMetric[]>([]);
  const [vendedores, setVendedores] = useState<VendedorPerformance[]>([]);
  const [cargando, setCargando] = useState(true);
  const [periodo, setPeriodo] = useState<'dia' | 'semana' | 'mes' | 'ano'>('mes');

  const cargarDatos = async () => {
    try {
      const [resMetricas, resVendedores] = await Promise.all([
        api.get('/reportes/ventas-personal-por-dia', {
          params: { periodo: periodo, desde: '', hasta: '' },
        }),
        api.get('/pedidos/ventas/personal'),
      ]);
      setMetricas(resMetricas.data || []);
      setVendedores(resVendedores.data || []);
    } catch (err) {
      console.error('Error al cargar rendimiento:', err);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [periodo]);

  const coloresCambio = {
    positivo: 'text-prolimal-green-600 dark:text-prolimal-green-300',
    negativo: 'text-prolimal-red-600 dark:text-prolimal-red-300',
    neutral: 'text-prolimal-teal-600 dark:text-prolimal-teal-300',
  };

  return (
    <main className="prolimal-page mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:py-12">
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <h1 className="prolimal-display text-2xl tracking-[-0.04em] text-prolimal-ink-900 dark:text-prolimal-sand-50">
          Rendimiento
        </h1>
        <p className="text-sm font-medium text-prolimal-ink-500 dark:text-prolimal-ink-200">
          Control de ventas y performance por vendedor
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8">
        {metricas.map((metric) => (
          <motion.div
            key={metric.id}
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.2 }}
            className={`rounded-[2rem] border p-6 transition-colors ${
              metric.color
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="prolimal-display text-sm font-bold text-prolimal-ink-900 dark:text-prolimal-sand-50">
                  {metric.titulo}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-prolimal-ink-400 dark:text-prolimal-ink-300">
                  {metric.valor}
                </span>
                <span className={`text-[10px] font-medium ${coloresCambio.neutral}`}>
                  {metric.cambio}%
                </span>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-center h-6 w-6 rounded-full bg-prolimal-teal-100 text-prolimal-teal-700 dark:bg-prolimal-teal-900/30 dark:text-prolimal-teal-200">
              <Users className="h-3 w-3" />
            </div>
          </motion.div>
        ))}
      </div>

      <div  className="lg:grid-cols-2 gap-6">
        {/* Métricas principales */}
        <motion.div
          whileHover={{ y: -4 }}
          transition={{ duration: 0.2 }}
          className="rounded-[2rem] border border-prolimal-ink-900/10 bg-card p-6 shadow-[0_24px_60px_-46px_rgba(11,37,32,0.45)] dark:border-prolimal-sand-100/10 dark:bg-card-dark"
        >
          <p className="prolimal-eyebrow">Ventas por Vendedor</p>
          <h2 className="prolimal-display mt-2 text-xl tracking-[-0.04em] text-prolimal-ink-900 dark:text-prolimal-sand-50">
            Top Performance
          </h2>
          <div className="mt-4 space-y-3">
            {vendedores.map((v) => (
              <div key={v.id} className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-prolimal-teal-400" />
                  <span className="flex-1 truncate text-sm font-medium text-prolimal-ink-800 dark:text-prolimal-sand-50">
                    {v.nombre}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-prolimal-ink-500 dark:text-prolimal-ink-200">
                    Pedidos: {v.total_pedidos}
                  </p>
                  <p className="text-sm font-bold text-prolimal-teal-700 dark:text-prolimal-teal-300">
                    ${formatCurrency(v.promedio_ticket)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Gráfico de barras simplificado */}
        <motion.div
          whileHover={{ y: -4 }}
          transition={{ duration: 0.2 }}
          className="rounded-[2rem] border border-prolimal-ink-900/10 bg-card p-6 shadow-[0_24px_60px_-46px_rgba(11,37,32,0.45)] dark:border-prolimal-sand-100/10 dark:bg-card-dark"
        >
          <p className="prolimal-eyebrow">Ventas por Período</p>
          <h2 className="prolimal-display mt-2 text-xl tracking-[-0.04em] text-prolimal-ink-900 dark:text-prolimal-sand-50">
            Evolución {periodo === 'dia' ? 'Diario' : periodo === 'semana' ? 'Semanal' : 'Mensual'}
          </h2>
          <div className="mt-4">
            <select
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value as any)}
              className="prolimal-input w-full rounded-2xl border border-prolimal-ink-900/15 bg-white/75 px-4 py-3 text-sm text-prolimal-ink-800 focus:outline-none focus:ring-2 focus:ring-prolimal-teal-500/20 dark:border-prolimal-sand-100/10 dark:bg-prolimal-ink-800 dark:text-prolimal-sand-50 dark:hover:border-prolimal-sand-100/30 dark:hover:text-prolimal-teal-300"
            >
              <option value="dia">Diario</option>
              <option value="semana">Semanal</option>
              <option value="mes">Mensual</option>
              <option value="ano">Anual</option>
            </select>
          </div>
          <div className="mt-4 h-64">
            {/* Placeholder for chart */}
<div className="h-full flex items-center justify-center text-prolimal-ink-400 dark:text-prolimal-ink-300">
              <BarChart3 className="h-6 w-6" />
              <span>Datos del período</span>
            </div>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
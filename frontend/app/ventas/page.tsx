'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import {
  ChevronRight,
  ClipboardList,
  Package,
  Receipt,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';

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
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="prolimal-surface px-6 py-20 text-center text-sm font-medium text-prolimal-ink-400 dark:text-prolimal-ink-300">
          Cargando panel...
        </div>
      </main>
    );
  }

  const stats = [
    { label: 'Clientes registrados', value: clientes.length, hint: 'En tu cartera', Icono: Users, tono: 'teal' },
    { label: 'Pedidos pendientes', value: pedidosPendientes.length, hint: `${formatCurrency(montoPendientePedidos)} en pedidos`, Icono: ClipboardList, tono: 'sand' },
    { label: 'Monto por cobrar', value: formatCurrency(montoPorCobrar), hint: 'En deudas registradas', Icono: Wallet, tono: 'coral' },
    { label: 'Deudas activas', value: deudasActivas, hint: `${deudas.length} deudas registradas`, Icono: Receipt, tono: 'ink' },
  ] as const;

  const accesos = [
    { href: '/ventas/clientes', titulo: 'Clientes', desc: 'Registrá clientes con sus datos y días de visita.', Icono: Users },
    { href: '/ventas/pedidos', titulo: 'Pedidos', desc: 'Consultá y actualizá el estado de tus pedidos.', Icono: Package },
    { href: '/ventas/deudas', titulo: 'Deudas', desc: 'Gestioná la cobranza de tus deudas registradas.', Icono: Receipt },
    { href: '/ventas/rendimiento', titulo: 'Mi Rendimiento', desc: 'Visualizá tus ventas de la semana y el mes.', Icono: TrendingUp },
  ];

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-12">
      <section className="mb-8">
        <p className="prolimal-eyebrow">Comercial</p>
        <h2 className="prolimal-display mt-2 text-3xl tracking-[-0.04em] text-prolimal-ink-900 dark:text-prolimal-sand-50">
          Mis ventas
        </h2>
        <p className="mt-2 max-w-xl text-sm font-medium leading-relaxed text-prolimal-ink-500 dark:text-prolimal-ink-200">
          Resumen de tu actividad comercial.
        </p>
      </section>

      <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ label, value, hint, Icono, tono }) => (
          <div
            key={label}
            className="rounded-[2rem] border border-prolimal-ink-900/10 bg-card p-5 shadow-[0_24px_60px_-46px_rgba(11,37,32,0.45)] dark:border-prolimal-sand-100/10 dark:bg-card-dark"
          >
            <span
              className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
                tono === 'teal'
                  ? 'bg-prolimal-teal-100 text-prolimal-teal-700 dark:bg-prolimal-teal-900/30 dark:text-prolimal-teal-300'
                  : tono === 'coral'
                    ? 'bg-prolimal-coral-100 text-prolimal-coral-700 dark:bg-prolimal-coral-900/25 dark:text-prolimal-coral-300'
                    : tono === 'sand'
                      ? 'bg-prolimal-sand-200 text-prolimal-sand-800 dark:bg-prolimal-sand-900/30 dark:text-prolimal-sand-200'
                      : 'bg-prolimal-ink-100 text-prolimal-ink-700 dark:bg-prolimal-ink-800 dark:text-prolimal-ink-200'
              }`}
            >
              <Icono className="h-4 w-4" />
            </span>
            <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.16em] text-prolimal-ink-400 dark:text-prolimal-ink-300">{label}</p>
            <p className="mt-1 text-3xl font-extrabold tracking-[-0.05em] text-prolimal-ink-900 dark:text-prolimal-sand-50">{value}</p>
            <p className="mt-1 text-xs font-medium text-prolimal-ink-400 dark:text-prolimal-ink-300">{hint}</p>
          </div>
        ))}
      </div>

      <section>
        <h3 className="mb-4 text-sm font-extrabold uppercase tracking-[0.14em] text-prolimal-ink-600 dark:text-prolimal-ink-200">
          Accesos rápidos
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {accesos.map(({ href, titulo, desc, Icono }) => (
            <Link
              key={href}
              href={href}
              className="group rounded-[2rem] border border-prolimal-ink-900/10 bg-card p-6 shadow-[0_24px_60px_-46px_rgba(11,37,32,0.45)] transition-all hover:-translate-y-0.5 hover:border-prolimal-teal-700/30 dark:border-prolimal-sand-100/10 dark:bg-card-dark"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-prolimal-ink-900 text-prolimal-sand-50 dark:bg-prolimal-teal-400 dark:text-prolimal-ink-900">
                  <Icono className="h-4 w-4" />
                </span>
                <ChevronRight className="h-4 w-4 text-prolimal-ink-300 transition-transform group-hover:translate-x-0.5 dark:text-prolimal-ink-300" />
              </div>
              <h4 className="prolimal-display mt-5 text-xl tracking-[-0.03em] text-prolimal-ink-900 dark:text-prolimal-sand-50">
                {titulo}
              </h4>
              <p className="mt-2 text-sm font-medium leading-relaxed text-prolimal-ink-400 dark:text-prolimal-ink-300">
                {desc}
              </p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
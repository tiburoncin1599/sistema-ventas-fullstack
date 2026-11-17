'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { motion } from 'framer-motion';
import { AlertTriangle, Boxes, ClipboardList, Search, Tags, Wallet, Plus, Minus, CheckCircle, Edit } from 'lucide-react';

interface ItemInventario {
  id: number;
  producto_id: number;
  cantidad: number;
  producto: { nombre: string; precio: number; categoria?: { nombre: string }; tamano?: string };
  esBajo: boolean;
}

interface Deuda {
  id: number;
  usuario_id: number;
  monto: number;
  monto_pagado: number;
  descripcion: string;
  estado: string;
  usuario: { nombre: string; rol: string };
}

interface Pedido {
  id: number;
  total: number;
  estado: string;
  creado_en: string;
  usuario: { nombre: string };
}

interface Vendedor {
  id: number;
  nombre: string;
  email?: string;
}

// State simple para el modal - sin tipos anidados complejos
interface ModalState {
  abierto: boolean;
  modo: 'entrada' | 'salida' | 'ajuste';
  producto_id: number;
  cantidad: number;
  observacion: string;
}

function getStockColor(cantidad: number) {
  if (cantidad <= 10) return 'text-prolimal-red-600 dark:text-prolimal-red-300';
  if (cantidad <= 20) return 'text-prolimal-orange-600 dark:text-prolimal-orange-300';
  return 'text-prolimal-teal-700 dark:text-prolimal-teal-300';
}

function getStockLabel(cantidad: number) {
  if (cantidad <= 10) return 'Stock bajo';
  if (cantidad <= 20) return 'Stock medio';
  return 'Stock OK';
}

export default function AdminInventario() {
  const [inventario, setInventario] = useState<ItemInventario[]>([]);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modalModo, setModalModo] = useState<'entrada' | 'salida' | 'ajuste'>('ajuste');
  const [modalCantidad, setModalCantidad] = useState(0);
  const [modalObservacion, setModalObservacion] = useState('');
  const [modalError, setModalError] = useState<string>('');
  const [modalCargando, setModalCargando] = useState(false);
  const [pendientes, setPendientes] = useState<Pedido[]>([]);
  const [deudas, setDeudas] = useState<Deuda[]>([]);
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [ventasPersonal, setVentasPersonal] = useState<{ usuario_id: number; usuario_nombre: string; total_pedidos: number; total_vendido: number }[]>([]);
  const [asigSel, setAsigSel] = useState<Record<number, string>>({});
  const [asignandoId, setAsignandoId] = useState<number | null>(null);
  const [errorAsig, setErrorAsig] = useState('');
  const [alertasCount, setAlertasCount] = useState(0);

  useEffect(() => {
    api.get('/inventario').then(res => setInventario(res.data)).catch(() => {});
    api.get('/deudas').then(res => setDeudas(res.data)).catch(() => {});
    api.get('/pedidos').then(res => setPendientes(res.data || [])).catch(() => {});
    api.get('/pedidos/ventas/personal').then(res => setVentasPersonal(res.data || [])).catch(() => {});
    let rolActual = '';
    try {
      const u = JSON.parse(localStorage.getItem('usuario') || 'null');
      if (u?.rol) rolActual = u.rol;
    } catch {}
    if (rolActual === 'admin' || rolActual === 'inventario') {
      api.get('/pedidos', { params: { sinVendedor: true, limit: 50 } }).then(res => setPendientes(res.data || [])).catch(() => {});
      api.get('/usuarios/vendedores').then(res => setVendedores(res.data || [])).catch(() => {});
    }
  }, []);

  // Notificación automática: productos con <= 10 unidades
  useEffect(() => {
    setAlertasCount(inventario.filter(i => i.cantidad <= 10).length);
  }, [inventario]);

  // Contenido del grid de productos - SOLO botón Ajustar
  const productosGrid = (
    <div className="rounded-[2rem] border border-prolimal-innk-900/10 bg-card p-6 shadow-[0_24px_60px_-46px_rgba(11,37,32,0.45)] dark:border-prolimal-sand-100/10 dark:bg-card-dark">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="prolimal-eyebrow">Stock actual</p>
          <p className="mt-2 max-w-xl text-sm font-medium leading-relaxed text-prolimal-innk-500 dark:text-prolimal-innk-200">
            Todo lo que necesitás para gestionar productos, pedidos y personas desde un solo lugar.
          </p>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-prolimal-innk-900/10 bg-card px-4 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-prolimal-innk-500 dark:border-prolimal-sand-100/10 dark:bg-card-dark dark:text-prolimal-innk-200">
          <span className="h-1.5 w-1.5 rounded-full bg-prolimal-teal-500" />
          {inventario.length} productos
        </span>
      </div>
      <div className="relative mb-5 sm:max-w-xs">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-prolimal-innk-400 dark:text-prolimal-innk-300" />
        <input
          type="text"
          value={''}
          onChange={(e) => {}}
          placeholder="Buscar producto o categoría"
          className="prolimal-search-input"
        />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {inventario.map(item => {
          const esBajo = item.cantidad <= 10;
          return (
            <motion.div
              key={item.id}
              whileHover={{ y: -2 }}
              transition={{ duration: 0.2 }}
              className="rounded-2xl border border-prolimal-innk-900/10 bg-prolimal-sand-50/60 p-4 transition-colors hover:border-prolimal-teal-500/40 dark:border-prolimal-sand-100/10 dark:bg-prolimal-innk-800/60 dark:hover:border-prolimal-teal-500/30"
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-prolimal-teal-100 text-sm font-extrabold text-prolimal-teal-800 dark:bg-prolimal-teal-900/30 dark:text-prolimal-teal-200">
                  {item.producto?.nombre?.charAt(0) || '-'}
                </span>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] ${esBajo ? 'bg-prolimal-red-100 text-prolimal-red-700 dark:bg-prolimal-red-900/30 dark:text-prolimal-red-300' : 'bg-prolimal-teal-100 text-prolimal-teal-700 dark:bg-prolimal-teal-900/30 dark:text-prolimal-teal-300'}`}>
                  {item.cantidad > 0 ? item.cantidad : 'Sin stock'}
                </span>
              </div>
              <p className="truncate text-sm font-extrabold text-prolimal-innk-800 dark:text-prolimal-sand-50">
                {item.producto?.nombre}
              </p>
              <p className="mt-0.5 text-[11px] font-medium text-prolimal-innk-400 dark:text-prolimal-innk-300">
                {item.producto?.categoria?.nombre || 'Sin categoría'}{item.producto?.tamano ? ` · ${item.producto.tamano}` : ''}
              </p>
              <div className="mt-3 flex items-end justify-between border-t border-prolimal-innk-900/5 pt-3 dark:border-prolimal-sand-100/10">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-prolimal-innk-400 dark:text-prolimal-innk-300">Stock</p>
                  <p className="text-2xl font-extrabold tracking-[-0.04em] text-prolimal-innk-900 dark:text-prolimal-sand-50">
                    {item.cantidad}
                  </p>
                </div>
                <p className="text-sm font-extrabold text-prolimal-teal-700 dark:text-prolimal-teal-300">{formatCurrency(item.producto?.precio)}</p>
              </div>
              <div className="mt-2 flex gap-2">
                {/* SOLO botón Ajustar - permite entrada, salida o ajuste */}
                <button
                  onClick={() => {
                    setModalAbierto(true);
                    setModalModo('ajuste');
                    setModalCantidad(0);
                    setModalObservacion('');
                  }}
                  className="prolimal-btn-primary text-[10px] px-4 py-2 rounded-full border border-prolimal-teal-400 bg-prolimal-teal-100 text-prolimal-teal-800 transition-colors hover:bg-prolimal-teal-200 dark:border-prolimal-teal-600 dark:bg-prolimal-innk-800/70 dark:text-prolimal-teal-200 dark:hover:bg-prolimal-teal-300 flex items-center gap-2"
                  title="Registrar movimiento de stock (entrada/salida/ajuste)"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
                  Ajustar
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );

  // Manejar abrir modal
  const handleModalOpen = (modo: 'entrada' | 'salida' | 'ajuste') => {
    setModalAbierto(true);
    setModalModo(modo);
    setModalCantidad(0);
    setModalObservacion('');
  };

  const handleModalClose = () => {
    setModalAbierto(false);
  };

  const handleModalSubmit = async () => {
    if (!modalAbierto) return;
    setModalCargando(true);
    setModalError('');

    try {
      const cuerpo: any = {
        producto_id: 0, // se seteará abajo
        tipo: modalModo,
        cantidad: modalCantidad,
        motivo: modalObservacion,
      };

      let respuesta: any;

      if (modalModo === 'entrada') {
        respuesta = await api.post('/inventario-movimientos/entrada', cuerpo);
      } else if (modalModo === 'salida') {
        // Esta información vendría del item seleccionado en el render
        respuesta = await api.post('/inventario-movimientos/salida', cuerpo);
      } else if (modalModo === 'ajuste') {
        respuesta = await api.post('/inventario-movimientos/ajuste', cuerpo);
      }

      setModalAbierto(false);
      setModalCargando(false);
    } catch (err: any) {
      setModalError(err.response?.data?.message || 'Error al procesar el movimiento');
      setModalCargando(false);
    }
  };

  return (
    <div className="pb-10">
      <section className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="prolimal-eyebrow">Operaciones</p>
          <h2 className="prolimal-display mt-2 text-3xl tracking-[-0.04em] text-prolimal-innk-900 dark:text-prolimal-sand-50">
            Inventario
          </h2>
          <p className="mt-2 max-w-xl text-sm font-medium leading-relaxed text-prolimal-innk-500 dark:text-prolimal-innk-200">
            {inventario.length} productos en stock · {inventario.reduce((s, i) => s + i.cantidad, 0)} unidades registradas.
          </p>
        </div>
        {alertasCount > 0 && (
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-prolimal-red-300/60 bg-prolimal-red-50 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-prolimal-red-700 dark:border-prolimal-red-700/40 dark:bg-prolimal-red-900/20 dark:text-prolimal-red-300">
            <AlertTriangle className="h-3.5 w-3.5" />
            {alertasCount} producto{alertasCount !== 1 ? ' con stock bajo' : ''} ({alertasCount} unidades o menos)
          </span>
        )}
      </section>

      <div className="mb-8 grid grid-cols-2 gap-4 xl:grid-cols-4">
        {[
          { label: 'Productos', value: inventario.length, Icono: Boxes, tono: 'teal' },
          { label: 'Unidades totales', value: inventario.reduce((s, i) => s + i.cantidad, 0), Icono: ClipboardList, tono: 'sand' },
          { label: 'Stock bajo', value: alertasCount, Icono: AlertTriangle, tono: 'coral' },
          { label: 'Sin categoría', value: 0, Icono: Tags, tono: 'ink' },
        ].map(({ label, value, Icono, tono }) => (
          <div
            key={label}
            className="rounded-[2rem] border border-prolimal-innk-900/10 bg-card p-5 shadow-[0_24px_60px_-46px_rgba(11,37,32,0.45)] dark:border-prolimal-sand-100/10 dark:bg-card-dark"
          >
            <span
              className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
                tono === 'teal'
                  ? 'bg-prolimal-teal-100 text-prolimal-teal-700 dark:bg-prolimal-teal-900/30 dark:text-prolimal-teal-300'
                  : tono === 'coral'
                    ? 'bg-prolimal-coral-100 text-prolimal-coral-700 dark:bg-prolimal-coral-900/25 dark:text-prolimal-coral-300'
                    : tono === 'sand'
                      ? 'bg-prolimal-sand-200 text-prolimal-sand-800 dark:bg-prolimal-sand-900/30 dark:text-prolimal-sand-200'
                      : 'bg-prolimal-innk-100 text-prolimal-innk-700 dark:bg-prolimal-innk-800 dark:text-prolimal-innk-200'
              }`}
            >
              <Icono className="h-4 w-4" />
            </span>
            <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.16em] text-prolimal-innk-400 dark:text-prolimal-innk-300">
              {label}
            </p>
            <p className="mt-1 text-3xl font-extrabold tracking-[-0.05em] text-prolimal-innk-900 dark:text-prolimal-sand-50">
              {value}
            </p>
          </div>
        ))}
      </div>

      {productosGrid}

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <section className="flex items-center justify-between gap-3 rounded-[2rem] border border-prolimal-innk-900/10 bg-card p-6 dark:border-prolimal-sand-100/10 dark:bg-card-dark">
          <div>
            <p className="prolimal-eyebrow">Personal</p>
            <h2 className="mt-2 text-sm font-extrabold text-prolimal-innk-800 dark:text-prolimal-sand-50">
              Deudas del personal de ventas
            </h2>
            <p className="mt-1 text-xs font-medium text-prolimal-innk-400 dark:text-prolimal-innk-300">
              {deudas.length} deudas registradas
            </p>
          </div>
          <Wallet className="h-8 w-8 text-prolimal-innk-300 dark:text-prolimal-innk-500" />
        </section>

        <section className="flex items-center justify-between gap-3 rounded-[2rem] border border-prolimal-innk-900/10 bg-card p-6 dark:border-prolimal-sand-100/10 dark:bg-card-dark">
          <div>
            <p className="prolimal-eyebrow">Movimiento</p>
            <h2 className="mt-2 text-sm font-extrabold text-prolimal-innk-800 dark:text-prolimal-sand-50">
              Últimos pedidos
            </h2>
            <p className="mt-1 text-xs font-medium text-prolimal-innk-400 dark:text-prolimal-innk-300">
              {pendientes?.length || 0} pedidos registrados
            </p>
          </div>
          <ClipboardList className="h-8 w-8 text-prolimal-innk-300 dark:text-prolimal-innk-500" />
        </section>
      </div>

      {/* Modal único para movimiento de stock */}
      {modalAbierto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-prolimal-innk-900/50 dark:bg-prolimal-innk-900/50 p-4 backdrop-blur-sm"
          onClick={() => handleModalClose()}
        >
          <div
            className="max-w-md w-full max-h-[90vh] overflow-y-auto rounded-[2rem] border border-prolimal-innk-900/10 bg-card p-6 shadow-[0_24px_60px_-46px_rgba(11,37,32,0.45)] dark:border-prolimal-sand-100/10 dark:bg-card-dark sm:p-8"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="prolimal-eyebrow">Registrar Movimiento de Stock</p>
                <h2 className="prolimal-display mt-2 text-xl tracking-[-0.04em] text-prolimal-innk-900 dark:text-prolimal-sand-50">
                  {modalModo === 'entrada' ? 'Entrada de Stock' : modalModo === 'salida' ? 'Salida de Stock' : 'Ajuste de Stock'} producto ID
                </h2>
              </div>
              <button onClick={handleModalClose} aria-label="Cerrar" className="prolimal-icon-btn h-6 w-6">
                <Minus className="h-3 w-3" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div>
                  <label className="text-xs text-prolimal-innk-500 dark:text-prolimal-innk-300 mb-1">
                    Tipo de Movimiento
                  </label>
                  <select
                    value={modalModo}
                    onChange={(e) => setModalModo(e.target.value as 'entrada' | 'salida' | 'ajuste')}
                    className="prolimal-input w-full rounded-md border border-prolimal-innk-900/15 bg-white/75 text-prolimal-innk-800 dark:border-prolimal-sand-100/10 dark:bg-prolimal-innk-800 dark:text-prolimal-sand-50 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-prolimal-teal-500/20"
                  >
                    <option value="entrada">Entrada</option>
                    <option value="salida">Salida</option>
                    <option value="ajuste">Ajuste</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-prolimal-innk-500 dark:text-prolimal-innk-300 mb-1">
                    Cantidad
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={modalCantidad}
                    onChange={(e) => setModalCantidad(Number(e.target.value))}
                    className="prolimal-input w-full rounded-md border border-prolimal-innk-900/15 bg-white/75 text-prolimal-innk-800 dark:border-prolimal-sand-100/10 dark:bg-prolimal-innk-800 dark:text-prolimal-sand-50 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-prolimal-teal-500/20"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-prolimal-innk-500 dark:text-prolimal-innk-300 mb-1">
                  Observación / Motivo
                </label>
                <textarea
                  rows={3}
                  value={modalObservacion}
                  onChange={(e) => setModalObservacion(e.target.value)}
                  className="prolimal-input w-full rounded-md border border-prolimal-innk-900/15 bg-white/75 text-prolimal-innk-800 dark:border-prolimal-sand-100/10 dark:bg-prolimal-innk-800 dark:text-prolimal-sand-50 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-prolimal-teal-500/20 resize-none"
                  placeholder="Ej: Recibido proveedor, Ajuste por inventario, Venta No.123"
                  required
                ></textarea>
              </div>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <button onClick={handleModalClose} className="prolimal-btn-secondary flex-1">
                Cancelar
              </button>
              <button onClick={handleModalSubmit} className="prolimal-btn-primary flex-1">
                Registrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
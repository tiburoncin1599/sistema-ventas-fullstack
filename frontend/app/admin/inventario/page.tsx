'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { Categoria } from '@/lib/productos';
import { formatCurrency } from '@/lib/utils';
import { useValidacionFormulario } from '@/lib/hooks/use-validacion-formulario';
import {
  enteroMinimo,
  mensajeGeneral,
  numero,
  numeroMinimo,
  primero,
  requerido,
  type ErroresFormulario,
} from '@/lib/validacion';
import { AvisoErrorFormulario, CampoError, claseCampo } from '@/components/ui/CampoError';
import { motion } from 'framer-motion';
import { AlertTriangle, Boxes, ClipboardList, Search, Tags, Wallet, Plus, Minus, CheckCircle, Edit, MessageCircle } from 'lucide-react';
import ToastNotificacion, { type ToastDatos } from '@/components/ui/ToastNotificacion';

interface ItemInventario {
  id: number;
  producto_id: number;
  cantidad: number;
  cantidad_minima: number;
  producto: { nombre: string; precio: number; categoria?: { nombre: string }; tamano?: string };
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

type TipoMovimiento = 'entrada' | 'salida' | 'ajuste';

interface FormMovimiento {
  producto_id: number;
  tipo: TipoMovimiento;
  cantidad: string;
  motivo: string;
}

const MOVIMIENTO_INICIAL: FormMovimiento = {
  producto_id: 0,
  tipo: 'ajuste',
  cantidad: '1',
  motivo: '',
};

// Valores aceptados por `RegistrarMovimientoDto` (`IsIn`).
const TIPOS_PERMITIDOS = ['entrada', 'salida', 'ajuste', 'devolucion'];
const CAMPOS_MOVIMIENTO: Array<keyof FormMovimiento | '_general'> = [
  'producto_id',
  'tipo',
  'cantidad',
  'motivo',
  '_general',
];
const ALIAS_MOVIMIENTO = {
  productoid: 'producto_id',
  producto_id: 'producto_id',
  producto: 'producto_id',
  tipo: 'tipo',
  cantidad: 'cantidad',
  motivo: 'motivo',
  observacion: 'motivo',
} as const;

/** Espejo de `RegistrarMovimientoDto`: producto_id ≥ 1, tipo permitido, cantidad ≥ 0. */
function validarMovimiento(form: FormMovimiento): ErroresFormulario<FormMovimiento> {
  const errores: ErroresFormulario<FormMovimiento> = {};
  const productoId = primero(
    requerido(form.producto_id || '', 'Seleccioná un producto desde el listado'),
    enteroMinimo(form.producto_id, 1, 'El producto debe ser un entero mayor o igual a 1'),
  );
  if (productoId) errores.producto_id = productoId;

  const tipo = primero(
    requerido(form.tipo, 'Seleccioná el tipo de movimiento'),
    TIPOS_PERMITIDOS.includes(form.tipo) ? undefined : 'Tipo de movimiento no válido',
  );
  if (tipo) errores.tipo = tipo;

  const cantidad = primero(
    requerido(form.cantidad, 'Ingresá la cantidad'),
    numero(form.cantidad, 'Ingresá una cantidad válida'),
    numeroMinimo(form.cantidad, 0, 'La cantidad no puede ser negativa'),
  );
  if (cantidad) errores.cantidad = cantidad;

  return errores;
}

/** El umbral es el `cantidad_minima` del producto; el nivel medio es su doble. */
function getStockColor(cantidad: number, minimo: number) {
  if (cantidad <= minimo) return 'text-prolimal-red-600 dark:text-prolimal-red-300';
  if (cantidad <= minimo * 2) return 'text-prolimal-orange-600 dark:text-prolimal-orange-300';
  return 'text-prolimal-teal-700 dark:text-prolimal-teal-300';
}

function getStockLabel(cantidad: number, minimo: number) {
  if (cantidad <= minimo) return 'Stock bajo';
  if (cantidad <= minimo * 2) return 'Stock medio';
  return 'Stock OK';
}

export default function AdminInventario() {
  const [inventario, setInventario] = useState<ItemInventario[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('all');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [formMovimiento, setFormMovimiento] = useState<FormMovimiento>(MOVIMIENTO_INICIAL);
  const [modalProductoNombre, setModalProductoNombre] = useState('');
  const [modalCargando, setModalCargando] = useState(false);

  const {
    errores,
    tocados,
    enviado,
    errorGeneral,
    setErrorGeneral,
    validarCampo,
    validarTodo,
    aplicarErroresBackend,
    reiniciar,
  } = useValidacionFormulario<FormMovimiento>(validarMovimiento);

  const errorDe = (campo: keyof FormMovimiento) =>
    enviado || tocados[campo] ? errores[campo] : undefined;
  const [pendientes, setPendientes] = useState<Pedido[]>([]);
  const [deudas, setDeudas] = useState<Deuda[]>([]);
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [ventasPersonal, setVentasPersonal] = useState<{ usuario_id: number; usuario_nombre: string; total_pedidos: number; total_vendido: number }[]>([]);
  const [asigSel, setAsigSel] = useState<Record<number, string>>({});
  const [asignandoId, setAsignandoId] = useState<number | null>(null);
  const [errorAsig, setErrorAsig] = useState('');
  const [alertasCount, setAlertasCount] = useState(0);
  const [enviandoAlerta, setEnviandoAlerta] = useState(false);
  const [toast, setToast] = useState<ToastDatos | null>(null);
  const cerrarToast = useCallback(() => setToast(null), []);

  useEffect(() => {
    api.get('/inventario', { params: { limit: 100 } }).then(res => setInventario(res.data)).catch(() => {});
    api.get('/categorias', { params: { limit: 100 } }).then(res => setCategorias(res.data || [])).catch(() => {});
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

  // Notificación automática: productos en o por debajo de su cantidad mínima.
  useEffect(() => {
    setAlertasCount(
      inventario.filter((i) => i.cantidad <= i.cantidad_minima).length,
    );
  }, [inventario]);

  const inventarioVisible = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const nombreCategoria = categorias.find(
      (c) => c.id === Number(categoriaFiltro),
    )?.nombre;
    return inventario.filter((item) => {
      const texto = `${item.producto?.nombre || ''} ${item.producto?.categoria?.nombre || ''}`.toLowerCase();
      const coincideTexto = !q || texto.includes(q);
      const coincideCategoria =
        categoriaFiltro === 'all' ||
        (categoriaFiltro === 'sin'
          ? !item.producto?.categoria
          : item.producto?.categoria?.nombre === nombreCategoria);
      return coincideTexto && coincideCategoria;
    });
  }, [inventario, categorias, busqueda, categoriaFiltro]);

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
      <div className="relative mb-5 flex flex-col gap-3 sm:max-w-md">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-prolimal-innk-400 dark:text-prolimal-innk-300" />
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar producto o categoría"
          className="prolimal-search-input"
        />
        <select
          aria-label="Filtrar por categoría"
          value={categoriaFiltro}
          onChange={(e) => setCategoriaFiltro(e.target.value)}
          className="prolimal-input sm:w-56"
        >
          <option value="all">Todas las categorías</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
          <option value="sin">Sin categoría</option>
        </select>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {inventarioVisible.map(item => {
          const minimo = item.cantidad_minima;
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
                <span className={`rounded-full bg-prolimal-sand-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] dark:bg-prolimal-ink-800 ${getStockColor(item.cantidad, minimo)}`}>
                  {getStockLabel(item.cantidad, minimo)}
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
                  onClick={() => handleModalOpen('ajuste', item)}
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

  // Manejar abrir modal: guardamos el producto de la fila para no enviar id 0.
  const handleModalOpen = (
    modo: TipoMovimiento,
    item?: ItemInventario,
  ) => {
    reiniciar();
    setFormMovimiento({
      producto_id: item?.producto_id ?? 0,
      tipo: modo,
      // En 'ajuste' la cantidad es el NUEVO stock; en entrada/salida es un delta.
      cantidad: String(modo === 'ajuste' ? Math.max(item?.cantidad ?? 1, 1) : 1),
      motivo: '',
    });
    setModalProductoNombre(item?.producto?.nombre ?? '');
    setModalAbierto(true);
  };

  const handleModalClose = () => {
    reiniciar();
    setModalAbierto(false);
  };

  const handleModalSubmit = async () => {
    if (!modalAbierto) return;
    if (!validarTodo(formMovimiento)) return;

    setModalCargando(true);

    try {
      const cuerpo = {
        producto_id: formMovimiento.producto_id,
        tipo: formMovimiento.tipo,
        cantidad: Number(formMovimiento.cantidad),
        motivo: formMovimiento.motivo.trim(),
      };

      const rutas = {
        entrada: '/inventario-movimientos/entrada',
        salida: '/inventario-movimientos/salida',
        ajuste: '/inventario-movimientos/ajuste',
      } as const;

      await api.post(rutas[formMovimiento.tipo], cuerpo);

      // Refrescamos el stock para reflejar el movimiento sin recargar la página.
      const res = await api.get('/inventario');
      setInventario(res.data);
      handleModalClose();
    } catch (err: unknown) {
      aplicarErroresBackend(err, CAMPOS_MOVIMIENTO, ALIAS_MOVIMIENTO);
      setErrorGeneral(mensajeGeneral(err, 'No se pudo registrar el movimiento. Revisá los datos e intentá nuevamente.'));
    } finally {
      setModalCargando(false);
    }
  };

  const notificarStockBajo = async () => {
    const ventana = window.open('', '_blank');
    if (ventana) ventana.opener = null;

    setEnviandoAlerta(true);
    try {
      const { data } = await api.post('/notificaciones/whatsapp/alerta-stock', {});
      if (data?.urlWhatsapp) {
        if (ventana) ventana.location.href = data.urlWhatsapp;
        else window.open(data.urlWhatsapp, '_blank', 'noopener,noreferrer');
      } else {
        ventana?.close();
      }
      const fallo = data?.registro?.estado === 'ERROR';
      setToast({
        id: Date.now(),
        tipo: fallo ? 'error' : 'exito',
        mensaje: fallo
          ? data?.error || 'No se pudo enviar la alerta.'
          : data?.modo === 'LINK'
            ? 'Enlace de WhatsApp abierto. Alerta registrada.'
            : 'Alerta de stock enviada por WhatsApp.',
      });
    } catch {
      ventana?.close();
      setToast({
        id: Date.now(),
        tipo: 'error',
        mensaje: 'No se pudo generar la alerta de stock.',
      });
    } finally {
      setEnviandoAlerta(false);
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
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-prolimal-red-300/60 bg-prolimal-red-50 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-prolimal-red-700 dark:border-prolimal-red-700/40 dark:bg-prolimal-red-900/20 dark:text-prolimal-red-300">
              <AlertTriangle className="h-3.5 w-3.5" />
              {alertasCount} producto{alertasCount !== 1 ? 's' : ''} con stock en o por debajo de su mínimo
            </span>
            <button
              onClick={notificarStockBajo}
              disabled={enviandoAlerta}
              className="inline-flex items-center gap-2 rounded-full bg-prolimal-teal-700 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-white transition-colors hover:bg-prolimal-ink-900 disabled:opacity-60 dark:bg-prolimal-teal-400 dark:text-prolimal-ink-900"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              {enviandoAlerta ? 'Enviando...' : 'Notificar Stock Bajo por WhatsApp'}
            </button>
          </div>
        )}
        <Link
          href="/admin/kardex"
          prefetch={false}
          className="inline-flex w-fit items-center gap-2 rounded-full border border-prolimal-innk-900/10 bg-card px-4 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-prolimal-innk-500 transition-colors hover:bg-prolimal-sand-100 dark:border-prolimal-sand-100/10 dark:bg-card-dark dark:text-prolimal-innk-200"
        >
          <ClipboardList className="h-3.5 w-3.5" />
          Ver Kardex
        </Link>
      </section>

      <div className="mb-8 grid grid-cols-2 gap-4 xl:grid-cols-4">
        {[
          { label: 'Productos', value: inventario.length, Icono: Boxes, tono: 'teal' },
          { label: 'Unidades totales', value: inventario.reduce((s, i) => s + i.cantidad, 0), Icono: ClipboardList, tono: 'sand' },
          { label: 'Stock bajo', value: alertasCount, Icono: AlertTriangle, tono: 'coral' },
          {
            label: 'Sin categoría',
            value: inventario.filter((i) => !i.producto?.categoria).length,
            Icono: Tags,
            tono: 'ink',
          },
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
                  {formMovimiento.tipo === 'entrada' ? 'Entrada de Stock' : formMovimiento.tipo === 'salida' ? 'Salida de Stock' : 'Ajuste de Stock'}
                </h2>
                {modalProductoNombre && (
                  <p className="mt-1 text-xs font-semibold text-prolimal-teal-700 dark:text-prolimal-teal-300">
                    Producto: {modalProductoNombre}
                  </p>
                )}
              </div>
              <button onClick={handleModalClose} aria-label="Cerrar" className="prolimal-icon-btn h-6 w-6">
                <Minus className="h-3 w-3" />
              </button>
            </div>

            <AvisoErrorFormulario mensaje={errorGeneral} />

            <div className="mt-4 space-y-3">
              <div>
                <label htmlFor="movimiento-producto" className="text-xs text-prolimal-innk-500 dark:text-prolimal-innk-300 mb-1 block">
                  Producto *
                </label>
                <input
                  id="movimiento-producto"
                  type="text"
                  readOnly
                  value={formMovimiento.producto_id ? `${modalProductoNombre} (#${formMovimiento.producto_id})` : ''}
                  aria-invalid={Boolean(errorDe('producto_id'))}
                  aria-describedby={errorDe('producto_id') ? 'movimiento-producto-error' : undefined}
                  className={claseCampo(Boolean(errorDe('producto_id')), 'prolimal-input w-full py-2 px-3 focus:outline-none focus:ring-2')}
                />
                <CampoError id="movimiento-producto-error" mensaje={errorDe('producto_id')} />
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div>
                  <label htmlFor="movimiento-tipo" className="text-xs text-prolimal-innk-500 dark:text-prolimal-innk-300 mb-1 block">
                    Tipo de Movimiento *
                  </label>
                  <select
                    id="movimiento-tipo"
                    value={formMovimiento.tipo}
                    onChange={(e) => {
                      const nuevo = { ...formMovimiento, tipo: e.target.value as TipoMovimiento };
                      setFormMovimiento(nuevo);
                      validarCampo('tipo', nuevo);
                    }}
                    aria-invalid={Boolean(errorDe('tipo'))}
                    aria-describedby={errorDe('tipo') ? 'movimiento-tipo-error' : undefined}
                    className={claseCampo(Boolean(errorDe('tipo')), 'prolimal-input w-full py-2 px-3 focus:outline-none focus:ring-2')}
                  >
                    <option value="entrada">Entrada</option>
                    <option value="salida">Salida</option>
                    <option value="ajuste">Ajuste</option>
                  </select>
                  <CampoError id="movimiento-tipo-error" mensaje={errorDe('tipo')} />
                </div>
                <div>
                  <label htmlFor="movimiento-cantidad" className="text-xs text-prolimal-innk-500 dark:text-prolimal-innk-300 mb-1 block">
                    {formMovimiento.tipo === 'ajuste' ? 'Nuevo stock' : 'Cantidad'} *
                  </label>
                  <input
                    id="movimiento-cantidad"
                    type="number"
                    min={0}
                    value={formMovimiento.cantidad}
                    onChange={(e) => {
                      const nuevo = { ...formMovimiento, cantidad: e.target.value };
                      setFormMovimiento(nuevo);
                      validarCampo('cantidad', nuevo);
                    }}
                    aria-invalid={Boolean(errorDe('cantidad'))}
                    aria-describedby={errorDe('cantidad') ? 'movimiento-cantidad-error' : undefined}
                    className={claseCampo(Boolean(errorDe('cantidad')), 'prolimal-input w-full py-2 px-3 focus:outline-none focus:ring-2')}
                  />
                  <CampoError id="movimiento-cantidad-error" mensaje={errorDe('cantidad')} />
                </div>
              </div>
              <div>
                <label htmlFor="movimiento-motivo" className="text-xs text-prolimal-innk-500 dark:text-prolimal-innk-300 mb-1 block">
                  Observación / Motivo
                </label>
                <textarea
                  id="movimiento-motivo"
                  rows={3}
                  value={formMovimiento.motivo}
                  onChange={(e) => {
                    const nuevo = { ...formMovimiento, motivo: e.target.value };
                    setFormMovimiento(nuevo);
                    validarCampo('motivo', nuevo);
                  }}
                  aria-invalid={Boolean(errorDe('motivo'))}
                  aria-describedby={errorDe('motivo') ? 'movimiento-motivo-error' : undefined}
                  className={claseCampo(Boolean(errorDe('motivo')), 'prolimal-input w-full py-2 px-3 focus:outline-none focus:ring-2 resize-none')}
                  placeholder="Ej: Recibido proveedor, Ajuste por inventario, Venta No.123"
                />
                <CampoError id="movimiento-motivo-error" mensaje={errorDe('motivo')} />
              </div>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <button onClick={handleModalClose} className="prolimal-btn-secondary flex-1">
                Cancelar
              </button>
              <button
                onClick={handleModalSubmit}
                disabled={modalCargando}
                className="prolimal-btn-primary flex-1 disabled:opacity-60"
              >
                {modalCargando ? 'Registrando...' : 'Registrar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastNotificacion toast={toast} onClose={cerrarToast} />
    </div>
  );
}
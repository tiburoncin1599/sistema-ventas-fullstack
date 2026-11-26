import type { TipoPresentacion } from './conversion';

/**
 * Tipos compartidos por el detalle de pedidos de los paneles admin y ventas.
 * El backend guarda `unidades` y `factor_conversion` en cada detalle: la UI
 * sólo los lee para mostrar el consumo real de stock y el subtotal.
 */
export interface DetallePedidoEditable {
  id: number;
  cantidad: number;
  unidades?: number | null;
  factor_conversion?: number | null;
  tipo_presentacion?: TipoPresentacion | string | null;
  precio_unitario: number;
  producto: {
    id: number;
    nombre: string;
    imagen_url?: string | null;
    factor_paquete?: number | null;
  } | null;
}

export interface PedidoEditable {
  id: number;
  total: number;
  estado: string;
  creado_en: string;
  direccion_entrega?: string | null;
  notas?: string | null;
  tipo_pago?: string | null;
  /** Datos del pago (incluye la referencia Sandbox) cuando ya fue confirmado. */
  monto_pagado?: number | null;
  fecha_pago?: string | null;
  referencia_transaccion?: string | null;
  metodo_pago?: string | null;
  /** Columna `procesado_por` del pedido; null cuando aún no hay vendedor. */
  procesado_por?: number | null;
  usuario?: {
    nombre?: string;
    email?: string | null;
    telefono?: string | null;
    carnet?: string | null;
    ubicacion?: string | null;
  } | null;
  procesador?: { nombre?: string } | null;
  detalles: DetallePedidoEditable[];
}

/**
 * `GET /pedidos/:id` responde `{ ...pedido, detalles }`, mientras que las
 * mutaciones de ítems pueden responder `{ pedido, detalles }` o sólo el
 * pedido. Esta función deja una única forma de consumir cualquiera de ellas.
 */
export function normalizarPedido(data: unknown): PedidoEditable {
  const respuesta = (data && typeof data === 'object' ? data : {}) as
    Partial<PedidoEditable> & { pedido?: Partial<PedidoEditable> };
  const pedido = respuesta.pedido ?? respuesta;
  const detalles = Array.isArray(respuesta.detalles)
    ? respuesta.detalles
    : Array.isArray(pedido.detalles)
      ? pedido.detalles
      : [];

  return {
    id: Number(pedido.id ?? 0),
    total: Number(pedido.total ?? 0),
    estado: String(pedido.estado ?? ''),
    creado_en: String(pedido.creado_en ?? ''),
    direccion_entrega: pedido.direccion_entrega ?? null,
    notas: pedido.notas ?? null,
    tipo_pago: pedido.tipo_pago ?? null,
    procesado_por: pedido.procesado_por ?? null,
    usuario: pedido.usuario ?? null,
    procesador: pedido.procesador ?? null,
    detalles,
  };
}

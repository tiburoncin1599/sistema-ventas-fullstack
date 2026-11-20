/**
 * Conversión de presentaciones a unidades físicas (reglas PROLIMAC SRL).
 * Debe mantenerse sincronizado con `backend/src/pedidos/conversion-paquetes.ts`.
 */

export type TipoPresentacion = 'UNIDAD' | 'PAQUETE';

export const esPaquete = (tipo?: string | null): boolean =>
  (tipo ?? '').toString().trim().toUpperCase() === 'PAQUETE';

export const presentacionDe = (item?: {
  tipo_presentacion?: TipoPresentacion | string | null;
}): TipoPresentacion => (esPaquete(item?.tipo_presentacion) ? 'PAQUETE' : 'UNIDAD');

/**
 * Identidad de una línea del carrito/POS: el mismo producto pedido en
 * unidades y en paquetes son dos líneas independientes.
 */
export const claveLinea = (
  productoId: number,
  tipo?: TipoPresentacion | string | null,
): string => `${productoId}:${esPaquete(tipo) ? 'pack' : 'unit'}`;

/** Pedido mínimo por presentación: 3 unidades o 1 paquete. */
export const CANTIDAD_MINIMA: Record<TipoPresentacion, number> = {
  UNIDAD: 3,
  PAQUETE: 1,
};

export function normalizarNombreProducto(nombre: string): string {
  return (nombre ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** 1 paquete = N unidades según el tipo de producto. */
export function factorConversionPorNombre(nombre: string): number {
  const n = normalizarNombreProducto(nombre);

  if (n.includes('alcohol')) return 12;
  if (n.includes('antigrasa')) return 6;
  if (n.includes('limpia vidrios') || n.includes('limpiavidrios')) return 6;
  if (n.includes('limpia banos') || n.includes('limpiabanos')) return 6;
  if (n.includes('lavavajillas')) return 6;
  if (n.includes('lavandina')) return 12;
  if (n.includes('piso')) return 12;

  return 1;
}

export interface ProductoConFactor {
  nombre: string;
  /** Override configurable por producto; null/ausente = regla por nombre. */
  factor_paquete?: number | null;
}

export function factorConversion(producto: ProductoConFactor): number {
  const configurado = Number(producto.factor_paquete);
  if (Number.isFinite(configurado) && configurado > 0) {
    return Math.floor(configurado);
  }
  return factorConversionPorNombre(producto.nombre);
}

/** Unidades físicas de una línea: `cantidad × factor` sólo si es paquete. */
export function unidadesDe(
  item: ProductoConFactor & {
    cantidad: number;
    tipo_presentacion?: TipoPresentacion | string;
  },
): number {
  const factor = esPaquete(item.tipo_presentacion)
    ? factorConversion(item)
    : 1;
  return item.cantidad * factor;
}

/** Máximo de presentaciones admitidas por el stock disponible en unidades. */
export function topePorStock(
  stock: number | undefined,
  item: ProductoConFactor & { tipo_presentacion?: TipoPresentacion | string },
): number | undefined {
  if (typeof stock !== 'number') return undefined;
  const factor = esPaquete(item.tipo_presentacion)
    ? factorConversion(item)
    : 1;
  return Math.floor(stock / factor);
}

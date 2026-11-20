import type { Producto } from '../productos/producto.entity';
import type { TipoPresentacion } from './detalle-pedido.entity';

/**
 * Factor de conversión de una presentación a unidades físicas.
 *
 * Reglas de negocio PROLIMAC SRL (1 paquete = N unidades):
 *  - Alcohol en gel ................ 12
 *  - Antigrasa ..................... 6
 *  - Limpiavidrios ................. 6
 *  - Limpia baños .................. 6
 *  - Lavavajillas .................. 6
 *  - Lavandina ..................... 12
 *  - Pisos ......................... 12
 *  - Cualquier otro ................ 1 (o su factor configurado)
 *
 * Todas las reglas se resuelven por nombre porque el catálogo actual comparte
 * una sola categoría ('Limpieza'). El nombre se normaliza sin acentos ni
 * signos para que "Limpia Baños", "Limpia Banos" y "limpiabanos" den el mismo
 * factor.
 */
export function normalizarNombreProducto(nombre: string): string {
  return (nombre ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Factor por tipo de producto, derivado del nombre normalizado. */
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

/**
 * Factor efectivo para un producto. `factor_paquete` (columna opcional de
 * `productos`) permite overridear la regla por nombre; null/ausente usa la
 * tabla anterior.
 */
export function factorConversion(
  producto: Pick<Producto, 'nombre'> & { factor_paquete?: number | null },
): number {
  const configurado = Number(producto.factor_paquete);
  if (Number.isFinite(configurado) && configurado > 0) {
    return Math.floor(configurado);
  }
  return factorConversionPorNombre(producto.nombre);
}

/** Unidades físicas equivalentes a `cantidad` presentaciones. */
export function unidadesFisicas(
  producto: Pick<Producto, 'nombre'> & { factor_paquete?: number | null },
  cantidad: number,
  presentacion?: TipoPresentacion | string | null,
): number {
  const esPaquete =
    (presentacion ?? '').toString().trim().toUpperCase() === 'PAQUETE';
  return esPaquete ? cantidad * factorConversion(producto) : cantidad;
}

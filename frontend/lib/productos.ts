/** Categoría plana devuelta por `GET /categorias` y por la relación de producto. */
export interface Categoria {
  id: number;
  nombre: string;
  descripcion?: string | null;
  imagen_url?: string | null;
}

/**
 * Campos comunes a las respuestas de `/productos`, `/productos/admin` y
 * `/productos/:id`. `categoria` siempre es opcional: los productos legados
 * pueden no tenerla y el backend la devuelve como `null`.
 */
export interface ProductoCatalogo {
  id: number;
  nombre: string;
  precio: number;
  precio_costo?: number | null;
  codigo?: string | null;
  descripcion?: string | null;
  imagen_url?: string | null;
  tamano?: string | null;
  activo?: boolean;
  stock?: number;
  disponible?: boolean;
  factor_paquete?: number | null;
  categoria?: Categoria | null;
  /** Compatibilidad con respuestas antiguas que exponían la columna suelta. */
  categoria_id?: number | null;
}

/** Valor centinela para el filtro "todas las categorías". */
export const TODAS_CATEGORIAS = 'all';
export const SIN_CATEGORIA = 'sin';

export function idCategoriaProducto(
  producto: Pick<ProductoCatalogo, 'categoria' | 'categoria_id'>,
): number | null {
  return producto.categoria?.id ?? producto.categoria_id ?? null;
}

/**
 * Nombres generados por corridas E2E antiguas (`Categ Actualizada <ts>`).
 * Se filtran por si una base aún no ejecutó la limpieza del backend.
 */
const PATRON_CATEGORIA_RESIDUAL =
  /^categ(?:or[iíÍ]a)?\s+(?:test|actualizada|prueba)\s+\d{10,}$/i;

/** Orden de lectura de las líneas PROLIMAC; el resto va alfabético detrás. */
const ORDEN_LINEAS = [
  'Alcohol en Gel',
  'Antigrasa',
  'Lavandina',
  'Lavavajillas',
  'Limpia Baños',
  'Limpiavidrios',
  'Pisos',
  'Desinfección',
  'Hogar',
  'Limpieza',
] as const;

function normalizarNombre(nombre: string): string {
  return nombre
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLocaleLowerCase('es');
}

const INDICE_LINEAS: Map<string, number> = new Map(
  ORDEN_LINEAS.map((nombre, indice) => [normalizarNombre(nombre), indice]),
);

/** Categorías reales, sin duplicados ni ruido de pruebas, en orden estable. */
export function categoriasParaFiltro(categorias: Categoria[]): Categoria[] {
  const vistas = new Set<string>();

  return categorias
    .filter(categoria => !PATRON_CATEGORIA_RESIDUAL.test(categoria.nombre.trim()))
    .sort((a, b) => {
      const nombreA = normalizarNombre(a.nombre);
      const nombreB = normalizarNombre(b.nombre);
      const lineaA = INDICE_LINEAS.get(nombreA) ?? ORDEN_LINEAS.length;
      const lineaB = INDICE_LINEAS.get(nombreB) ?? ORDEN_LINEAS.length;
      if (lineaA !== lineaB) return lineaA - lineaB;
      return nombreA.localeCompare(nombreB, 'es');
    })
    .filter(categoria => {
      const clave = normalizarNombre(categoria.nombre);
      if (vistas.has(clave)) return false;
      vistas.add(clave);
      return true;
    });
}

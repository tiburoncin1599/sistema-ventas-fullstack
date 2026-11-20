import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { parseCurrency } from '@/lib/utils';
import {
  CANTIDAD_MINIMA,
  claveLinea,
  esPaquete,
  factorConversion,
  presentacionDe,
  topePorStock,
  unidadesDe,
  type TipoPresentacion,
} from '@/lib/conversion';

export type { TipoPresentacion } from '@/lib/conversion';
export {
  CANTIDAD_MINIMA,
  claveLinea,
  presentacionDe,
} from '@/lib/conversion';

export interface ProductoCarrito {
  id: number;
  nombre: string;
  precio: number;
  imagen_url?: string;
  stock?: number;
  /** Opcional para conservar carritos persistidos con el esquema anterior. */
  tipo_presentacion?: TipoPresentacion;
  /** Override del factor de paquete; null/ausente = regla por nombre. */
  factor_paquete?: number | null;
}

interface ItemCarrito extends ProductoCarrito {
  cantidad: number;
}

/** Acepta la clave compuesta; un número se trata como línea UNIDAD legacy. */
type ClaveItem = string | number;

interface CarritoStore {
  items: ItemCarrito[];
  agregar: (producto: ProductoCarrito & { cantidad?: number }) => void;
  quitar: (clave: ClaveItem) => void;
  cambiarCantidad: (clave: ClaveItem, cantidad: number) => void;
  cambiarPresentacion: (clave: ClaveItem, tipo: TipoPresentacion) => void;
  vaciar: () => void;
  total: () => number;
}

const CHECK_USER = () =>
  typeof window !== 'undefined' && !!localStorage.getItem('token');

const claveDe = (item: ProductoCarrito): string =>
  claveLinea(item.id, item.tipo_presentacion);

const claveNormalizada = (clave: ClaveItem): string =>
  typeof clave === 'number' ? claveLinea(clave, 'UNIDAD') : clave;

/**
 * Ajusta la cantidad al rango permitido: mínimo de la presentación (3 para
 * UNIDAD) y tope por stock en unidades físicas. Devuelve `null` cuando ni
 * siquiera el mínimo cabe en el stock, para no crear líneas inválidas.
 */
const ajustarCantidad = (
  cantidad: number,
  item: ProductoCarrito,
): number | null => {
  if (!Number.isFinite(cantidad)) return null;
  const minimo = CANTIDAD_MINIMA[presentacionDe(item)];
  const tope = topePorStock(item.stock, item);
  if (tope !== undefined && tope < minimo) return null;
  return Math.min(Math.max(cantidad, minimo), tope ?? Number.MAX_SAFE_INTEGER);
};

export const useCarrito = create<CarritoStore>()(
  persist(
    (set, get) => ({
      items: [],

      agregar: (producto) => {
        if (!CHECK_USER()) {
          alert('Debe iniciar sesión para agregar productos al carrito');
          return;
        }
        const tipo = presentacionDe(producto);
        const minimo = CANTIDAD_MINIMA[tipo];
        const datos: ProductoCarrito = {
          id: producto.id,
          nombre: producto.nombre,
          precio: parseCurrency(producto.precio),
          imagen_url: producto.imagen_url,
          stock:
            typeof producto.stock === 'number' ? producto.stock : undefined,
          tipo_presentacion: tipo,
          factor_paquete: producto.factor_paquete,
        };
        const clave = claveDe(datos);
        const items = get().items;
        const existe = items.find((i) => claveDe(i) === clave);
        const cantidad = ajustarCantidad(
          (existe?.cantidad ?? 0) + Math.max(producto.cantidad ?? minimo, minimo),
          existe ?? datos,
        );
        if (cantidad === null) return;
        set({
          items: existe
            ? items.map((i) =>
                claveDe(i) === clave ? { ...i, cantidad } : i,
              )
            : [...items, { ...datos, cantidad }],
        });
      },

      quitar: (claveArg) => {
        const clave = claveNormalizada(claveArg);
        set({ items: get().items.filter((i) => claveDe(i) !== clave) });
      },

      cambiarCantidad: (claveArg, cantidad) => {
        const clave = claveNormalizada(claveArg);
        if (cantidad <= 0) {
          get().quitar(clave);
          return;
        }
        const item = get().items.find((i) => claveDe(i) === clave);
        if (!item) return;
        const ajustada = ajustarCantidad(cantidad, item);
        if (ajustada === null) return;
        set({
          items: get().items.map((i) =>
            claveDe(i) === clave ? { ...i, cantidad: ajustada } : i,
          ),
        });
      },

      cambiarPresentacion: (claveArg, tipo) => {
        const clave = claveNormalizada(claveArg);
        const items = get().items;
        const origen = items.find((i) => claveDe(i) === clave);
        if (!origen || presentacionDe(origen) === tipo) return;

        const actualizado: ProductoCarrito = {
          ...origen,
          tipo_presentacion: tipo,
        };
        const destino = claveDe(actualizado);
        const otro = items.find((i) => claveDe(i) === destino);

        // Conserva las unidades físicas. Si ya existía la otra presentación,
        // se fusionan en una sola línea para no duplicar la clave compuesta.
        const factor = esPaquete(tipo) ? factorConversion(actualizado) : 1;
        const unidades =
          unidadesDe(origen) + (otro ? unidadesDe(otro) : 0);
        const cantidad = ajustarCantidad(
          Math.max(CANTIDAD_MINIMA[tipo], Math.round(unidades / factor)),
          actualizado,
        );
        if (cantidad === null) return;

        set({
          items: items
            .filter((i) => claveDe(i) !== destino)
            .map((i) =>
              claveDe(i) === clave
                ? { ...actualizado, cantidad }
                : i,
            ),
        });
      },

      vaciar: () => set({ items: [] }),

      // El precio es por unidad física: un paquete factura sus unidades.
      total: () =>
        get().items.reduce(
          (sum, i) => sum + parseCurrency(i.precio) * unidadesDe(i),
          0,
        ),
    }),
    { name: 'carrito-storage' },
  ),
);

/** Factor legible para la UI (1 paq = N unid.). */
export const factorDeItem = (item: ProductoCarrito): number => {
  if (!esPaquete(item.tipo_presentacion)) return 1;
  return factorConversion(item);
};

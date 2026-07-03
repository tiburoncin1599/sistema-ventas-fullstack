import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { parseCurrency } from '@/lib/utils';

export interface ProductoCarrito {
  id: number;
  nombre: string;
  precio: number;
  imagen_url?: string;
}

interface ItemCarrito extends ProductoCarrito {
  cantidad: number;
}

interface CarritoStore {
  items: ItemCarrito[];
  agregar: (producto: ProductoCarrito & { cantidad?: number }) => void;
  quitar: (id: number) => void;
  cambiarCantidad: (id: number, cantidad: number) => void;
  vaciar: () => void;
  total: () => number;
}

export const useCarrito = create<CarritoStore>()(
  persist(
    (set, get) => ({
      items: [],

      agregar: (producto) => {
        const qty = producto.cantidad || 1;
        const datos: ProductoCarrito = { id: producto.id, nombre: producto.nombre, precio: parseCurrency(producto.precio), imagen_url: producto.imagen_url };
        const items = get().items;
        const existe = items.find(i => i.id === producto.id);
        if (existe) {
          set({ items: items.map(i =>
            i.id === producto.id ? { ...i, cantidad: i.cantidad + qty } : i
          )});
        } else {
          set({ items: [...items, { ...datos, cantidad: qty }] });
        }
      },

      quitar: (id) => set({ items: get().items.filter(i => i.id !== id) }),

      cambiarCantidad: (id, cantidad) => {
        if (cantidad <= 0) {
          get().quitar(id);
          return;
        }
        set({ items: get().items.map(i =>
          i.id === id ? { ...i, cantidad } : i
        )});
      },

      vaciar: () => set({ items: [] }),

      total: () => get().items.reduce((sum, i) => sum + parseCurrency(i.precio) * i.cantidad, 0),
    }),
    { name: 'carrito-storage' },
  ),
);

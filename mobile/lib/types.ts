export interface Producto {
  id: number;
  nombre: string;
  descripcion?: string;
  precio: number;
  precio_costo?: number;
  precio_por_docena?: number;
  tamano?: string;
  imagen_url?: string;
  categoria_id?: number;
  categoria?: { id: number; nombre: string };
  activo?: boolean;
}

export interface ItemCarrito {
  id: number;
  producto_id: number;
  cantidad: number;
  precio_unitario: number;
  producto?: Producto;
}

export interface Pedido {
  id: number;
  usuario_id: number;
  total: number;
  estado: string;
  direccion_entrega?: string;
  notas?: string;
  creado_en: string;
  detalles?: ItemCarrito[];
  usuario?: { id: number; nombre: string };
}

export interface Cliente {
  id: number;
  nombre: string;
  email?: string;
  telefono?: string;
  carnet?: string;
  ubicacion?: string;
  activo: boolean;
}

export interface InventarioItem {
  id: number;
  producto_id: number;
  cantidad: number;
  cantidad_minima: number;
  ubicacion?: string;
  producto?: Producto;
}

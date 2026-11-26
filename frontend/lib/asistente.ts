import { api } from './api';

export type IntencionAsistente =
  | 'bienvenida'
  | 'guia'
  | 'catalogo'
  | 'producto'
  | 'reglas'
  | 'pedidos'
  | 'contacto'
  | 'fallback';

export interface AccionAsistente {
  etiqueta: string;
  url: string;
  externa?: boolean;
}

export interface ProductoAsistente {
  id: number;
  nombre: string;
  precio: string;
  stock: number;
  estado: 'Disponible' | 'Agotado';
  equivalencia: string;
}

export interface PedidoAsistente {
  id: number;
  estado: string;
  total: string;
  creado_en: string;
  tipo_pago: string;
  metodo_pago: string | null;
  referencia_transaccion: string | null;
  monto_pagado: string;
}

export interface RespuestaAsistente {
  mensaje: string;
  intencion: IntencionAsistente;
  autenticado: boolean;
  opciones: string[];
  acciones: AccionAsistente[];
  productos?: ProductoAsistente[];
  pedidos?: PedidoAsistente[];
}

export const OPCIONES_RAPIDAS: string[] = [
  '¿Cómo hacer mi primer pedido?',
  'Ver productos y precios',
  '¿Cómo funcionan los paquetes?',
  'Estado de mi pedido',
  'Contactar a un asesor',
];

export const MENSAJE_BIENVENIDA =
  'Asistente PROLIMAC SRL — ¿En qué puedo ayudarte hoy?';

/** Envía la consulta con el JWT actual si hay sesión; el backend lo valida. */
export async function consultarAsistente(
  mensaje: string,
): Promise<RespuestaAsistente> {
  const { data } = await api.post<RespuestaAsistente>('/asistente/consultar', {
    mensaje,
  });
  return data;
}

/** Modo de entrega resuelto en tiempo de arranque según las variables de entorno. */
export type ModoWhatsapp = 'API' | 'LINK';

export interface SolicitudWhatsapp {
  telefono: string;
  mensaje: string;
}

export interface ResultadoAdapter {
  estado: 'ENVIADO' | 'ERROR';
  detalle?: string;
}

/**
 * Estrategia de entrega. El servicio de notificaciones depende de esta
 * abstracción, nunca de un proveedor concreto (Strategy + Adapter).
 */
export interface WhatsappAdapter {
  readonly modo: ModoWhatsapp;
  enviar(solicitud: SolicitudWhatsapp): Promise<ResultadoAdapter>;
  /** URL lista para abrir en el frontend; `null` en modo API. */
  urlPara(solicitud: SolicitudWhatsapp): string | null;
}

/** Token de inyección para el adapter seleccionado. */
export const WHATSAPP_ADAPTER = Symbol('WHATSAPP_ADAPTER');

/** Normaliza a dígitos para cumplir con el formato internacional de wa.me. */
export function normalizarTelefono(telefono: string): string {
  return telefono.replace(/[^\d]/g, '');
}

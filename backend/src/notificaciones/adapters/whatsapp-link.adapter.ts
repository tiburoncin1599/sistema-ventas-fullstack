import { Injectable } from '@nestjs/common';
import {
  normalizarTelefono,
  ResultadoAdapter,
  SolicitudWhatsapp,
  WhatsappAdapter,
} from './whatsapp.adapter';

/**
 * Modo sin credenciales: genera el enlace oficial de WhatsApp. Si no hay
 * teléfono configurado se omite el número y WhatsApp solicita el contacto
 * al usuario, manteniendo el flujo utilizable desde el primer día.
 */
@Injectable()
export class WhatsappLinkAdapter implements WhatsappAdapter {
  readonly modo = 'LINK' as const;

  urlPara({ telefono, mensaje }: SolicitudWhatsapp): string {
    const numero = normalizarTelefono(telefono);
    const destino = numero ? `https://wa.me/${numero}` : 'https://wa.me/';
    return `${destino}?text=${encodeURIComponent(mensaje)}`;
  }

  async enviar(): Promise<ResultadoAdapter> {
    return { estado: 'ENVIADO', detalle: 'Enlace wa.me generado' };
  }
}

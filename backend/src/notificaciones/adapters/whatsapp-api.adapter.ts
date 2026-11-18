import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  normalizarTelefono,
  ResultadoAdapter,
  SolicitudWhatsapp,
  WhatsappAdapter,
} from './whatsapp.adapter';

/**
 * Modo producción: envía el mensaje por HTTP POST usando las credenciales
 * configuradas. Soporta el formato de Meta Cloud API, el de Twilio y un
 * formato JSON genérico para proveedores compatibles.
 */
@Injectable()
export class WhatsappApiAdapter implements WhatsappAdapter {
  readonly modo = 'API' as const;

  constructor(private readonly config: ConfigService) {}

  urlPara(): null {
    return null;
  }

  async enviar({ telefono, mensaje }: SolicitudWhatsapp): Promise<ResultadoAdapter> {
    const url = this.config.getOrThrow<string>('WHATSAPP_API_URL');
    const token = this.config.getOrThrow<string>('WHATSAPP_API_TOKEN');
    const provider = (
      this.config.get<string>('WHATSAPP_PROVIDER') ??
      (url.includes('graph.facebook.com')
        ? 'meta'
        : url.includes('api.twilio.com')
          ? 'twilio'
          : 'generico')
    ).toLowerCase();

    const numero = normalizarTelefono(telefono);
    const headers: Record<string, string> = {};
    let body: BodyInit;

    if (provider === 'meta') {
      const phoneId = this.config.get<string>('WHATSAPP_PHONE_ID') ?? '';
      headers.Authorization = `Bearer ${token}`;
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify({
        messaging_product: 'whatsapp',
        ...(phoneId ? { phone_number_id: phoneId } : {}),
        to: numero,
        type: 'text',
        text: { preview_url: false, body: mensaje },
      });
    } else if (provider === 'twilio') {
      const remitente = this.config.get<string>('WHATSAPP_FROM');
      if (!remitente) {
        throw new Error(
          'WHATSAPP_FROM es requerido cuando WHATSAPP_PROVIDER=twilio',
        );
      }
      // El token de Twilio suele venir como "ACxxx:secret".
      const credenciales = token.includes(':')
        ? token
        : `${this.config.get<string>('WHATSAPP_ACCOUNT_SID') ?? ''}:${token}`;
      headers.Authorization = `Basic ${Buffer.from(credenciales).toString('base64')}`;
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
      body = new URLSearchParams({
        To: `whatsapp:+${numero}`,
        From: `whatsapp:${remitente}`,
        Body: mensaje,
      }).toString();
    } else {
      headers.Authorization = `Bearer ${token}`;
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify({ to: numero, message: mensaje });
    }

    const respuesta = await fetch(url, {
      method: 'POST',
      headers,
      body,
    });

    if (!respuesta.ok) {
      const detalle = (await respuesta.text()).slice(0, 300);
      throw new Error(
        `Proveedor WhatsApp respondió ${respuesta.status}: ${detalle}`,
      );
    }

    return { estado: 'ENVIADO', detalle: `Entregado vía ${provider}` };
  }
}

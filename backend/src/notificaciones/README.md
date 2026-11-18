# Módulo de Notificaciones / WhatsApp

## Estrategia híbrida (Strategy + Adapter)

`WhatsappService` depende de la abstracción `WhatsappAdapter`, nunca de un
proveedor concreto. Al arrancar, `NotificacionesModule` selecciona la
estrategia:

- **Modo API** (`WHATSAPP_API_URL` + `WHATSAPP_API_TOKEN` presentes): envía un
  `POST` HTTP. Detecta automáticamente Meta Cloud API, Twilio o un formato JSON
  genérico, y se puede forzar con `WHATSAPP_PROVIDER`.
- **Modo Enlace** (sin credenciales): genera `https://wa.me/{telefono}?text=...`
  y el frontend lo abre en una pestaña nueva. Es el modo por defecto, así que
  el sistema funciona desde el primer día sin credenciales externas.

En ambos casos el evento se persiste en `notificaciones_historial` con estado
`ENVIADO`, `GENERADO_LINK` o `ERROR`.

## Variables de entorno

| Variable | Uso | Requerida |
| --- | --- | --- |
| `WHATSAPP_API_URL` | Endpoint del proveedor | Solo modo API |
| `WHATSAPP_API_TOKEN` | Token / credencial del proveedor | Solo modo API |
| `WHATSAPP_PROVIDER` | `meta`, `twilio` o `generico` (autodetectado si se omite) | No |
| `WHATSAPP_PHONE_ID` | Phone number ID de Meta | Solo Meta |
| `WHATSAPP_FROM` | Remitente `whatsapp:+...` de Twilio | Solo Twilio |
| `WHATSAPP_ACCOUNT_SID` | SID de Twilio si el token no viene como `SID:secret` | No |
| `WHATSAPP_DESTINO` | Teléfono fallback si la configuración no tiene `whatsapp`/`telefono` | No |

El destinatario se resuelve en este orden: parámetro del request →
`configuracion.whatsapp` → `configuracion.telefono` → `WHATSAPP_DESTINO`.
Si no hay número, `wa.me` abre el selector de contacto de WhatsApp.

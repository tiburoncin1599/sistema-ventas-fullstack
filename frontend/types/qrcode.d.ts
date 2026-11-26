/**
 * Declaración mínima para la dependencia `qrcode` (la librería no publica
 * tipos propios y el checkout solo necesita generar un data URL en el cliente).
 */
declare module 'qrcode' {
  export interface QRCodeOpciones {
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
    margin?: number;
    width?: number;
    color?: { dark?: string; light?: string };
  }

  export function toDataURL(
    texto: string,
    opciones?: QRCodeOpciones,
  ): Promise<string>;

  const QRCode: { toDataURL: typeof toDataURL };
  export default QRCode;
}

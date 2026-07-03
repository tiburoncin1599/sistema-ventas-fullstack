import * as FileSystem from 'expo-file-system';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://web-production-c811d.up.railway.app';

export function getImagenUrl(url?: string): string | null {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${API_URL}${url}`;
}

export function formatFecha(fecha: string): string {
  try {
    return new Date(fecha).toLocaleDateString('es-AR', {
      year: 'numeric', month: '2-digit', day: '2-digit',
    });
  } catch {
    return fecha || '';
  }
}

export function formatCantidad(cant: number): string {
  const docenas = Math.floor(cant / 12);
  const unidades = cant % 12;
  if (docenas > 0 && unidades > 0) return `${docenas} doc + ${unidades}u`;
  if (docenas > 0) return `${docenas} doc${docenas > 1 ? 's' : ''} (${cant}u)`;
  return `${cant} u`;
}

/**
 * Descarga un PDF desde una URL, lo valida y retorna la ruta local.
 * Lanza un error descriptivo si la descarga falla, el archivo está vacío
 * o el contenido no es un PDF válido.
 */
export async function descargarPDF(
  url: string,
  fileUri: string,
  token?: string | null,
): Promise<string> {
  console.log('[descargarPDF] URL:', url);
  console.log('[descargarPDF] Destino:', fileUri);

  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const result = await FileSystem.downloadAsync(url, fileUri, { headers });

  console.log('[descargarPDF] URI resultado:', result.uri);
  console.log('[descargarPDF] Status:', result.status);
  console.log('[descargarPDF] Headers respuesta:', JSON.stringify(result.headers));

  // 1. Verificar código de estado HTTP
  if (result.status !== 200) {
    throw new Error(
      `El servidor respondió con código ${result.status}. ` +
      'Verifica que el pedido exista y el servidor esté funcionando.',
    );
  }

  // 2. Verificar que el archivo existe en disco
  const info = await FileSystem.getInfoAsync(result.uri);
  console.log('[descargarPDF] Info archivo:', JSON.stringify(info));

  if (!info.exists) {
    throw new Error('El archivo PDF no se guardó correctamente en el dispositivo');
  }

  // 3. Verificar que no esté vacío
  if (!info.size || info.size === 0) {
    throw new Error('El PDF descargado está vacío (0 bytes)');
  }

  console.log('[descargarPDF] Tamaño:', info.size, 'bytes');

  // 4. Verificar Content-Type
  const ct =
    result.headers?.['content-type'] ||
    result.headers?.['Content-Type'] ||
    '';
  if (!ct.includes('application/pdf') && !ct.includes('pdf')) {
    throw new Error(
      `El servidor devolvió una respuesta inválida (Content-Type: ${ct}). ` +
      'Esperado: application/pdf. Verifica que el pedido exista y el servidor esté funcionando.',
    );
  }

  // 5. Leer cabecera PDF en Base64 (más confiable que UTF-8 para binarios)
  const cabeceraBase64 = await FileSystem.readAsStringAsync(result.uri, {
    encoding: FileSystem.EncodingType.Base64,
    length: 4,
    position: 0,
  });

  console.log('[descargarPDF] Cabecera Base64:', cabeceraBase64);

  // "%PDF" en Base64 (4 bytes) = "JVBERg=="
  if (!cabeceraBase64.startsWith('JVBER')) {
    throw new Error(
      'El archivo descargado no es un PDF válido. ' +
      'Verifica que el pedido exista y el servidor esté funcionando.',
    );
  }

  console.log('[descargarPDF] ✅ PDF válido —', info.size, 'bytes');
  return result.uri;
}

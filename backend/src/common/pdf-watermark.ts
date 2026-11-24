import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

/** `@types/pdfkit` exporta una instancia, no la clase. */
type DocumentoPDF = typeof import('pdfkit');

/**
 * Marca de agua centralizada para todos los PDF del sistema.
 *
 * La imagen se resuelve de forma diferida y se guarda en caché para que la
 * carga funcione igual con `ts-node` (backend/src), con Nest compilado
 * (backend/dist) y dentro del contenedor Docker (`/app`). Un fallo al leer o
 * dibujar el logo nunca debe romper ni corromper el comprobante: en ese caso
 * se usa un texto tenue como respaldo.
 */

let logoCache: Buffer | undefined;

function rutasCandidate(): string[] {
  const nombres = ['logo.png', 'logo.jpg'];
  const bases = [
    process.cwd(), // desarrollo y contenedor (/app)
    join(__dirname, '..', '..'), // dist/common -> backend/
    join(__dirname, '..'), // src/common -> backend/
  ];
  return bases.flatMap((base) =>
    nombres.map((nombre) => join(base, 'assets', nombre)),
  );
}

/**
 * Resuelve el logo PROLIMAC para la marca de agua y para los encabezados.
 * `PDF_LOGO_PATH`/`LOGO_PATH` permiten montarlo por volumen en Docker;
 * después se prueban las rutas del repositorio (local, dist y contenedor).
 * No se cachea un resultado negativo: si el archivo se agrega después,
 * la siguiente petición lo encuentra sin reiniciar el proceso.
 */
export function rutaLogoLocal(): string | null {
  const candidatos = [
    process.env.PDF_LOGO_PATH,
    process.env.LOGO_PATH,
    ...rutasCandidate(),
  ].filter((ruta): ruta is string => Boolean(ruta));

  for (const ruta of candidatos) {
    try {
      if (existsSync(ruta)) return ruta;
    } catch {
      // Se prueba la siguiente ruta candidata.
    }
  }
  return null;
}

function obtenerLogo(): Buffer | null {
  if (logoCache) return logoCache;
  const ruta = rutaLogoLocal();
  if (!ruta) return null;
  try {
    logoCache = readFileSync(ruta);
    return logoCache;
  } catch {
    return null;
  }
}

export function instalarMarcaAgua(
  doc: DocumentoPDF,
  opciones: { opacidad?: number; textoRespaldo?: string } = {},
): void {
  const opacidad = opciones.opacidad ?? 0.1;
  const textoRespaldo = opciones.textoRespaldo ?? 'PROLIMAC SRL';
  const logo = obtenerLogo();

  const dibujar = () => {
    const anchoPagina = doc.page.width;
    const altoPagina = doc.page.height;
    const cajaAncho = anchoPagina * 0.6;
    const cajaAlto = altoPagina * 0.45;
    const x = (anchoPagina - cajaAncho) / 2;
    const y = (altoPagina - cajaAlto) / 2;
    const yAnterior = doc.y;

    doc.save();
    doc.opacity(opacidad);
    try {
      if (logo) {
        doc.image(logo, x, y, {
          fit: [cajaAncho, cajaAlto],
          align: 'center',
          valign: 'center',
        });
      } else {
        doc.font('Helvetica-Bold').fontSize(48).fillColor('#0b5c3f').text(
          textoRespaldo,
          0,
          altoPagina / 2 - 24,
          { width: anchoPagina, align: 'center' },
        );
      }
    } catch {
      // La marca de agua es decorativa: no invalida el PDF.
    } finally {
      doc.restore();
      doc.y = yAnterior;
    }
  };

  // Primera página (el documento ya existe) y cada página añadida después.
  dibujar();
  doc.on('pageAdded', dibujar);
}

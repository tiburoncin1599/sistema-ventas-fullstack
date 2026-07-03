import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { join } from 'path';
import { existsSync, readFileSync } from 'fs';

let logoBuffer: Buffer | null = null;
let logoWidth = 0;
let logoHeight = 0;

/** Lee ancho y alto reales desde un buffer PNG o JPEG sin dependencias externas. */
function readImageSize(buf: Buffer): { width: number; height: number } | null {
  try {
    if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
      // PNG: dimensions at fixed offsets 16 and 20 (big-endian)
      return {
        width: buf.readUInt32BE(16),
        height: buf.readUInt32BE(20),
      };
    }
    if (buf[0] === 0xff && buf[1] === 0xd8) {
      // JPEG: scan for SOF0/SOF2 marker (0xFF 0xC0 / 0xFF 0xC2)
      let i = 2;
      while (i < buf.length) {
        if (buf[i] !== 0xff) { i++; continue; }
        if (buf[i + 1] === 0xc0 || buf[i + 1] === 0xc2) {
          return {
            height: buf.readUInt16BE(i + 5),
            width: buf.readUInt16BE(i + 7),
          };
        }
        const segLen = buf.readUInt16BE(i + 2);
        i += 2 + segLen;
      }
    }
  } catch {}
  return null;
}

(() => {
  const cwd = process.cwd();
  const candidates = [
    { path: join(cwd, 'assets', 'logo.jpg'), label: 'backend/assets/logo.jpg' },
    { path: join(cwd, 'assets', 'logo.png'), label: 'backend/assets/logo.png' },
  ];
  console.log('[FacturaService] process.cwd() =', cwd);
  for (const { path: fp, label } of candidates) {
    console.log('[FacturaService] Probando ruta:', fp);
    try {
      if (existsSync(fp)) {
        console.log('[FacturaService] ✓ Archivo existe:', fp);
        logoBuffer = readFileSync(fp);
        console.log('[FacturaService] ✓ readFileSync OK — tamaño:', logoBuffer.length, 'bytes, ruta:', label);
        const dim = readImageSize(logoBuffer);
        if (dim) {
          logoWidth = dim.width;
          logoHeight = dim.height;
          console.log('[FacturaService] ✓ Dimensiones reales:', logoWidth, 'x', logoHeight);
        } else {
          console.warn('[FacturaService] ⚠ No se pudieron leer dimensiones, se usará centrado aproximado');
        }
        break;
      } else {
        console.log('[FacturaService] ✗ No existe:', fp);
      }
    } catch (err) {
      console.error('[FacturaService] ✗ Error al leer', fp, ':', err);
    }
  }
  if (!logoBuffer) {
    console.warn('[FacturaService] ⚠ No se encontró ningún archivo de logo. La marca de agua usará texto.');
  } else {
    console.log('[FacturaService] ✅ Logo listo para marca de agua');
  }
})();

@Injectable()
export class FacturaService {
  async generarFacturaPDF(
    data: { pedido: any; detalles: any[]; configuracion?: any },
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      try {
        const cfg = data.configuracion || {};
        const moneda = 'Bs';
        const impuestoPct = Number(cfg.impuesto_porcentaje) || 0;
        const empresa = cfg.nombre_empresa || 'SISTEMA DE VENTAS';
        const nit = cfg.nit || '';

        const bold = (text: string, opts: any = {}) =>
          doc.font('Helvetica-Bold').fontSize(opts.size || 12).text(text, opts);
        const normal = (text: string, opts: any = {}) =>
          doc.font('Helvetica').fontSize(opts.size || 10).text(text, opts);

        const green = '#005a24';
        const gray = '#666';

        // Watermark — behind all content on every page
        const drawWatermark = () => {
          const savedY = doc.y;
          const pageW = doc.page.width;
          const pageH = doc.page.height;
          const wmWidth = pageW * 0.60;
          const wmX = (pageW - wmWidth) / 2;

          doc.save();
          doc.opacity(0.12);

          if (logoBuffer && logoHeight > 0 && logoWidth > 0) {
            const ratio = logoHeight / logoWidth;
            const wmHeight = wmWidth * ratio;
            const wmY = (pageH - wmHeight) / 2;
            try {
              doc.image(logoBuffer, wmX, wmY, { width: wmWidth });
            } catch (err) {
              console.error('[watermark] Error al dibujar logo:', err);
            }
          } else if (logoBuffer) {
            const wmY = (pageH - wmWidth) / 2;
            try {
              doc.image(logoBuffer, wmX, wmY, { width: wmWidth });
            } catch (err) {
              console.error('[watermark] Error al dibujar logo:', err);
            }
          } else {
            const wmY = pageH / 3;
            doc.font('Helvetica-Bold').fontSize(60).fillColor('#000')
              .text(empresa, 0, wmY, { align: 'center' });
          }

          doc.restore();
          doc.y = savedY;
        };

        drawWatermark();
        doc.on('pageAdded', () => { drawWatermark(); });

        // Logo
        if (cfg.logo_url && existsSync(cfg.logo_url)) {
          try {
            doc.image(cfg.logo_url, 40, 40, { width: 60, height: 60 });
          } catch {}
        }

        // Header - empresa info
        const headerX = cfg.logo_url && existsSync(cfg.logo_url) ? 115 : 40;
        doc.fontSize(18).font('Helvetica-Bold').fillColor(green);
        if (cfg.logo_url && existsSync(cfg.logo_url)) {
          doc.text(empresa, headerX, 45);
        } else {
          doc.text(empresa, headerX, 45, { align: 'center' });
        }
        doc.fillColor(gray).font('Helvetica').fontSize(9);
        if (nit) doc.text(`NIT: ${nit}`, headerX, doc.y + 2);
        if (cfg.direccion) doc.text(cfg.direccion, headerX, doc.y + 2);
        if (cfg.telefono) doc.text(`Tel: ${cfg.telefono}`, headerX, doc.y + 2);
        if (cfg.email_empresa) doc.text(cfg.email_empresa, headerX, doc.y + 2);

        // QR bancario
        if (cfg.qr_bancario_url && existsSync(cfg.qr_bancario_url)) {
          try {
            doc.image(cfg.qr_bancario_url, 490, 40, { width: 60, height: 60 });
          } catch {}
        }

        doc.moveDown(2);

        // Separator
        doc.strokeColor(green).lineWidth(1);
        doc.moveTo(40, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown(0.5);

        // Factura title
        doc.fontSize(16).font('Helvetica-Bold').fillColor(green);
        doc.text('FACTURA', { align: 'center' });
        doc.moveDown(0.3);
        doc.fontSize(10).font('Helvetica').fillColor(gray);
        doc.text(`Pedido N° ${data.pedido.id}`, { align: 'center' });
        doc.text(
          `Fecha: ${new Date(data.pedido.creado_en).toLocaleDateString('es-AR')}`,
          { align: 'center' },
        );
        doc.moveDown(1);

        // Cliente
        doc.fillColor(green).fontSize(12).font('Helvetica-Bold');
        doc.text('DATOS DEL CLIENTE');
        doc.moveDown(0.5);
        const cli = data.pedido.usuario;
        doc.fillColor('#333');
        if (cli) {
          normal(`Nombre: ${cli.nombre || ''}`);
          if (cli.carnet) normal(`Carnet / CI: ${cli.carnet}`);
          if (cli.email) normal(`Email: ${cli.email}`);
          if (cli.ubicacion) normal(`Ubicación: ${cli.ubicacion}`);
          if (data.pedido.direccion_entrega)
            normal(`Dirección de entrega: ${data.pedido.direccion_entrega}`);
        }
        doc.moveDown(0.5);

        // Personal que lo atendió
        const proc = data.pedido.procesador;
        if (proc) {
          doc.fillColor(green).fontSize(12).font('Helvetica-Bold');
          doc.text('ATENDIDO POR');
          doc.moveDown(0.3);
          doc.fillColor('#333').font('Helvetica').fontSize(10);
          normal(`Nombre: ${proc.nombre || ''}`);
          if (proc.email) normal(`Email: ${proc.email}`);
          doc.moveDown(0.5);
        }

        // Linea separadora
        doc.strokeColor('#ccc').lineWidth(1);
        doc.moveTo(40, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown(0.5);

        // Tabla header
        const col1 = 40, col2 = 220, col3 = 340, col4 = 460;
        const rowHeader = (y: number) => {
          doc.fillColor(green).font('Helvetica-Bold').fontSize(10);
          doc.text('Producto', col1, y, { width: 170 });
          doc.text('Cant', col2, y, { width: 50, align: 'center' });
          doc.text('Precio', col3, y, { width: 100, align: 'right' });
          doc.text('Subtotal', col4, y, { width: 80, align: 'right' });
        };
        rowHeader(doc.y);
        doc.moveDown(0.3);
        doc.strokeColor(green).lineWidth(0.5);
        doc.moveTo(40, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown(0.3);

        // Detalles
        let subtotal = 0;
        data.detalles.forEach((d) => {
          const y = doc.y;
          const sub = d.cantidad * Number(d.precio_unitario);
          subtotal += sub;
          doc.fillColor('#333').font('Helvetica').fontSize(10);
          doc.text(d.producto?.nombre || `Producto #${d.producto_id}`, col1, y, { width: 170 });
          doc.text(String(d.cantidad), col2, y, { width: 50, align: 'center' });
          doc.text(`${moneda}${Number(d.precio_unitario).toFixed(2)}`, col3, y, {
            width: 100,
            align: 'right',
          });
          doc.text(`${moneda}${sub.toFixed(2)}`, col4, y, { width: 80, align: 'right' });
          doc.moveDown(0.8);
        });

        // Subtotal
        doc.moveDown(0.5);
        doc.strokeColor(green).lineWidth(1);
        doc.moveTo(40, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown(0.5);
        doc.fillColor(green).font('Helvetica-Bold').fontSize(12);
        doc.text('Subtotal:', 40, doc.y, { width: 100 });
        doc.text(`${moneda}${subtotal.toFixed(2)}`, 440, doc.y, { width: 100, align: 'right' });

        // Impuesto
        if (impuestoPct > 0) {
          const impuesto = subtotal * (impuestoPct / 100);
          doc.moveDown(0.5);
          doc.fontSize(11).fillColor('#333');
          doc.text(`Impuesto (${impuestoPct}%):`, 40, doc.y, { width: 150 });
          doc.text(`${moneda}${impuesto.toFixed(2)}`, 440, doc.y, { width: 100, align: 'right' });

          doc.moveDown(0.5);
          doc.strokeColor(green).lineWidth(1.5);
          doc.moveTo(340, doc.y).lineTo(550, doc.y).stroke();
          doc.moveDown(0.5);

          doc.fillColor(green).font('Helvetica-Bold').fontSize(14);
          doc.text('TOTAL:', 40, doc.y, { width: 100 });
          doc.text(`${moneda}${(subtotal + impuesto).toFixed(2)}`, 440, doc.y, {
            width: 100,
            align: 'right',
          });
        } else {
          doc.moveDown(0.5);
          doc.strokeColor(green).lineWidth(1.5);
          doc.moveTo(340, doc.y).lineTo(550, doc.y).stroke();
          doc.moveDown(0.5);

          doc.fillColor(green).font('Helvetica-Bold').fontSize(14);
          doc.text('TOTAL:', 40, doc.y, { width: 100 });
          doc.text(`${moneda}${subtotal.toFixed(2)}`, 440, doc.y, { width: 100, align: 'right' });
        }

        // Estado
        doc.moveDown(1.5);
        doc.fillColor(gray).font('Helvetica').fontSize(10);
        doc.text(`Estado: ${data.pedido.estado}`, { align: 'center' });

        // Términos y condiciones
        if (cfg.terminos_condiciones) {
          doc.moveDown(1);
          doc.fillColor(green).font('Helvetica-Bold').fontSize(10);
          doc.text('TÉRMINOS Y CONDICIONES');
          doc.moveDown(0.3);
          doc.fillColor(gray).font('Helvetica').fontSize(8);
          doc.text(cfg.terminos_condiciones);
        }

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}

import { Injectable } from '@nestjs/common';
import { existsSync } from 'fs';
import { instalarMarcaAgua, rutaLogoLocal } from '../common/pdf-watermark';
import { desglosarMontos } from '../common/impuesto';

@Injectable()
export class FacturaService {
  async generarFacturaPDF(
    data: { pedido: any; detalles: any[]; configuracion?: any },
  ): Promise<Buffer> {
    const PDFDocument = (await import('pdfkit')).default;
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
        const empresa = cfg.nombre_empresa || 'PROLIMAC SRL';
        const nit = cfg.nit || '';

        const bold = (text: string, opts: any = {}) =>
          doc.font('Helvetica-Bold').fontSize(opts.size || 12).text(text, opts);
        const normal = (text: string, opts: any = {}) =>
          doc.font('Helvetica').fontSize(opts.size || 10).text(text, opts);

        const green = '#005a24';
        const gray = '#666';

        // Marca de agua en todas las páginas, detrás del contenido. El texto
        // de respaldo es siempre la marca PROLIMAC, aunque la configuración
        // tenga otro nombre comercial.
        instalarMarcaAgua(doc, { textoRespaldo: 'PROLIMAC SRL' });

        // Logo: primero el configurado (si es un archivo válido) y después
        // el resolver local/Docker, igual que la marca de agua.
        const logoRuta =
          (cfg.logo_url && existsSync(cfg.logo_url) ? cfg.logo_url : null) ??
          rutaLogoLocal();
        if (logoRuta) {
          try {
            doc.image(logoRuta, 40, 40, { width: 60, height: 60 });
          } catch {}
        }

        // Header - empresa info
        const headerX = logoRuta ? 115 : 40;
        doc.fontSize(18).font('Helvetica-Bold').fillColor(green);
        if (logoRuta) {
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
        const cli = data.pedido.usuario as
          | { nombre?: string | null; carnet?: string | null; email?: string | null; telefono?: string | null; ubicacion?: string | null }
          | null
          | undefined;
        doc.fillColor('#333');
        normal(`Nombre: ${cli?.nombre || `Cliente #${data.pedido.usuario_id}`}`);
        if (cli?.carnet) normal(`Carnet / CI: ${cli.carnet}`);
        if (cli?.telefono) normal(`Teléfono: ${cli.telefono}`);
        if (cli?.email) normal(`Email: ${cli.email}`);
        if (cli?.ubicacion) normal(`Ubicación: ${cli.ubicacion}`);
        if (data.pedido.direccion_entrega)
          normal(`Dirección de entrega: ${data.pedido.direccion_entrega}`);
        if (data.pedido.notas) normal(`Notas: ${data.pedido.notas}`);
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

        // Detalles: el precio es por unidad física, no por presentación.
        let subtotalDetalles = 0;
        data.detalles.forEach((d) => {
          const y = doc.y;
          const unidades = Number(d.unidades ?? d.cantidad);
          const sub = unidades * Number(d.precio_unitario);
          subtotalDetalles += sub;
          doc.fillColor('#333').font('Helvetica').fontSize(10);
          doc.text(d.producto?.nombre || `Producto #${d.producto_id}`, col1, y, { width: 170 });
          doc.text(String(unidades), col2, y, { width: 50, align: 'center' });
          doc.text(`${moneda}${Number(d.precio_unitario).toFixed(2)}`, col3, y, {
            width: 100,
            align: 'right',
          });
          doc.text(`${moneda}${sub.toFixed(2)}`, col4, y, { width: 80, align: 'right' });
          doc.moveDown(0.8);
        });

        const desglose = desglosarMontos({
          subtotalDetalles,
          total: Number(data.pedido.total),
          impuestoPorcentaje: impuestoPct,
        });

        // Subtotal
        doc.moveDown(0.5);
        doc.strokeColor(green).lineWidth(1);
        doc.moveTo(40, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown(0.5);
        doc.fillColor(green).font('Helvetica-Bold').fontSize(12);
        doc.text('Subtotal:', 40, doc.y, { width: 100 });
        doc.text(`${moneda}${desglose.subtotal.toFixed(2)}`, 440, doc.y, {
          width: 100,
          align: 'right',
        });

        if (desglose.impuesto > 0) {
          doc.moveDown(0.5);
          doc.fontSize(11).fillColor('#333');
          doc.text(`Impuesto (${impuestoPct}%):`, 40, doc.y, { width: 150 });
          doc.text(`${moneda}${desglose.impuesto.toFixed(2)}`, 440, doc.y, {
            width: 100,
            align: 'right',
          });
        } else if (impuestoPct > 0 && desglose.impuestoIncluido) {
          doc.moveDown(0.5);
          doc.fontSize(11).fillColor('#333');
          doc.text(`Impuesto incluido (${impuestoPct}%)`, 40, doc.y, { width: 200 });
        }

        doc.moveDown(0.5);
        doc.strokeColor(green).lineWidth(1.5);
        doc.moveTo(340, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown(0.5);

        doc.fillColor(green).font('Helvetica-Bold').fontSize(14);
        doc.text('TOTAL:', 40, doc.y, { width: 100 });
        doc.text(`${moneda}${desglose.total.toFixed(2)}`, 440, doc.y, {
          width: 100,
          align: 'right',
        });

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

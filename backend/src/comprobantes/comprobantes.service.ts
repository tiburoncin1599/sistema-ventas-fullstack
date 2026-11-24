import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { existsSync } from 'fs';
import { Configuracion } from '../configuracion/configuracion.entity';
import { ConfiguracionService } from '../configuracion/configuracion.service';
import { Pedido } from '../pedidos/pedido.entity';
import { DetallePedido } from '../pedidos/detalle-pedido.entity';
import { Deuda } from '../deudas/deuda.entity';
import {
  instalarMarcaAgua,
  rutaLogoLocal,
} from '../common/pdf-watermark';
import { desglosarMontos } from '../common/impuesto';

const PIE = 'Comprobante comercial interno - No válido como factura fiscal';

interface ItemComprobante {
  codigo: string;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

interface DatosComprobante {
  numero: string;
  estado: string;
  fechaHora: string;
  vendedor: string;
  cliente: {
    nombre: string;
    carnet?: string | null;
    email?: string | null;
    telefono?: string | null;
    direccion?: string | null;
    ubicacion?: string | null;
  };
  items: ItemComprobante[];
  subtotal: number;
  descuento: number;
  impuesto: number;
  total: number;
  pagado: number;
  saldo: number;
  moneda: string;
  configuracion: Configuracion;
}

@Injectable()
export class ComprobantesService {
  constructor(
    @InjectRepository(Pedido)
    private readonly pedidosRepo: Repository<Pedido>,
    @InjectRepository(DetallePedido)
    private readonly detallesRepo: Repository<DetallePedido>,
    @InjectRepository(Deuda)
    private readonly deudasRepo: Repository<Deuda>,
    private readonly configuracionService: ConfiguracionService,
  ) {}

  private formatearFecha(fecha: Date): string {
    const f = new Date(fecha);
    const dos = (n: number) => String(n).padStart(2, '0');
    return `${dos(f.getDate())}/${dos(f.getMonth() + 1)}/${f.getFullYear()} ${dos(f.getHours())}:${dos(f.getMinutes())}`;
  }

  private async construirDatos(pedidoId: number): Promise<DatosComprobante> {
    const pedido = await this.pedidosRepo.findOne({
      where: { id: pedidoId },
      relations: ['usuario', 'procesador'],
    });
    if (!pedido) throw new NotFoundException('Pedido no encontrado');

    const detalles = await this.detallesRepo.find({
      where: { pedido_id: pedidoId },
      relations: ['producto'],
      order: { id: 'ASC' },
    });
    const deuda = await this.deudasRepo.findOne({
      where: { pedido_id: pedidoId },
    });
    const configuracion = await this.configuracionService.obtener();

    // El precio es por unidad física: un paquete de 12 debe facturarse por 12.
    const items: ItemComprobante[] = detalles.map((d) => {
      const unidades = Number(d.unidades ?? d.cantidad);
      return {
        codigo: d.producto?.codigo || `P-${d.producto_id}`,
        nombre: d.producto?.nombre || `Producto #${d.producto_id}`,
        cantidad: unidades,
        precioUnitario: Number(d.precio_unitario),
        subtotal: unidades * Number(d.precio_unitario),
      };
    });

    const total = Number(pedido.total);
    const desglose = desglosarMontos({
      subtotalDetalles: items.reduce((sum, i) => sum + i.subtotal, 0),
      total,
      impuestoPorcentaje: configuracion.impuesto_porcentaje,
    });
    const saldo = deuda
      ? Math.max(Number(deuda.monto) - Number(deuda.monto_pagado), 0)
      : 0;
    // Un pedido CONTADO entregado está cobrado. Los pedidos pendientes sin
    // deuda no tienen pago registrado: no debe afirmarse lo contrario.
    const pagado = deuda
      ? Number(deuda.monto_pagado)
      : pedido.estado === 'entregado' && pedido.tipo_pago === 'CONTADO'
        ? total
        : 0;

    return {
      numero: `CMP-${String(pedido.id).padStart(6, '0')}`,
      estado: pedido.estado,
      fechaHora: this.formatearFecha(pedido.creado_en),
      vendedor: pedido.procesador?.nombre || 'No asignado',
      cliente: {
        nombre: pedido.usuario?.nombre || `Cliente #${pedido.usuario_id}`,
        carnet: pedido.usuario?.carnet,
        email: pedido.usuario?.email,
        telefono: pedido.usuario?.telefono,
        direccion: pedido.direccion_entrega || pedido.usuario?.ubicacion,
        ubicacion: pedido.usuario?.ubicacion,
      },
      items,
      subtotal: desglose.subtotal,
      descuento: desglose.descuento,
      impuesto: desglose.impuesto,
      total: desglose.total,
      pagado,
      saldo,
      moneda: configuracion.moneda_simbolo || configuracion.moneda || 'Bs',
      configuracion,
    };
  }

  /**
   * Genera el comprobante íntegramente en memoria. No escribe archivos
   * temporales: el Buffer se entrega directamente al controlador HTTP.
   */
  async generarComprobantePDF(pedidoId: number): Promise<Buffer> {
    const datos = await this.construirDatos(pedidoId);
    const PDFDocument = (await import('pdfkit')).default;

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({
        margin: 40,
        size: 'A4',
        bufferPages: true,
        info: {
          Title: `Comprobante ${datos.numero}`,
          Author: datos.configuracion.nombre_empresa || 'PROLIMAC SRL',
          Subject: 'Comprobante comercial interno',
        },
      });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Marca de agua tenue, centrada y detrás del contenido en cada página.
      instalarMarcaAgua(doc);

      try {
        const cfg = datos.configuracion;
        const empresa = cfg.nombre_empresa || 'PROLIMAC SRL';
        const verde = '#0b5c3f';
        const gris = '#5f6b66';
        const money = (valor: number) => `${datos.moneda} ${Number(valor || 0).toFixed(2)}`;

        // ---- Encabezado ----
        doc.rect(40, 40, 515, 96).fill('#eef5f1');
        const logo =
          (cfg.logo_url && existsSync(cfg.logo_url) ? cfg.logo_url : null) ??
          rutaLogoLocal();
        let xTexto = 40;
        if (logo) {
          try {
            doc.image(logo, 52, 52, { fit: [72, 72], align: 'center', valign: 'center' });
            xTexto = 138;
          } catch {
            xTexto = 40;
          }
        }
        doc.font('Helvetica-Bold').fontSize(18).fillColor(verde)
          .text(empresa, xTexto, 52, { width: 515 - (xTexto - 40), align: logo ? 'left' : 'center' });
        doc.font('Helvetica').fontSize(9).fillColor(gris);
        const datosEmpresa = [
          cfg.nit ? `NIT: ${cfg.nit}` : null,
          cfg.direccion,
          cfg.telefono ? `Teléfono: ${cfg.telefono}` : null,
          cfg.email_empresa,
        ].filter((v): v is string => Boolean(v));
        if (datosEmpresa.length) {
          doc.text(datosEmpresa.join('   ·   '), xTexto, doc.y + 4, {
            width: 515 - (xTexto - 40),
            align: logo ? 'left' : 'center',
          });
        }

        doc.moveDown(1.6);
        doc.font('Helvetica-Bold').fontSize(15).fillColor(verde)
          .text('COMPROBANTE COMERCIAL INTERNO', 40, doc.y, { align: 'center' });
        doc.moveDown(0.3);
        doc.font('Helvetica').fontSize(10).fillColor(gris)
          .text(
            `N° ${datos.numero}    |    Fecha y hora: ${datos.fechaHora}`,
            40,
            doc.y,
            { width: 515, align: 'center' },
          );
        doc.moveDown(1);

        // ---- Vendedor / Cliente ----
        const yInfo = doc.y;
        doc.roundedRect(40, yInfo, 250, 70, 10).fill('#f7f9f8');
        doc.roundedRect(300, yInfo, 255, 70, 10).fill('#f7f9f8');
        doc.font('Helvetica-Bold').fontSize(9).fillColor(verde)
          .text('VENDEDOR', 52, yInfo + 12);
        doc.font('Helvetica').fontSize(10).fillColor('#24332d')
          .text(datos.vendedor, 52, yInfo + 30, { width: 226 });
        doc.font('Helvetica-Bold').fontSize(9).fillColor(verde)
          .text('CLIENTE', 312, yInfo + 12);
        doc.font('Helvetica').fontSize(10).fillColor('#24332d')
          .text(datos.cliente.nombre, 312, yInfo + 30, { width: 230 });
        const clienteExtra = [
          datos.cliente.carnet ? `CI: ${datos.cliente.carnet}` : null,
          datos.cliente.telefono ? `Tel: ${datos.cliente.telefono}` : null,
          datos.cliente.email,
        ].filter((v): v is string => Boolean(v));
        if (clienteExtra.length) {
          doc.fontSize(8).fillColor(gris)
            .text(clienteExtra.join(' · '), 312, yInfo + 46, { width: 230 });
        }
        doc.y = yInfo + 84;
        if (datos.cliente.direccion) {
          doc.font('Helvetica').fontSize(9).fillColor(gris)
            .text(`Dirección: ${datos.cliente.direccion}`, 40, doc.y, { width: 515 });
          doc.moveDown(0.6);
        }
        if (datos.cliente.ubicacion && datos.cliente.ubicacion !== datos.cliente.direccion) {
          doc.font('Helvetica').fontSize(9).fillColor(gris)
            .text(`Ubicación: ${datos.cliente.ubicacion}`, 40, doc.y, { width: 515 });
          doc.moveDown(0.6);
        }

        // ---- Tabla de ítems ----
        const col = { producto: 40, cantidad: 300, precio: 370, subtotal: 460 };
        const ancho = { producto: 250, cantidad: 60, precio: 80, subtotal: 75 };
        const yTabla = doc.y;
        doc.rect(40, yTabla, 515, 24).fill(verde);
        doc.font('Helvetica-Bold').fontSize(9).fillColor('#ffffff')
          .text('CÓDIGO / PRODUCTO', col.producto + 6, yTabla + 8, { width: ancho.producto - 12 })
          .text('CANT.', col.cantidad, yTabla + 8, { width: ancho.cantidad, align: 'center' })
          .text('P. UNITARIO', col.precio, yTabla + 8, { width: ancho.precio, align: 'right' })
          .text('SUBTOTAL', col.subtotal, yTabla + 8, { width: ancho.subtotal, align: 'right' });
        doc.y = yTabla + 24;

        if (datos.items.length === 0) {
          doc.font('Helvetica').fontSize(9).fillColor(gris)
            .text('Sin ítems registrados.', col.producto + 6, doc.y + 8);
          doc.moveDown(1);
        }

        datos.items.forEach((item, index) => {
          const descripcion = `${item.codigo} — ${item.nombre}`;
          const altoTexto = doc
            .font('Helvetica')
            .fontSize(9)
            .heightOfString(descripcion, { width: ancho.producto - 12 });
          const altoFila = Math.max(24, altoTexto + 12);
          const yFila = doc.y;

          if (index % 2 === 1) {
            doc.rect(40, yFila, 515, altoFila).fill('#fafbfa');
          }
          doc.font('Helvetica').fontSize(9).fillColor('#24332d')
            .text(descripcion, col.producto + 6, yFila + 6, { width: ancho.producto - 12 })
            .text(String(item.cantidad), col.cantidad, yFila + 6, {
              width: ancho.cantidad,
              align: 'center',
            })
            .text(money(item.precioUnitario), col.precio, yFila + 6, {
              width: ancho.precio,
              align: 'right',
            })
            .text(money(item.subtotal), col.subtotal, yFila + 6, {
              width: ancho.subtotal,
              align: 'right',
            });

          doc.strokeColor('#e3e9e6').lineWidth(0.5)
            .moveTo(40, yFila + altoFila)
            .lineTo(555, yFila + altoFila)
            .stroke();
          doc.y = yFila + altoFila;
        });

        // ---- Totales ----
        doc.moveDown(1);
        const xEtiqueta = 350;
        const xValor = 460;
        const fila = (etiqueta: string, valor: string, enfatizada = false) => {
          const y = doc.y;
          doc.font(enfatizada ? 'Helvetica-Bold' : 'Helvetica')
            .fontSize(enfatizada ? 12 : 10)
            .fillColor(enfatizada ? verde : '#24332d')
            .text(etiqueta, xEtiqueta, y, { width: 105, align: 'right' })
            .text(valor, xValor, y, { width: 75, align: 'right' });
          doc.moveDown(enfatizada ? 0.8 : 0.45);
        };

        fila('Subtotal:', money(datos.subtotal));
        if (datos.descuento > 0) fila('Descuento:', `- ${money(datos.descuento)}`);
        if (datos.impuesto > 0) fila(`Impuesto (${cfg.impuesto_porcentaje}%):`, money(datos.impuesto));
        fila('TOTAL GENERAL:', money(datos.total), true);
        fila('Monto pagado:', money(datos.pagado));
        if (datos.saldo > 0) fila('Saldo pendiente:', money(datos.saldo), true);

        doc.moveDown(1.2);
        const yLinea = Math.min(doc.y, 760);
        doc.strokeColor(verde).lineWidth(1)
          .moveTo(40, yLinea)
          .lineTo(555, yLinea)
          .stroke();
        doc.font('Helvetica').fontSize(8).fillColor(gris)
          .text(`Estado del pedido: ${datos.estado}`, 40, Math.min(yLinea + 10, 772), {
            width: 515,
            align: 'center',
            lineBreak: false,
          });

        // ---- Pie de página en TODAS las páginas ----
        // Se usa una y por encima de maxY para que pdfkit no dispare un salto
        // de página automático al medir la línea del pie.
        const rango = doc.bufferedPageRange();
        const yPie = Math.min(doc.page.height - 62, 780);
        for (let i = rango.start; i < rango.start + rango.count; i++) {
          doc.switchToPage(i);
          doc.font('Helvetica').fontSize(8).fillColor('#7a847f')
            .text(PIE, 40, yPie, {
              width: 515,
              align: 'center',
              lineBreak: false,
            });
        }

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}

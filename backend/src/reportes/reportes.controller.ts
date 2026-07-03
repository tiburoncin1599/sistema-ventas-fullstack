import {
  Controller,
  Get,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { ReportesService } from './reportes.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import PDFDocument from 'pdfkit';
import { join } from 'path';
import { existsSync, readFileSync } from 'fs';

let logoBuffer: Buffer | null = null;
let logoWidth = 0;
let logoHeight = 0;

function readImageSize(buf: Buffer): { width: number; height: number } | null {
  try {
    if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
      return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
    }
    if (buf[0] === 0xff && buf[1] === 0xd8) {
      let i = 2;
      while (i < buf.length) {
        if (buf[i] !== 0xff) { i++; continue; }
        if (buf[i + 1] === 0xc0 || buf[i + 1] === 0xc2) {
          return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
        }
        i += 2 + buf.readUInt16BE(i + 2);
      }
    }
  } catch {}
  return null;
}

(() => {
  const cwd = process.cwd();
  const candidates = [
    { path: join(cwd, 'assets', 'logo.jpg'), label: 'assets/logo.jpg' },
    { path: join(cwd, 'assets', 'logo.png'), label: 'assets/logo.png' },
  ];
  for (const { path: fp, label } of candidates) {
    try {
      if (existsSync(fp)) {
        logoBuffer = readFileSync(fp);
        const dim = readImageSize(logoBuffer);
        if (dim) { logoWidth = dim.width; logoHeight = dim.height; }
        console.log('[Reportes] Logo cargado:', label, logoBuffer.length, 'bytes', dim ? `${dim.width}x${dim.height}` : '');
        break;
      }
    } catch (err) {
      console.error('[Reportes] Error leyendo', fp, ':', err);
    }
  }
  if (!logoBuffer) console.warn('[Reportes] No se encontró logo para marca de agua');
})();

@Controller('reportes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'ventas')
export class ReportesController {
  constructor(private readonly reportesService: ReportesService) {}

  @Get('ventas-por-fecha')
  ventasPorFecha(
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    return this.reportesService.ventasPorFecha(desde, hasta);
  }

  @Get('ventas-por-producto')
  ventasPorProducto(
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
    @Query('categoria_id') categoria_id?: string,
  ) {
    return this.reportesService.ventasPorProducto(
      desde,
      hasta,
      categoria_id ? +categoria_id : undefined,
    );
  }

  @Get('ventas-por-categoria')
  ventasPorCategoria(
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    return this.reportesService.ventasPorCategoria(desde, hasta);
  }

  @Get('ganancias')
  ganancias(
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    return this.reportesService.ganancias(desde, hasta);
  }

  @Get('inventario')
  inventarioActual() {
    return this.reportesService.inventarioActual();
  }

  @Get('clientes-frecuentes')
  clientesFrecuentes() {
    return this.reportesService.clientesFrecuentes();
  }

  @Get('exportar/csv')
  async exportarCSV(
    @Res() res: Response,
    @Query('tipo') tipo: string,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    const csv = await this.reportesService.exportarCSV(tipo, desde, hasta);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${tipo}-${Date.now()}.csv"`);
    res.send(csv);
  }

  @Get('exportar/pdf')
  async exportarPDF(
    @Res() res: Response,
    @Query('tipo') tipo: string,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    let data: Record<string, unknown>[];
    let titulo: string;

    switch (tipo) {
      case 'ventas-por-fecha':
        data = await this.reportesService.ventasPorFecha(desde, hasta);
        titulo = 'Reporte de Ventas por Fecha';
        break;
      case 'ganancias':
        data = await this.reportesService.ganancias(desde, hasta);
        titulo = 'Reporte de Ganancias';
        break;
      case 'inventario':
        data = await this.reportesService.inventarioActual();
        titulo = 'Reporte de Inventario';
        break;
      default:
        data = [];
        titulo = 'Reporte';
    }

    const doc = new PDFDocument({ margin: 30, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${tipo}-${Date.now()}.pdf"`);
    doc.pipe(res);

    const drawWatermark = () => {
      const savedY = doc.y;
      const pageW = doc.page.width;
      const pageH = doc.page.height;
      const wmWidth = pageW * 0.60;
      const wmX = (pageW - wmWidth) / 2;

      doc.save();
      doc.opacity(0.12);

      if (logoBuffer && logoHeight > 0 && logoWidth > 0) {
        const wmHeight = wmWidth * (logoHeight / logoWidth);
        doc.image(logoBuffer, wmX, (pageH - wmHeight) / 2, { width: wmWidth });
      } else if (logoBuffer) {
        doc.image(logoBuffer, wmX, (pageH - wmWidth) / 2, { width: wmWidth });
      }

      doc.restore();
      doc.y = savedY;
    };
    drawWatermark();
    doc.on('pageAdded', () => { drawWatermark(); });

    doc.fontSize(18).text(titulo, { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).text(`Generado: ${new Date().toLocaleDateString()}`, { align: 'right' });
    doc.moveDown();

    if (data.length > 0) {
      const headers = Object.keys(data[0]);
      const tableTop = doc.y;
      const colWidth = Math.min(120, (doc.page.width - 60) / headers.length);

      doc.fontSize(8).font('Helvetica-Bold');
      headers.forEach((h, i) => {
        doc.text(h, 30 + i * colWidth, tableTop, { width: colWidth, align: 'left' });
      });
      doc.moveDown();

      doc.font('Helvetica').fontSize(7);
      data.forEach((row, rowIdx) => {
        const y = doc.y;
        if (y > doc.page.height - 50) {
          doc.addPage();
        }
        headers.forEach((h, i) => {
          const val = row[h]?.toString() || '';
          doc.text(val, 30 + i * colWidth, doc.y, { width: colWidth, align: 'left' });
        });
        if (rowIdx < data.length - 1) doc.moveDown(0.3);
      });
    }

    doc.end();
  }
}

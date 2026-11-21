import {
  BadRequestException,
  Controller,
  Get,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ReportesService, FiltrosEfectivos } from './reportes.service';
import { FiltroReportesDto } from './dto/filtro-reportes.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ROLES, normalizarRol } from '../auth/roles.constant';
import { instalarMarcaAgua } from '../common/pdf-watermark';

// La nomenclatura real del sistema es `admin` / `ventas`
// (equivalente a ADMIN / VENDEDOR en la documentación de tesis).
@Controller('reportes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'ventas')
export class ReportesController {
  constructor(private readonly reportesService: ReportesService) {}

  /**
   * Un usuario con rol `ventas` nunca puede consultar las ventas de otro:
   * se fuerza su propio id aunque el cliente envíe `vendedorId`.
   */
  private filtrosDe(
    req: Request,
    filtros: Partial<FiltroReportesDto>,
  ): FiltrosEfectivos {
    const user = req.user as { id: number; rol: string };
    return {
      fechaInicio: filtros.fechaInicio ?? filtros.desde,
      fechaFin: filtros.fechaFin ?? filtros.hasta,
      productoId: filtros.productoId,
      vendedorId:
        normalizarRol(user.rol) === ROLES.VENTAS ? user.id : filtros.vendedorId,
      categoriaId: filtros.categoriaId ?? filtros.categoria_id,
      tipo: filtros.tipo,
      usuarioId: filtros.usuarioId,
      agrupacion: filtros.agrupacion,
    };
  }

  @Get('ventas-por-fecha')
  ventasPorFecha(@Req() req: Request, @Query() filtros: FiltroReportesDto) {
    return this.reportesService.ventasPorFecha(this.filtrosDe(req, filtros));
  }

  @Get('ventas-personal-por-dia')
  ventasPersonalPorDia(
    @Req() req: Request,
    @Query() filtros: FiltroReportesDto,
  ) {
    const user = req.user as { id: number; rol: string };
    // Un vendedor solo puede consultar su propio rendimiento: se ignora
    // cualquier usuarioId recibido desde el cliente.
    const uid =
      normalizarRol(user.rol) === ROLES.VENTAS
        ? user.id
        : filtros.usuarioId;
    const { fechaInicio, fechaFin } = this.filtrosDe(req, filtros);
    return this.reportesService.ventasPersonalPorDia(
      uid,
      fechaInicio,
      fechaFin,
    );
  }

  @Get('ventas-por-producto')
  ventasPorProducto(
    @Req() req: Request,
    @Query() filtros: FiltroReportesDto,
  ) {
    const f = this.filtrosDe(req, filtros);
    return this.reportesService.ventasPorProducto(
      f.fechaInicio,
      f.fechaFin,
      f.categoriaId,
      f.vendedorId,
      f.productoId,
    );
  }

  @Get('ventas-por-categoria')
  ventasPorCategoria(
    @Req() req: Request,
    @Query() filtros: FiltroReportesDto,
  ) {
    const f = this.filtrosDe(req, filtros);
    return this.reportesService.ventasPorCategoria(
      f.fechaInicio,
      f.fechaFin,
      f.vendedorId,
    );
  }

  @Get('ganancias')
  ganancias(@Req() req: Request, @Query() filtros: FiltroReportesDto) {
    return this.reportesService.ganancias(this.filtrosDe(req, filtros));
  }

  @Get('top-productos')
  topProductos(@Req() req: Request, @Query() filtros: FiltroReportesDto) {
    return this.reportesService.topProductos(this.filtrosDe(req, filtros));
  }

  @Get('inventario')
  inventarioActual() {
    return this.reportesService.inventarioActual();
  }

  @Get('clientes-frecuentes')
  clientesFrecuentes(@Req() req: Request) {
    const { vendedorId } = this.filtrosDe(req, {});
    return this.reportesService.clientesFrecuentes(vendedorId);
  }

  @Get('exportar/csv')
  async exportarCSV(
    @Req() req: Request,
    @Res() res: Response,
    @Query() filtros: FiltroReportesDto,
  ) {
    const tipo = filtros.tipo;
    if (!tipo) {
      throw new BadRequestException('tipo es requerido para exportar');
    }
    // Exportaciones y JSON comparten los mismos filtros canónicos y el scope.
    const efectivos = this.filtrosDe(req, filtros);
    const csv = await this.reportesService.exportarCSV(tipo, efectivos);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${tipo}-${Date.now()}.csv"`);
    res.send(csv);
  }

  @Get('exportar/pdf')
  async exportarPDF(
    @Req() req: Request,
    @Res() res: Response,
    @Query() filtros: FiltroReportesDto,
  ) {
    const tipo = filtros.tipo;
    if (!tipo) {
      throw new BadRequestException('tipo es requerido para exportar');
    }
    const f = this.filtrosDe(req, filtros);
    let data: Record<string, unknown>[];
    let titulo: string;

    switch (tipo) {
      case 'ventas-por-fecha':
        data = await this.reportesService.ventasPorFecha(f);
        titulo = 'Reporte de Ventas por Fecha';
        break;
      case 'ganancias':
        data = [await this.reportesService.ganancias(f)];
        titulo = 'Reporte de Ganancias';
        break;
      case 'top-productos': {
        const top = await this.reportesService.topProductos(f);
        data = top.masVendidos as unknown as Record<string, unknown>[];
        titulo = 'Reporte de Top Productos';
        break;
      }
      case 'ventas-por-producto':
        data = await this.reportesService.ventasPorProducto(
          f.fechaInicio,
          f.fechaFin,
          f.categoriaId,
          f.vendedorId,
          f.productoId,
        );
        titulo = 'Reporte de Ventas por Producto';
        break;
      case 'ventas-por-categoria':
        data = await this.reportesService.ventasPorCategoria(
          f.fechaInicio,
          f.fechaFin,
          f.vendedorId,
        );
        titulo = 'Reporte de Ventas por Categoría';
        break;
      case 'inventario':
        data = await this.reportesService.inventarioActual();
        titulo = 'Reporte de Inventario';
        break;
      case 'clientes':
        data = await this.reportesService.clientesFrecuentes(f.vendedorId);
        titulo = 'Reporte de Clientes Frecuentes';
        break;
      default:
        data = [];
        titulo = 'Reporte';
    }

    const PDFDocument = (await import('pdfkit')).default;
    const doc = new PDFDocument({ margin: 30, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${tipo}-${Date.now()}.pdf"`);
    doc.pipe(res);

    instalarMarcaAgua(doc);

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
        const yFila = doc.y;
        if (yFila > doc.page.height - 50) {
          doc.addPage();
        }
        headers.forEach((h, i) => {
          const val = row[h]?.toString() || '';
          doc.text(val, 30 + i * colWidth, yFila, { width: colWidth, align: 'left' });
        });
        if (rowIdx < data.length - 1) doc.moveDown(0.3);
      });
    }

    doc.end();
  }
}

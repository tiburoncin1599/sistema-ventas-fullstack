import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
  Res,
  Header,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { DeudasService } from './deudas.service';
import { CrearDeudaDto } from './dto/crear-deuda.dto';
import { PagarDeudaDto } from './dto/pagar-deuda.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { Response, Request } from 'express';
import { instalarMarcaAgua } from '../common/pdf-watermark';
import { normalizarRol } from '../auth/roles.constant';

@Controller('deudas')
export class DeudasController {
  constructor(private readonly deudasService: DeudasService) {}

  /** Parámetros de fecha opcionales; `hasta` se usa como día inclusive. */
  private fechaDe(valor?: string): Date | undefined {
    if (!valor) return undefined;
    const fecha = new Date(valor);
    if (Number.isNaN(fecha.getTime())) {
      throw new BadRequestException('Fecha inválida');
    }
    return fecha;
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'inventario', 'ventas')
  findAll(
    @Req() req: Request,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    const user = req.user as { id: number; rol: string };
    // Un vendedor solo ve las deudas de sus propias operaciones.
    const vendedorId =
      normalizarRol(user.rol) === 'ventas' ? user.id : undefined;
    return this.deudasService.findAll(
      Number(page) || 1,
      Number(limit) || 50,
      vendedorId,
      this.fechaDe(desde),
      this.fechaDe(hasta),
    );
  }

  @Get('resumen')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'inventario', 'ventas')
  resumen(
    @Req() req: Request,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    const user = req.user as { id: number; rol: string };
    const vendedorId =
      normalizarRol(user.rol) === 'ventas' ? user.id : undefined;
    return this.deudasService.resumen(
      vendedorId,
      this.fechaDe(desde),
      this.fechaDe(hasta),
    );
  }

  @Get('usuario/:id')
  @UseGuards(JwtAuthGuard)
  async findByUsuario(
    @Param('id') id: string,
    @Req() req: { user?: { id: number; rol: string } },
  ) {
    const user = req.user as { id: number; rol: string };
    if (normalizarRol(user.rol) === 'cliente' && user.id !== +id) {
      throw new ForbiddenException('No tienes acceso a estas deudas');
    }
    // Un vendedor solo consulta las deudas que gestiona él mismo.
    const vendedorId = normalizarRol(user.rol) === 'ventas' ? user.id : undefined;
    return this.deudasService.findByUsuario(+id, vendedorId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(
    @Param('id') id: string,
    @Req() req: { user?: { id: number; rol: string } },
  ) {
    const deuda = await this.deudasService.findOne(+id);
    const user = req.user as { id: number; rol: string };
    if (normalizarRol(user.rol) === 'cliente' && deuda.usuario_id !== user.id) {
      throw new ForbiddenException('No tienes acceso a esta deuda');
    }
    if (normalizarRol(user.rol) === 'ventas' && deuda.vendedor_id !== user.id) {
      throw new ForbiddenException('No tienes acceso a esta deuda');
    }
    return deuda;
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  // Política de negocio: INVENTARIO sólo consulta; VENTAS gestiona cobranzas
  // desde su propio panel, pero no registra deudas manuales.
  @Roles('admin')
  crear(@Body() body: CrearDeudaDto, @Req() req: Request) {
    const user = req.user as { id: number; rol: string };
    // Sólo ADMIN crea deudas manuales; puede elegir el responsable o dejar
    // la deuda asignada a quien la registra.
    const vendedorId = body.vendedorId ?? user.id;
    return this.deudasService.crear(
      body.usuarioId,
      body.monto,
      body.descripcion,
      vendedorId,
    );
  }

  @Put(':id/pagar')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  pagar(@Param('id') id: string, @Body() body: PagarDeudaDto) {
    return this.deudasService.pagar(+id, body.monto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  eliminar(@Param('id') id: string) {
    return this.deudasService.eliminar(+id);
  }

  @Get(':id/factura/pdf')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'inventario', 'ventas')
  @Header('Content-Type', 'application/pdf')
  @Header('Content-Disposition', 'attachment; filename=factura-deuda.pdf')
  async facturaPDF(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const deuda = await this.deudasService.findOne(+id);
    const user = req.user as { id: number; rol: string };
    if (normalizarRol(user.rol) === 'ventas' && deuda.vendedor_id !== user.id) {
      throw new ForbiddenException('No tienes acceso a esta deuda');
    }
    const PDFDocument = (await import('pdfkit')).default;
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    doc.pipe(res);

    instalarMarcaAgua(doc);

    doc
      .fontSize(22)
      .font('Helvetica-Bold')
      .text('COMPROBANTE DE PAGO', { align: 'center' });
    doc.moveDown(0.5);
    doc
      .fontSize(12)
      .font('Helvetica')
      .text(`Deuda #${deuda.id}`, { align: 'center' });
    doc.text(
      `Fecha: ${new Date(deuda.fecha_pago || deuda.fecha_creacion).toLocaleDateString('es-AR')}`,
      { align: 'center' },
    );
    doc.moveDown(1);

    doc.fontSize(12).font('Helvetica-Bold').text('Datos');
    doc.moveDown(0.3);
    doc.font('Helvetica').fontSize(10);
    doc.text(`Personal: ${deuda.usuario?.nombre || ''}`);
    doc.text(`Descripción: ${deuda.descripcion || ''}`);
    doc.moveDown(0.5);

    doc.moveTo(40, doc.y).lineTo(550, doc.y).stroke('#ccc');
    doc.moveDown(0.5);

    const leftX = 40,
      rightX = 400;
    doc.font('Helvetica').fontSize(10);
    doc.text('Monto total:', leftX, doc.y);
    doc.text(`Bs${Number(deuda.monto).toFixed(2)}`, rightX, doc.y, {
      width: 150,
      align: 'right',
    });
    doc.moveDown(0.5);

    doc.text('Monto pagado:', leftX, doc.y);
    doc.text(`Bs${Number(deuda.monto_pagado).toFixed(2)}`, rightX, doc.y, {
      width: 150,
      align: 'right',
    });
    doc.moveDown(0.5);

    const saldo = deuda.monto - deuda.monto_pagado;
    doc.text('Saldo pendiente:', leftX, doc.y);
    doc.text(`Bs${Number(saldo).toFixed(2)}`, rightX, doc.y, {
      width: 150,
      align: 'right',
    });
    doc.moveDown(0.5);

    doc.moveTo(40, doc.y).lineTo(550, doc.y).stroke('#ccc');
    doc.moveDown(0.5);

    doc.font('Helvetica-Bold').fontSize(12);
    doc.text('Estado: ', leftX, doc.y);
    doc.text(deuda.estado.toUpperCase(), rightX, doc.y, {
      width: 150,
      align: 'right',
    });

    doc.end();
  }
}

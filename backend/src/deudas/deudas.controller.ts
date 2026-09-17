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
} from '@nestjs/common';
import { DeudasService } from './deudas.service';
import { CrearDeudaDto } from './dto/crear-deuda.dto';
import { PagarDeudaDto } from './dto/pagar-deuda.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { Response, Request } from 'express';
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
        console.log('[Deudas] Logo cargado:', label, logoBuffer.length, 'bytes', dim ? `${dim.width}x${dim.height}` : '');
        break;
      }
    } catch (err) {
      console.error('[Deudas] Error leyendo', fp, ':', err);
    }
  }
  if (!logoBuffer) console.warn('[Deudas] No se encontró logo para marca de agua');
})();

@Controller('deudas')
export class DeudasController {
  constructor(private readonly deudasService: DeudasService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'inventario', 'ventas')
  findAll(
    @Req() req: Request,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const user = req.user as { id: number; rol: string };
    // Un vendedor solo ve las deudas de sus propias operaciones.
    const vendedorId = user.rol === 'ventas' ? user.id : undefined;
    return this.deudasService.findAll(Number(page) || 1, Number(limit) || 50, vendedorId);
  }

  @Get('resumen')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'inventario', 'ventas')
  resumen(@Req() req: Request) {
    const user = req.user as { id: number; rol: string };
    const vendedorId = user.rol === 'ventas' ? user.id : undefined;
    return this.deudasService.resumen(vendedorId);
  }

  @Get('usuario/:id')
  @UseGuards(JwtAuthGuard)
  async findByUsuario(
    @Param('id') id: string,
    @Req() req: { user?: { id: number; rol: string } },
  ) {
    const user = req.user as { id: number; rol: string };
    if (user.rol === 'cliente' && user.id !== +id) {
      throw new ForbiddenException('No tienes acceso a estas deudas');
    }
    // Un vendedor solo consulta las deudas que gestiona él mismo.
    const vendedorId = user.rol === 'ventas' ? user.id : undefined;
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
    if (user.rol === 'cliente' && deuda.usuario_id !== user.id) {
      throw new ForbiddenException('No tienes acceso a esta deuda');
    }
    if (user.rol === 'ventas' && deuda.vendedor_id !== user.id) {
      throw new ForbiddenException('No tienes acceso a esta deuda');
    }
    return deuda;
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'inventario', 'ventas')
  crear(@Body() body: CrearDeudaDto, @Req() req: Request) {
    const user = req.user as { id: number; rol: string };
    // El vendedor sólo puede registrar deudas a su nombre; admin/inventario
    // pueden elegir el personal responsable o quedar asignadas a quien crea.
    const vendedorId =
      user.rol === 'ventas' ? user.id : body.vendedorId ?? user.id;
    return this.deudasService.crear(
      body.usuarioId,
      body.monto,
      body.descripcion,
      vendedorId,
    );
  }

  @Put(':id/pagar')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'inventario')
  pagar(@Param('id') id: string, @Body() body: PagarDeudaDto) {
    return this.deudasService.pagar(+id, body.monto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'inventario')
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
    if (user.rol === 'ventas' && deuda.vendedor_id !== user.id) {
      throw new ForbiddenException('No tienes acceso a esta deuda');
    }
    const PDFDocument = (await import('pdfkit')).default;
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
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

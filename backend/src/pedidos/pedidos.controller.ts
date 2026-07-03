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
  Res,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PedidosService } from './pedidos.service';
import { CrearPedidoDto } from './dto/crear-pedido.dto';
import { ActualizarEstadoDto } from './dto/actualizar-estado.dto';
import { AgregarItemsDto } from './dto/agregar-items.dto';
import { ActualizarItemDto } from './dto/actualizar-item.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { Response, Request } from 'express';
import * as QRCode from 'qrcode';
import { ConfiguracionService } from '../configuracion/configuracion.service';
import { FacturaService } from './factura.service';

@Controller('pedidos')
export class PedidosController {
  constructor(
    private readonly pedidosService: PedidosService,
    private readonly configuracionService: ConfiguracionService,
    private readonly facturaService: FacturaService,
    private readonly jwtService: JwtService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'inventario', 'ventas')
  async findAll(
    @Query('estado') estado?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const p = Number(page) || 1;
    const l = Number(limit) || 50;
    if (estado) return this.pedidosService.findAllByEstado(estado, p, l);
    return this.pedidosService.findAll(p, l);
  }

  @Get('usuario/:id')
  @UseGuards(JwtAuthGuard)
  findByUsuario(@Param('id') id: string) {
    return this.pedidosService.findByUsuario(+id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string, @Req() req: Request) {
    const pedido = await this.pedidosService.findOne(+id);
    const user = req.user as { id: number; rol: string };
    if (user.rol === 'cliente' && pedido.usuario_id !== user.id) {
      throw new ForbiddenException('No tienes acceso a este pedido');
    }
    const detalles = await this.pedidosService.findDetalles(+id);
    return { ...pedido, detalles };
  }

  @Get(':id/factura')
  @UseGuards(JwtAuthGuard)
  async factura(@Param('id') id: string) {
    return this.pedidosService.findFactura(+id);
  }

  @Get(':id/factura/pdf')
  async facturaPDF(
    @Param('id') id: string,
    @Query('token') qToken: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader?.replace('Bearer ', '') || qToken || '';
      if (!token) {
        return res.status(401).json({
          statusCode: 401,
          message: 'Token de autenticación requerido',
        });
      }
      try {
        const payload = this.jwtService.verify(token);
        (req as any).user = payload;
      } catch {
        return res.status(401).json({
          statusCode: 401,
          message: 'Token inválido o expirado',
        });
      }
      const data = await this.pedidosService.findFactura(+id);
      const configuracion = await this.configuracionService.obtener();
      const pdfBuffer = await this.facturaService.generarFacturaPDF({
        ...data,
        configuracion,
      });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=factura-${id}.pdf`);
      res.setHeader('Content-Length', pdfBuffer.length.toString());
      res.end(pdfBuffer);
    } catch (err) {
      console.error('Error generando factura PDF:', (err as Error).message);
      if (!res.headersSent) {
        res.status(500).json({
          statusCode: 500,
          message: 'Error al generar la factura PDF',
          error: (err as Error).message,
        });
      }
    }
  }

  @Get(':id/factura/qr')
  @UseGuards(JwtAuthGuard)
  async facturaQR(@Param('id') id: string, @Req() req: Request) {
    const baseUrl =
      process.env.API_URL || 'https://web-production-c811d.up.railway.app';
    const token = req.headers.authorization?.replace('Bearer ', '') || '';
    const pdfUrl = token
      ? `${baseUrl}/pedidos/${id}/factura/pdf?token=${encodeURIComponent(token)}`
      : `${baseUrl}/pedidos/${id}/factura/pdf`;
    const qr = await QRCode.toDataURL(pdfUrl);
    return { qr, pdf_url: pdfUrl, pedido_id: id };
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  crear(@Body() body: CrearPedidoDto) {
    return this.pedidosService.crear(
      body.usuarioId,
      body.direccion,
      body.items,
      body.notas,
      body.procesadoPor,
    );
  }

  @Get('ventas/personal')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'inventario', 'ventas')
  async ventasPersonal(
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    return this.pedidosService.ventasPersonal(
      desde ? new Date(desde) : undefined,
      hasta ? new Date(hasta) : undefined,
    );
  }

  @Put(':id/estado')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'inventario')
  actualizarEstado(@Param('id') id: string, @Body() body: ActualizarEstadoDto) {
    return this.pedidosService.actualizarEstado(+id, body.estado);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  eliminar(@Param('id') id: string) {
    return this.pedidosService.eliminar(+id);
  }

  @Post(':id/items')
  @UseGuards(JwtAuthGuard)
  agregarItems(@Param('id') id: string, @Body() body: AgregarItemsDto) {
    return this.pedidosService.agregarItems(+id, body.items);
  }

  @Delete(':id/items/:itemId')
  @UseGuards(JwtAuthGuard)
  eliminarItem(@Param('id') id: string, @Param('itemId') itemId: string) {
    return this.pedidosService.eliminarItem(+id, +itemId);
  }

  @Put(':id/items/:itemId')
  @UseGuards(JwtAuthGuard)
  actualizarItemCantidad(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() body: ActualizarItemDto,
  ) {
    return this.pedidosService.actualizarItemCantidad(
      +id,
      +itemId,
      body.cantidad,
    );
  }
}

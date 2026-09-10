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
import { ROLES } from '../auth/roles.constant';
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

  /** Un cliente solo puede acceder a sus propios pedidos; el personal, a todos. */
  private async verificarAcceso(pedidoId: number, user: { id: number; rol: string }) {
    if (user.rol === 'cliente') {
      const pedido = await this.pedidosService.findOne(pedidoId);
      if (pedido.usuario_id !== user.id) {
        throw new ForbiddenException('No tienes acceso a este pedido');
      }
    }
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLES.ADMIN, ROLES.INVENTARIO, ROLES.VENTAS)
  async findAll(
    @Query('estado') estado?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const p = Math.max(1, Number(page) || 1);
    const l = Math.min(100, Math.max(1, Number(limit) || 50));
    if (estado) return this.pedidosService.findAllByEstado(estado, p, l);
    return this.pedidosService.findAll(p, l);
  }

  @Get('usuario/:id')
  @UseGuards(JwtAuthGuard)
  async findByUsuario(@Param('id') id: string, @Req() req: Request) {
    const user = req.user as { id: number; rol: string };
    if (user.rol === 'cliente' && user.id !== +id) {
      throw new ForbiddenException('No tienes acceso a estos pedidos');
    }
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
  async factura(@Param('id') id: string, @Req() req: Request) {
    await this.verificarAcceso(+id, req.user as { id: number; rol: string });
    return this.pedidosService.findFactura(+id);
  }

  @Get(':id/factura/pdf')
  async facturaPDF(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader?.startsWith('Bearer ')
        ? authHeader.slice(7)
        : '';
      if (!token) {
        return res.status(401).json({
          statusCode: 401,
          message: 'Token de autenticación requerido',
        });
      }
      let payload: { id: number; rol: string };
      try {
        payload = this.jwtService.verify<{ id: number; rol: string }>(token);
        (req as unknown as { user: unknown }).user = payload;
      } catch {
        return res.status(401).json({
          statusCode: 401,
          message: 'Token inválido o expirado',
        });
      }
      const data = await this.pedidosService.findFactura(+id);
      await this.verificarAcceso(+id, payload);
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
  async facturaQR(@Param('id') id: string) {
    const baseUrl =
      process.env.API_URL || 'https://web-production-c811d.up.railway.app';
    const pdfUrl = `${baseUrl}/pedidos/${id}/factura/pdf`;
    const qr = await QRCode.toDataURL(pdfUrl);
    return { qr, pdf_url: pdfUrl, pedido_id: id };
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  crear(@Body() body: CrearPedidoDto, @Req() req: Request) {
    const user = req.user as { id: number; rol: string };
    // El usuario y el procesador se determinan en el servidor, no en el cliente
    const usuarioId = user.rol === 'cliente' ? user.id : body.usuarioId || user.id;
    const procesadoPor = user.rol === 'cliente' ? undefined : body.procesadoPor || user.id;
    return this.pedidosService.crear(
      usuarioId,
      body.direccion,
      body.items,
      body.notas,
      procesadoPor,
    );
  }

  @Get('ventas/personal')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLES.ADMIN, ROLES.INVENTARIO, ROLES.VENTAS)
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
  @Roles(ROLES.ADMIN, ROLES.INVENTARIO, ROLES.VENTAS)
  actualizarEstado(@Param('id') id: string, @Body() body: ActualizarEstadoDto) {
    return this.pedidosService.actualizarEstado(+id, body.estado);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLES.ADMIN, ROLES.INVENTARIO, ROLES.VENTAS)
  eliminar(@Param('id') id: string) {
    return this.pedidosService.eliminar(+id);
  }

  @Post(':id/items')
  @UseGuards(JwtAuthGuard)
  async agregarItems(
    @Param('id') id: string,
    @Body() body: AgregarItemsDto,
    @Req() req: Request,
  ) {
    await this.verificarAcceso(+id, req.user as { id: number; rol: string });
    return this.pedidosService.agregarItems(+id, body.items);
  }

  @Delete(':id/items/:itemId')
  @UseGuards(JwtAuthGuard)
  async eliminarItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Req() req: Request,
  ) {
    await this.verificarAcceso(+id, req.user as { id: number; rol: string });
    return this.pedidosService.eliminarItem(+id, +itemId);
  }

  @Put(':id/items/:itemId')
  @UseGuards(JwtAuthGuard)
  async actualizarItemCantidad(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() body: ActualizarItemDto,
    @Req() req: Request,
  ) {
    await this.verificarAcceso(+id, req.user as { id: number; rol: string });
    return this.pedidosService.actualizarItemCantidad(
      +id,
      +itemId,
      body.cantidad,
    );
  }
}

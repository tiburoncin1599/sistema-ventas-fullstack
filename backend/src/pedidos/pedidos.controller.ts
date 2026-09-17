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
import { AsignarVendedorDto } from './dto/asignar-vendedor.dto';
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

  /** Cliente: solo sus pedidos. Vendedor: solo los pedidos que le fueron asignados. */
  private async verificarAcceso(pedidoId: number, user: { id: number; rol: string }) {
    if (user.rol === 'ventas') {
      const pedido = await this.pedidosService.findOne(pedidoId);
      if (pedido.procesado_por !== user.id) {
        throw new ForbiddenException('No tienes acceso a este pedido');
      }
    }
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
    @Req() req: Request,
    @Query('estado') estado?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sinVendedor') sinVendedor?: string,
    @Query('vendedor') vendedor?: string,
  ) {
    const p = Math.max(1, Number(page) || 1);
    const l = Math.min(100, Math.max(1, Number(limit) || 50));
    const user = req.user as { id: number; rol: string };
    // Un vendedor solo trabaja con sus pedidos asignados; no puede listar otros.
    const procesadorId =
      user.rol === 'ventas'
        ? user.id
        : vendedor
          ? Number(vendedor)
          : undefined;
    const sinProcesador =
      user.rol !== 'ventas' && sinVendedor === 'true';
    return this.pedidosService.findAllFiltrado({
      estado,
      procesadorId,
      sinProcesador,
      page: p,
      limit: l,
    });
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
    await this.verificarAcceso(+id, req.user as { id: number; rol: string });
    const pedido = await this.pedidosService.findOne(+id);
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
  async facturaQR(@Param('id') id: string, @Req() req: Request) {
    await this.verificarAcceso(+id, req.user as { id: number; rol: string });
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
    // Solo el personal puede registrar el tipo de pago; un cliente externo no
    // puede auto-marcar su pedido como pagado.
    const tipoPago = user.rol === 'cliente' ? undefined : body.tipoPago;
    return this.pedidosService.crear(
      usuarioId,
      body.direccion,
      body.items,
      body.notas,
      procesadoPor,
      tipoPago,
    );
  }

  @Get('ventas/personal')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLES.ADMIN, ROLES.INVENTARIO, ROLES.VENTAS)
  async ventasPersonal(
    @Req() req: Request,
    @Query('usuarioId') usuarioId?: string,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    const user = req.user as { id: number; rol: string };
    // Un vendedor solo consulta su propio rendimiento, nunca el de otro.
    const uid =
      user.rol === 'ventas' ? String(user.id) : usuarioId;
    return this.pedidosService.ventasPersonal(
      desde ? new Date(desde) : undefined,
      hasta ? new Date(hasta) : undefined,
      uid ? +uid : undefined,
    );
  }

  @Put(':id/estado')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLES.ADMIN, ROLES.INVENTARIO, ROLES.VENTAS)
  async actualizarEstado(
    @Param('id') id: string,
    @Body() body: ActualizarEstadoDto,
    @Req() req: Request,
  ) {
    await this.verificarAcceso(+id, req.user as { id: number; rol: string });
    return this.pedidosService.actualizarEstado(+id, body.estado);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLES.ADMIN, ROLES.INVENTARIO, ROLES.VENTAS)
  async eliminar(@Param('id') id: string, @Req() req: Request) {
    await this.verificarAcceso(+id, req.user as { id: number; rol: string });
    return this.pedidosService.eliminar(+id);
  }

  @Put(':id/asignar-vendedor')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLES.ADMIN, ROLES.INVENTARIO)
  asignarVendedor(@Param('id') id: string, @Body() body: AsignarVendedorDto) {
    return this.pedidosService.asignarVendedor(+id, body.vendedorId);
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

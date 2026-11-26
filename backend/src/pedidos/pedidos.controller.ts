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
  BadRequestException,
  HttpException,
} from '@nestjs/common';
import { PedidosService } from './pedidos.service';
import { CrearPedidoDto } from './dto/crear-pedido.dto';
import { ActualizarEstadoDto } from './dto/actualizar-estado.dto';
import { AgregarItemsDto } from './dto/agregar-items.dto';
import { ActualizarItemDto } from './dto/actualizar-item.dto';
import { AsignarVendedorDto } from './dto/asignar-vendedor.dto';
import { ConfirmarPagoSandboxDto } from './dto/confirmar-pago-sandbox.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ROLES, normalizarRol } from '../auth/roles.constant';
import { type AuditorPedido } from './pedidos.service';
import { Response, Request } from 'express';
import * as QRCode from 'qrcode';
import { ConfiguracionService } from '../configuracion/configuracion.service';
import { FacturaService } from './factura.service';
import { ComprobantesService } from '../comprobantes/comprobantes.service';

@Controller('pedidos')
export class PedidosController {
  constructor(
    private readonly pedidosService: PedidosService,
    private readonly configuracionService: ConfiguracionService,
    private readonly facturaService: FacturaService,
    private readonly comprobantesService: ComprobantesService,
  ) {}

  /** Datos del ejecutor que se persisten dentro de la transacción. */
  private auditor(req: Request): AuditorPedido {
    const user = req.user as { id: number; rol: string; nombre?: string };
    return {
      usuario_id: user.id,
      usuario_rol: user.rol,
      usuario_nombre: user.nombre,
      ip: req.ip,
    };
  }

  /** Los handlers con `@Res()` deben traducir HttpException a su status real. */
  private responderErrorPdf(res: Response, err: unknown, mensaje: string): void {
    if (res.headersSent) return;
    const http = err as HttpException;
    if (typeof http.getStatus === 'function') {
      const status = http.getStatus();
      const body = typeof http.getResponse === 'function'
        ? http.getResponse()
        : { statusCode: status, message: http.message };
      res.status(status).json(body);
      return;
    }
    console.error(mensaje, (err as Error).message);
    res.status(500).json({ statusCode: 500, message: mensaje });
  }

  /** Cliente: solo sus pedidos. Vendedor: solo los pedidos que le fueron asignados. */
  private async verificarAcceso(pedidoId: number, user: { id: number; rol: string }) {
    const rol = normalizarRol(user.rol);
    if (rol === ROLES.VENTAS) {
      const pedido = await this.pedidosService.findOne(pedidoId);
      if (pedido.procesado_por !== user.id) {
        throw new ForbiddenException('No tienes acceso a este pedido');
      }
    }
    if (rol === ROLES.CLIENTE) {
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
    const esVendedor = normalizarRol(user.rol) === ROLES.VENTAS;
    // Un vendedor solo trabaja con sus pedidos asignados; no puede listar otros.
    const procesadorId = esVendedor
      ? user.id
      : vendedor
        ? Number(vendedor)
        : undefined;
    const sinProcesador = !esVendedor && sinVendedor === 'true';
    return this.pedidosService.findAllFiltrado({
      estado,
      procesadorId,
      sinProcesador,
      page: p,
      limit: l,
    });
  }

  @Get('usuario/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLES.ADMIN, ROLES.INVENTARIO, ROLES.VENTAS, ROLES.CLIENTE)
  async findByUsuario(@Param('id') id: string, @Req() req: Request) {
    const user = req.user as { id: number; rol: string };
    const usuarioId = +id;
    const rol = normalizarRol(user.rol);
    const personalConAcceso = rol === ROLES.ADMIN || rol === ROLES.INVENTARIO;
    // Vendedor y cliente solo pueden consultar su propio identificador.
    if (!personalConAcceso && user.id !== usuarioId) {
      throw new ForbiddenException('No tienes acceso a estos pedidos');
    }
    return this.pedidosService.findByUsuario(usuarioId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLES.ADMIN, ROLES.INVENTARIO, ROLES.VENTAS, ROLES.CLIENTE)
  async findOne(@Param('id') id: string, @Req() req: Request) {
    await this.verificarAcceso(+id, req.user as { id: number; rol: string });
    const pedido = await this.pedidosService.findOne(+id);
    const detalles = await this.pedidosService.findDetalles(+id);
    return { ...pedido, detalles };
  }

  @Get(':id/factura')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLES.ADMIN, ROLES.INVENTARIO, ROLES.VENTAS, ROLES.CLIENTE)
  async factura(@Param('id') id: string, @Req() req: Request) {
    await this.verificarAcceso(+id, req.user as { id: number; rol: string });
    return this.pedidosService.findFactura(+id);
  }

  @Get(':id/factura/pdf')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLES.ADMIN, ROLES.INVENTARIO, ROLES.VENTAS, ROLES.CLIENTE)
  async facturaPDF(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      // La propiedad se valida antes de leer el pedido o su factura.
      await this.verificarAcceso(+id, req.user as { id: number; rol: string });
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
      this.responderErrorPdf(res, err, 'Error al generar la factura PDF');
    }
  }

  @Get(':id/factura/qr')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLES.ADMIN, ROLES.INVENTARIO, ROLES.VENTAS, ROLES.CLIENTE)
  async facturaQR(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    try {
      await this.verificarAcceso(+id, req.user as { id: number; rol: string });
      const baseUrl =
        process.env.API_URL ||
        `${process.env.FRONTEND_URL || 'http://localhost:3000'}/api`;
      const pdfUrl = `${baseUrl}/pedidos/${id}/factura/pdf`;
      const qr = await QRCode.toDataURL(pdfUrl);
      res.setHeader('Content-Type', 'application/json');
      res.json({ qr, pdf_url: pdfUrl, pedido_id: +id });
    } catch (err) {
      this.responderErrorPdf(res, err, 'Error al generar el QR de la factura');
    }
  }

  /**
   * Comprobante comercial interno en PDF (inline, nunca como factura fiscal).
   * Acceso: admin, inventario, vendedor asignado o cliente dueño del pedido.
   * INVENTARIO consulta pedidos desde su panel, así que necesita el mismo
   * comprobante que la factura PDF.
   */
  @Get(':id/comprobante-pdf')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLES.ADMIN, ROLES.INVENTARIO, ROLES.VENTAS, ROLES.CLIENTE)
  async comprobantePdf(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      await this.verificarAcceso(+id, req.user as { id: number; rol: string });
      const pdfBuffer = await this.comprobantesService.generarComprobantePDF(+id);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `inline; filename="comprobante-${id}.pdf"`,
      );
      res.setHeader('Content-Length', pdfBuffer.length.toString());
      res.end(pdfBuffer);
    } catch (err) {
      if (!res.headersSent) {
        const http = err as HttpException;
        const status = typeof http.getStatus === 'function' ? http.getStatus() : 500;
        const body = typeof http.getResponse === 'function'
          ? http.getResponse()
          : { statusCode: status, message: 'Error al generar el comprobante PDF' };
        res.status(status).json(body);
      }
    }
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLES.ADMIN, ROLES.INVENTARIO, ROLES.VENTAS, ROLES.CLIENTE)
  async crear(@Body() body: CrearPedidoDto, @Req() req: Request) {
    const user = req.user as { id: number; rol: string };
    const rol = normalizarRol(user.rol);
    // El cliente nunca puede spoofear usuarioId/procesadoPor/tipoPago/montoPagado.
    const usuarioId = rol === ROLES.CLIENTE ? user.id : body.usuarioId || user.id;
    const procesadoPor = rol === ROLES.CLIENTE ? undefined : body.procesadoPor || user.id;
    // Se acepta la forma canónica `tipo_pago` y la legacy `tipoPago`.
    const tipoPago =
      rol === ROLES.CLIENTE ? undefined : (body.tipo_pago ?? body.tipoPago);
    const montoPagado = rol === ROLES.CLIENTE ? undefined : body.montoPagado;

    const pedido = await this.pedidosService.crear(
      usuarioId,
      body.direccion,
      body.items,
      body.notas,
      procesadoPor,
      tipoPago,
      montoPagado,
      this.auditor(req),
    );
    return {
      mensaje: 'Pedido creado correctamente',
      id: pedido.id,
      pedidoId: pedido.id,
    };
  }

  /**
   * Simulación de pasarela: el cliente confirma su propio pedido después de
   * "escanear" el QR o rellenar la tarjeta de prueba. La operación es atómica,
   * no descuenta stock dos veces y es idempotente por referencia.
   */
  @Post(':id/confirmar-pago-sandbox')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLES.ADMIN, ROLES.INVENTARIO, ROLES.VENTAS, ROLES.CLIENTE)
  async confirmarPagoSandbox(
    @Param('id') id: string,
    @Body() body: ConfirmarPagoSandboxDto,
    @Req() req: Request,
  ) {
    await this.verificarAcceso(+id, req.user as { id: number; rol: string });
    const resultado = await this.pedidosService.confirmarPagoSandbox(
      +id,
      body,
      this.auditor(req),
    );
    return { mensaje: 'Pago sandbox confirmado correctamente', ...resultado };
  }

  /** Parsea fechas de query y las rechaza explícitamente cuando no son válidas. */
  private fechaQuery(valor: string | undefined, nombre: string): Date | undefined {
    if (valor === undefined || valor === '') return undefined;
    const fecha = new Date(valor);
    if (Number.isNaN(fecha.getTime())) {
      throw new BadRequestException(`${nombre} debe ser una fecha válida`);
    }
    return fecha;
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
    const rol = normalizarRol(user.rol);
    // Un vendedor solo consulta su propio rendimiento, nunca el de otro.
    const uid = rol === ROLES.VENTAS ? user.id : usuarioId;
    let uidNumerico: number | undefined;
    if (uid !== undefined && uid !== '') {
      uidNumerico = typeof uid === 'number' ? uid : Number(uid);
      if (!Number.isInteger(uidNumerico) || uidNumerico < 1) {
        throw new BadRequestException('usuarioId debe ser un entero positivo');
      }
    }
    return this.pedidosService.ventasPersonal(
      this.fechaQuery(desde, 'desde'),
      this.fechaQuery(hasta, 'hasta'),
      uidNumerico,
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
    await this.pedidosService.actualizarEstado(
      +id,
      body.estado,
      this.auditor(req),
    );
    return this.pedidosService.findOne(+id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLES.ADMIN, ROLES.INVENTARIO, ROLES.VENTAS)
  async eliminar(@Param('id') id: string, @Req() req: Request) {
    await this.verificarAcceso(+id, req.user as { id: number; rol: string });
    await this.pedidosService.eliminar(+id, this.auditor(req));
    return { mensaje: 'Pedido cancelado correctamente' };
  }

  @Put(':id/asignar-vendedor')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLES.ADMIN, ROLES.INVENTARIO)
  async asignarVendedor(
    @Param('id') id: string,
    @Body() body: AsignarVendedorDto,
    @Req() req: Request,
  ) {
    return this.pedidosService.asignarVendedor(
      +id,
      body.vendedorId,
      this.auditor(req),
    );
  }

  @Post(':id/items')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLES.ADMIN, ROLES.INVENTARIO, ROLES.VENTAS)
  async agregarItems(
    @Param('id') id: string,
    @Body() body: AgregarItemsDto,
    @Req() req: Request,
  ) {
    await this.verificarAcceso(+id, req.user as { id: number; rol: string });
    await this.pedidosService.agregarItems(
      +id,
      body.items,
      this.auditor(req),
    );
    return this.pedidosService.findOne(+id);
  }

  @Delete(':id/items/:itemId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLES.ADMIN, ROLES.INVENTARIO, ROLES.VENTAS)
  async eliminarItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Req() req: Request,
  ) {
    await this.verificarAcceso(+id, req.user as { id: number; rol: string });
    return this.pedidosService.eliminarItem(
      +id,
      +itemId,
      this.auditor(req),
    );
  }

  @Put(':id/items/:itemId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLES.ADMIN, ROLES.INVENTARIO, ROLES.VENTAS)
  async actualizarItemCantidad(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() body: ActualizarItemDto,
    @Req() req: Request,
  ) {
    await this.verificarAcceso(+id, req.user as { id: number; rol: string });
    await this.pedidosService.actualizarItemCantidad(
      +id,
      +itemId,
      body.cantidad,
      this.auditor(req),
    );
    return this.pedidosService.findOne(+id);
  }
}

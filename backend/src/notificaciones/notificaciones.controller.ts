import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { NotificacionesService } from './notificaciones.service';
import { WhatsappService } from './whatsapp.service';
import {
  NotificarReporteDto,
  NotificarStockDto,
} from './dto/enviar-whatsapp.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

interface AuthRequest extends Request {
  user?: { id: number; rol: string };
}

@Controller('notificaciones')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'inventario', 'ventas')
export class NotificacionesController {
  constructor(
    private readonly notificacionesService: NotificacionesService,
    private readonly whatsappService: WhatsappService,
  ) {}

  @Get()
  obtenerAlertas() {
    return this.notificacionesService.obtenerAlertas();
  }

  /** Genera y registra el resumen ejecutivo por rango de fechas. */
  @Post('whatsapp/reporte')
  @Roles('admin', 'ventas')
  async enviarReporte(@Req() req: AuthRequest, @Body() dto: NotificarReporteDto) {
    const user = req.user as { id: number; rol: string };
    const mensaje = await this.whatsappService.generarMensajeReporteVentas(
      dto.fechaInicio,
      dto.fechaFin,
      // El rol ventas nunca debe incluir las ventas de otros vendedores.
      user.rol === 'ventas' ? user.id : undefined,
    );

    return this.whatsappService.enviarNotificacion(
      {
        tipo: 'REPORTE_VENTAS',
        mensaje,
        destinatario_telefono: dto.destinatarioTelefono,
        fechaInicio: dto.fechaInicio,
        fechaFin: dto.fechaFin,
      },
      user.id,
    );
  }

  /** Genera y registra la alerta de productos con stock <= 10. */
  @Post('whatsapp/alerta-stock')
  @Roles('admin', 'inventario')
  async enviarAlertaStock(
    @Req() req: AuthRequest,
    @Body() dto: NotificarStockDto,
  ) {
    const user = req.user as { id: number; rol: string };
    const mensaje = await this.whatsappService.generarMensajeStockBajo();

    return this.whatsappService.enviarNotificacion(
      {
        tipo: 'STOCK_BAJO',
        mensaje,
        destinatario_telefono: dto.destinatarioTelefono,
      },
      user.id,
    );
  }

  /** Historial paginado de eventos enviados/generados. */
  @Get('historial')
  historial(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.whatsappService.listarHistorial(
      Number(page) || 1,
      Number(limit) || 20,
    );
  }
}

import { Controller, Get, UseGuards } from '@nestjs/common';
import { NotificacionesService } from './notificaciones.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('notificaciones')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'inventario', 'ventas')
export class NotificacionesController {
  constructor(
    private readonly notificacionesService: NotificacionesService,
  ) {}

  @Get()
  obtenerAlertas() {
    return this.notificacionesService.obtenerAlertas();
  }
}

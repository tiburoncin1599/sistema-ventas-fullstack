import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'inventario', 'ventas')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  obtenerMetricas(@Req() req: Request) {
    const user = req.user as { rol: string };
    return this.dashboardService.obtenerMetricas(user.rol);
  }
}

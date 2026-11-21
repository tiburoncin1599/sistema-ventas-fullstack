import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { InventarioService } from './inventario.service';
import { ActualizarInventarioDto } from './dto/actualizar-inventario.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { Request } from 'express';

@Controller('inventario')
export class InventarioController {
  constructor(private readonly inventarioService: InventarioService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'inventario', 'ventas')
  findAll(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.inventarioService.findAll(Number(page) || 1, Number(limit) || 50);
  }

  @Get('alertas')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'inventario')
  alertas() {
    return this.inventarioService.alertas();
  }

  @Get(':productoId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'inventario')
  findOne(@Param('productoId') productoId: string) {
    return this.inventarioService.findOne(+productoId);
  }

  @Put(':productoId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'inventario')
  actualizar(
    @Param('productoId') productoId: string,
    @Body() body: ActualizarInventarioDto,
    @Req() req: Request,
  ) {
    const user = req.user as { id: number; rol: string };
    return this.inventarioService.actualizar(+productoId, body.cantidad, {
      usuario_id: user.id,
      usuario_rol: user.rol,
      motivo: 'Ajuste manual de inventario',
    });
  }
}

import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { InventarioMovimientosService } from './inventario-movimientos.service';
import { RegistrarMovimientoDto } from './dto/registrar-movimiento.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Request } from 'express';

@Controller('inventario-movimientos')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'inventario')
export class InventarioMovimientosController {
  constructor(
    private readonly movimientosService: InventarioMovimientosService,
  ) {}

  @Get()
  listar(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.movimientosService.listar(
      Number(page) || 1,
      Number(limit) || 50,
    );
  }

  @Get('producto/:id')
  findByProducto(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.movimientosService.findByProducto(
      +id,
      Number(page) || 1,
      Number(limit) || 50,
    );
  }

  @Get('kardex/:id')
  kardex(@Param('id') id: string) {
    return this.movimientosService.kardex(+id);
  }

  @Post('entrada')
  entrada(
    @Body() body: RegistrarMovimientoDto,
    @Req() req: Request,
  ) {
    const user = req.user as { id: number };
    return this.movimientosService.registrarEntrada({
      ...body,
      usuario_id: user.id,
    });
  }

  @Post('salida')
  salida(
    @Body() body: RegistrarMovimientoDto,
    @Req() req: Request,
  ) {
    const user = req.user as { id: number };
    return this.movimientosService.registrarSalida({
      ...body,
      usuario_id: user.id,
    });
  }

  @Post('ajuste')
  ajuste(
    @Body() body: RegistrarMovimientoDto,
    @Req() req: Request,
  ) {
    const user = req.user as { id: number };
    return this.movimientosService.registrarAjuste({
      ...body,
      usuario_id: user.id,
    });
  }
}

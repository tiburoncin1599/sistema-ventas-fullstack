import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { POSService } from './pos.service';
import { VentaRapidaDto, BuscarProductoDto } from './dto/venta-rapida.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('POS')
@Controller('pos')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'ventas', 'inventario')
export class POSController {
  constructor(private readonly posService: POSService) {}

  @Get('productos')
  @ApiOperation({ summary: 'Busqueda rapida de productos para POS' })
  buscarProductos(@Query() query: BuscarProductoDto) {
    if (query.codigo) {
      return this.posService.obtenerProductoPorCodigo(query.codigo);
    }
    return this.posService.buscarProductos(query.termino || '');
  }

  @Post('venta-rapida')
  @ApiOperation({ summary: 'Venta rapida POS con cobro inmediato' })
  ventaRapida(@Body() body: VentaRapidaDto) {
    return this.posService.ventaRapida(body);
  }
}

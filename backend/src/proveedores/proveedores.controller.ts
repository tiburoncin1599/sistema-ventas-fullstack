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
} from '@nestjs/common';
import { ProveedoresService } from './proveedores.service';
import { CrearProveedorDto } from './dto/crear-proveedor.dto';
import { ActualizarProveedorDto } from './dto/actualizar-proveedor.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('proveedores')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'inventario')
export class ProveedoresController {
  constructor(private readonly proveedoresService: ProveedoresService) {}

  @Get()
  findAll(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.proveedoresService.findAll(Number(page) || 1, Number(limit) || 50);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.proveedoresService.findOne(+id);
  }

  @Post()
  crear(@Body() body: CrearProveedorDto) {
    return this.proveedoresService.crear(body);
  }

  @Put(':id')
  actualizar(@Param('id') id: string, @Body() body: ActualizarProveedorDto) {
    return this.proveedoresService.actualizar(+id, body);
  }

  @Delete(':id')
  eliminar(@Param('id') id: string) {
    return this.proveedoresService.eliminar(+id);
  }
}

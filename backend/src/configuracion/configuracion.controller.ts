import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { ConfiguracionService } from './configuracion.service';
import { ActualizarConfiguracionDto } from './dto/actualizar-configuracion.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('configuracion')
export class ConfiguracionController {
  constructor(private readonly configService: ConfiguracionService) {}

  @Get()
  obtener() {
    return this.configService.obtener();
  }

  @Put()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  actualizar(@Body() body: ActualizarConfiguracionDto) {
    return this.configService.actualizar(body);
  }
}

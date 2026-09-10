import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UbicacionesController } from './ubicaciones.controller';
import { UbicacionesService } from './ubicaciones.service';
import { JwtSseGuard } from './jwt-sse.guard';
import { Ubicacion } from './ubicacion.entity';
import { Seguimiento } from './seguimiento.entity';
import { ClienteVisita } from './cliente-visita.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Ubicacion, Seguimiento, ClienteVisita])],
  controllers: [UbicacionesController],
  providers: [UbicacionesService, JwtSseGuard],
  exports: [UbicacionesService],
})
export class UbicacionesModule {}

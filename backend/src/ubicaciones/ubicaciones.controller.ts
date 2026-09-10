import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  Req,
  Sse,
} from '@nestjs/common';
import { MessageEvent } from '@nestjs/common';
import { Observable, interval, merge, map } from 'rxjs';
import { UbicacionesService } from './ubicaciones.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { JwtSseGuard } from './jwt-sse.guard';
import { TrackingDto } from './dto/tracking.dto';
import { ActualizarUbicacionDto } from './dto/actualizar-ubicacion.dto';
import { CrearClienteVisitaDto } from './dto/crear-cliente-visita.dto';
import { Request } from 'express';

@Controller('ubicaciones')
export class UbicacionesController {
  constructor(private readonly ubicacionesService: UbicacionesService) {}

  @Post('tracking')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ventas')
  async cambiarTracking(@Body() body: TrackingDto, @Req() req: Request) {
    const user = req.user as { id: number };
    return this.ubicacionesService.actualizarSeguimiento(user.id, body.activo);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ventas')
  async registrarUbicacion(
    @Body() body: ActualizarUbicacionDto,
    @Req() req: Request,
  ) {
    const user = req.user as { id: number };
    return this.ubicacionesService.registrarUbicacion(user.id, body);
  }

  @Get('vendedores')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'inventario')
  listarVendedores() {
    return this.ubicacionesService.listarVendedoresActivos();
  }

  @Sse('stream')
  @UseGuards(JwtSseGuard)
  @Roles('admin', 'inventario')
  stream(): Observable<MessageEvent> {
    return merge(
      interval(20000).pipe(map(() => ({ type: 'heartbeat' }) as MessageEvent)),
      // Emitir eventos SSE reales: type = nombre del evento, data = payload
      this.ubicacionesService.eventos.pipe(
        map((e) => ({ type: e.tipo, data: e.data } as MessageEvent)),
      ),
    );
  }

  @Get('mi-estado')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ventas')
  miEstado(@Req() req: Request) {
    const user = req.user as { id: number };
    return this.ubicacionesService.estadoDeVendedor(user.id);
  }

  @Post('clientes-visitas')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ventas')
  crearVisitaCliente(
    @Body() body: CrearClienteVisitaDto,
    @Req() req: Request,
  ) {
    const user = req.user as { id: number };
    return this.ubicacionesService.crearVisitaCliente(user.id, body);
  }

  @Get('vendedores/:usuarioId/clientes-visitas')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'inventario', 'ventas')
  visitasDeVendedor(
    @Param('usuarioId') usuarioId: string,
    @Query('fecha') fecha: string | undefined,
    @Req() req: Request,
  ) {
    if (req && (req.user as { rol: string }).rol === 'ventas') {
      const user = req.user as { id: number };
      if (user.id !== +usuarioId) {
        return this.ubicacionesService.visitasDeVendedor(user.id, fecha);
      }
    }
    return this.ubicacionesService.visitasDeVendedor(+usuarioId, fecha);
  }

  @Get(':usuarioId/historial')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'inventario')
  historial(@Param('usuarioId') id: string, @Query('horas') horas?: string) {
    return this.ubicacionesService.historial(+id, Number(horas) || 24);
  }
}

import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ConsultarAsistenteDto } from './dto/consultar-asistente.dto';
import {
  JwtOpcionalGuard,
  type SolicitudConUsuario,
} from './jwt-opcional.guard';
import { AsistenteService, type RespuestaAsistente } from './asistente.service';

@ApiTags('Asistente')
@Controller('asistente')
export class AsistenteController {
  constructor(private readonly asistenteService: AsistenteService) {}

  @Post('consultar')
  @UseGuards(JwtOpcionalGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Consulta al asistente virtual PROLIMAC SRL',
    description:
      'Público para guía de primer pedido, catálogo, reglas y contacto. Con JWT válido consulta únicamente los pedidos propios.',
  })
  @ApiOkResponse({ description: 'Respuesta del asistente.' })
  consultar(
    @Body() dto: ConsultarAsistenteDto,
    @Req() req: SolicitudConUsuario,
  ): Promise<RespuestaAsistente> {
    return this.asistenteService.consultar(dto.mensaje, req.user);
  }
}

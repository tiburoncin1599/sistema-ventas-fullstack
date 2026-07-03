import { IsString, IsIn } from 'class-validator';

export class ActualizarEstadoDto {
  @IsString()
  @IsIn(['pendiente', 'confirmado', 'enviado', 'entregado', 'cancelado'], {
    message: 'Estado inválido',
  })
  estado!: string;
}

import { IsIn, IsNumber, IsOptional } from 'class-validator';
import { TIPOS_PRESENTACION } from '../detalle-pedido.entity';
import { MinSegunPresentacion } from './validators/min-segun-presentacion.validator';

export class ActualizarItemDto {
  @IsNumber()
  @MinSegunPresentacion()
  cantidad!: number;

  /** Opcional: sin el campo se conserva el mínimo histórico (1). */
  @IsOptional()
  @IsIn([...TIPOS_PRESENTACION])
  tipo_presentacion?: string;
}

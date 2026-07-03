import {
  IsString,
  IsNumber,
  IsOptional,
  Min,
  IsIn,
} from 'class-validator';

export class RegistrarMovimientoDto {
  @IsNumber()
  producto_id!: number;

  @IsString()
  @IsIn(['entrada', 'salida', 'ajuste', 'devolucion'])
  tipo!: string;

  @IsNumber()
  @Min(1)
  cantidad!: number;

  @IsOptional()
  @IsString()
  motivo?: string;

  @IsOptional()
  @IsNumber()
  costo_unitario?: number;

  @IsOptional()
  @IsNumber()
  referencia_id?: number;

  @IsOptional()
  @IsString()
  referencia_tipo?: string;
}

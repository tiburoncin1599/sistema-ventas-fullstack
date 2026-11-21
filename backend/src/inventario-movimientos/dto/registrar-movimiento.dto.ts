import {
  IsString,
  IsNumber,
  IsOptional,
  Min,
  IsIn,
} from 'class-validator';

export class RegistrarMovimientoDto {
  @IsNumber()
  @Min(1)
  producto_id!: number;

  @IsString()
  @IsIn(['entrada', 'salida', 'ajuste', 'devolucion'])
  tipo!: string;

  @IsNumber()
  // Los ajustes pueden dejar el stock en 0; entradas/salidas se validan
  // como > 0 en el servicio.
  @Min(0)
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

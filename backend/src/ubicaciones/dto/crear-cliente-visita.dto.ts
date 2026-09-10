import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export const DIAS_VISITA = [
  'lunes',
  'martes',
  'miercoles',
  'jueves',
  'viernes',
  'sabado',
  'domingo',
] as const;

export class CrearClienteVisitaDto {
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  nombreCliente!: string;

  @Type(() => Number)
  @IsLatitude()
  latitud!: number;

  @Type(() => Number)
  @IsLongitude()
  longitud!: number;

  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(0)
  accuracy?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  clienteId?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  pedidoId?: number;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(7)
  @IsIn(DIAS_VISITA, { each: true })
  diasVisita!: string[];
}

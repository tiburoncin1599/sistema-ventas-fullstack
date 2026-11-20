import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

/**
 * Filtros compartidos por los reportes ejecutivos.
 *
 * Los query params llegan como texto, por eso `productoId`/`vendedorId` usan
 * `@Type(() => Number)`: sin esa transformación `@IsInt()` rechazaría valores
 * válidos como `?productoId=3`.
 *
 * `desde`/`hasta` se conservan como alias legacy para no romper exportaciones
 * o enlaces antiguos que aún usan esa nomenclatura.
 */
export class FiltroReportesDto {
  @IsOptional()
  @IsDateString()
  fechaInicio?: string;

  @IsOptional()
  @IsDateString()
  fechaFin?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  productoId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  vendedorId?: number;

  /** Alias retrocompatible con el formato anterior de la API. */
  @IsOptional()
  @IsString()
  desde?: string;

  /** Alias retrocompatible con el formato anterior de la API. */
  @IsOptional()
  @IsString()
  hasta?: string;

  /** Granularidad de la serie temporal de ventas. */
  @IsOptional()
  @IsIn(['dia', 'semana', 'mes', 'ano'])
  agrupacion?: 'dia' | 'semana' | 'mes' | 'ano';
}

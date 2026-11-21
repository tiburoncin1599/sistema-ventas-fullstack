import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { RangoFechasReporte } from '../validators/rango-fechas-reporte.validator';

/** Tipos soportados por `/reportes/exportar/csv` y `/exportar/pdf`. */
export const TIPOS_EXPORTACION_REPORTE = [
  'ventas-por-fecha',
  'ganancias',
  'top-productos',
  'ventas-por-producto',
  'ventas-por-categoria',
  'inventario',
  'clientes',
] as const;

export type TipoExportacionReporte = (typeof TIPOS_EXPORTACION_REPORTE)[number];

/**
 * Filtros compartidos por los reportes ejecutivos y sus exportaciones.
 *
 * Los query params llegan como texto, por eso los ids usan
 * `@Type(() => Number)`: sin esa transformación `@IsInt()` rechazaría valores
 * válidos como `?productoId=3`.
 *
 * `desde`/`hasta` se conservan como alias legacy para no romper exportaciones
 * o enlaces antiguos que aún usan esa nomenclatura.
 */
@RangoFechasReporte()
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
  @IsDateString()
  desde?: string;

  /** Alias retrocompatible con el formato anterior de la API. */
  @IsOptional()
  @IsDateString()
  hasta?: string;

  /** Granularidad de la serie temporal de ventas. */
  @IsOptional()
  @IsIn(['dia', 'semana', 'mes', 'ano'])
  agrupacion?: 'dia' | 'semana' | 'mes' | 'ano';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  categoriaId?: number;

  /** Alias snake_case usado por el frontend y por enlaces legacy. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  categoria_id?: number;

  /** Tipo de reporte solicitado en las exportaciones CSV/PDF. */
  @IsOptional()
  @IsString()
  @IsIn([...TIPOS_EXPORTACION_REPORTE])
  tipo?: TipoExportacionReporte;

  /** Legacy de `ventas-personal-por-dia`; el scope por rol se aplica después. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  usuarioId?: number;
}

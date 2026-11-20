import { IsString, IsNumber, IsInt, IsOptional, MaxLength, Min, IsBoolean } from 'class-validator';

export class ActualizarProductoDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  codigo?: string;

  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  precio?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  precio_costo?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  precio_por_docena?: number;

  @IsOptional()
  @IsString()
  tamano?: string;

  @IsOptional()
  @IsString()
  imagen_url?: string;

  @IsOptional()
  @IsNumber()
  categoria_id?: number;

  /** Unidades por paquete. Null/ausente = aplicar la regla por nombre. */
  @IsOptional()
  @IsInt()
  @Min(1)
  factor_paquete?: number | null;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  /** Nuevo stock absoluto. `cantidad` se acepta como alias. */
  @IsOptional()
  @IsInt()
  @Min(0)
  stock?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  cantidad?: number;
}

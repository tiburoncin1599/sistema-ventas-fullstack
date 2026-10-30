import { IsString, IsNumber, IsOptional, MaxLength, Min, IsBoolean } from 'class-validator';

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

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}

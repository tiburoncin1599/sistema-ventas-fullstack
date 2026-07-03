import { IsString, IsNumber, IsOptional, Min, IsBoolean } from 'class-validator';

export class ActualizarProductoDto {
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
  @IsString()
  imagen_url?: string;

  @IsOptional()
  @IsNumber()
  categoria_id?: number;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}

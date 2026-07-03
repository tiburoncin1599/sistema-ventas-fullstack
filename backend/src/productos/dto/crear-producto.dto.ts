import { IsString, IsNumber, IsOptional, Min } from 'class-validator';

export class CrearProductoDto {
  @IsString({ message: 'El nombre es obligatorio' })
  nombre!: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsNumber({}, { message: 'El precio debe ser un número' })
  @Min(0, { message: 'El precio no puede ser negativo' })
  precio!: number;

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
}

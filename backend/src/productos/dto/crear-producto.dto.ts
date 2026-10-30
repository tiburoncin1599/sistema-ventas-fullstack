import { IsString, IsNumber, IsOptional, MaxLength, Min } from 'class-validator';

export class CrearProductoDto {
  @IsOptional()
  @IsString({ message: 'El código debe ser texto' })
  @MaxLength(50, { message: 'El código no puede superar los 50 caracteres' })
  codigo?: string;

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

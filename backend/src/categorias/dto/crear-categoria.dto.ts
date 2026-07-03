import { IsString, IsOptional } from 'class-validator';

export class CrearCategoriaDto {
  @IsString({ message: 'El nombre es obligatorio' })
  nombre!: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsString()
  imagen_url?: string;
}

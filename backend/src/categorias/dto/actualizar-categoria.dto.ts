import { IsString, IsOptional } from 'class-validator';

export class ActualizarCategoriaDto {
  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsString()
  imagen_url?: string;
}

import { IsString, IsOptional, IsBoolean, IsNumber } from 'class-validator';

export class CrearProveedorDto {
  @IsString()
  nombre!: string;

  @IsOptional()
  @IsString()
  nit?: string;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  direccion?: string;

  @IsOptional()
  @IsString()
  contacto_nombre?: string;

  @IsOptional()
  @IsString()
  contacto_telefono?: string;

  @IsOptional()
  @IsString()
  notas?: string;
}

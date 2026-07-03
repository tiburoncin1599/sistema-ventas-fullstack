import { IsString, IsEmail, IsOptional } from 'class-validator';

export class CrearClienteDto {
  @IsString()
  nombre!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsOptional()
  @IsString()
  carnet?: string;

  @IsOptional()
  @IsString()
  ubicacion?: string;
}

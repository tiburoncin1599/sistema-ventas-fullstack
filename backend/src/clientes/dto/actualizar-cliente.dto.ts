import { IsOptional, IsString, IsEmail } from 'class-validator';

export class ActualizarClienteDto {
  @IsOptional()
  @IsString()
  nombre?: string;

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

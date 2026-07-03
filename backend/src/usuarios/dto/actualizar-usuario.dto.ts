import { IsOptional, IsString, MinLength, IsIn } from 'class-validator';

export class ActualizarUsuarioDto {
  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password?: string;

  @IsOptional()
  @IsIn(['admin', 'ventas', 'inventario', 'cliente'], {
    message: 'Rol inválido',
  })
  rol?: string;

  @IsOptional()
  activo?: boolean;
}

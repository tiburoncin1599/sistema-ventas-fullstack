import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  IsIn,
} from 'class-validator';

export class CrearUsuarioDto {
  @IsString({ message: 'El nombre es obligatorio' })
  nombre!: string;

  @IsEmail({}, { message: 'Email inválido' })
  email!: string;

  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password!: string;

  @IsOptional()
  @IsIn(['admin', 'ventas', 'inventario', 'cliente'], {
    message: 'Rol inválido',
  })
  rol?: string;
}

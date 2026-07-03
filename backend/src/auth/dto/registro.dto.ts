import { IsEmail, IsString, MinLength } from 'class-validator';

export class RegistroDto {
  @IsString({ message: 'El nombre es obligatorio' })
  nombre!: string;

  @IsEmail({}, { message: 'Email inválido' })
  email!: string;

  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password!: string;
}

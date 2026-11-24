import {
  IsEmail,
  IsString,
  IsNotEmpty,
  MinLength,
  Length,
} from 'class-validator';

export class RegistroDto {
  @IsString({ message: 'El nombre es obligatorio' })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  nombre!: string;

  @IsEmail({}, { message: 'Email inválido' })
  email!: string;

  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password!: string;

  // `Length` también falla si el valor no es string o está ausente, así que
  // con una sola regla obtenemos un mensaje claro y sin duplicados.
  @Length(1, 255, {
    message: 'El teléfono es obligatorio y no puede superar los 255 caracteres',
  })
  telefono!: string;

  @Length(1, 255, {
    message: 'La ubicación es obligatoria y no puede superar los 255 caracteres',
  })
  ubicacion!: string;
}

import { IsEmail, IsString, IsOptional, MaxLength, Length } from 'class-validator';

export class CrearClienteDto {
  @Length(2, 150, {
    message: 'El nombre es obligatorio y debe tener entre 2 y 150 caracteres',
  })
  nombre!: string;

  @IsEmail({}, {
    message: 'El correo electrónico es obligatorio y debe ser válido',
  })
  email!: string;

  @Length(1, 255, {
    message: 'El teléfono es obligatorio y no puede superar los 255 caracteres',
  })
  telefono!: string;

  @IsOptional()
  @IsString({ message: 'El carnet no es válido' })
  @MaxLength(255, { message: 'El carnet no puede superar los 255 caracteres' })
  carnet?: string;

  @Length(1, 255, {
    message: 'La ubicación es obligatoria y no puede superar los 255 caracteres',
  })
  ubicacion!: string;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ConsultarAsistenteDto {
  @ApiProperty({
    description: 'Texto libre enviado por el cliente al asistente.',
    example: '¿Cuánto cuesta la lavandina y cuántas unidades trae el paquete?',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  mensaje!: string;
}

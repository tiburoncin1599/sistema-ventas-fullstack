import { IsNumber, Min } from 'class-validator';

export class ActualizarInventarioDto {
  @IsNumber({}, { message: 'La cantidad debe ser un número' })
  @Min(0, { message: 'La cantidad no puede ser negativa' })
  cantidad!: number;
}

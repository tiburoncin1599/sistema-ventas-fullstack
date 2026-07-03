import { IsNumber, Min } from 'class-validator';

export class ActualizarItemDto {
  @IsNumber()
  @Min(1)
  cantidad!: number;
}

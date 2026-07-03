import { IsNumber, Min } from 'class-validator';

export class PagarDeudaDto {
  @IsNumber()
  @Min(0)
  monto!: number;
}

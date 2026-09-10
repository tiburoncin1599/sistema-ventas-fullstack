import { IsNumber, Min } from 'class-validator';

export class PagarDeudaDto {
  @IsNumber()
  @Min(0.01, { message: 'El monto a pagar debe ser mayor a 0' })
  monto!: number;
}

import { IsNumber, Min } from 'class-validator';

export class AsignarVendedorDto {
  @IsNumber()
  @Min(1)
  vendedorId!: number;
}
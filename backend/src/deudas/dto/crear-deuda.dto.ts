import { IsNumber, IsString, Min, IsOptional } from 'class-validator';

export class CrearDeudaDto {
  @IsNumber()
  usuarioId!: number;

  @IsNumber()
  @Min(0)
  monto!: number;

  @IsOptional()
  @IsString()
  descripcion?: string;
}

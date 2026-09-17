import {
  IsNumber,
  IsString,
  IsArray,
  IsOptional,
  IsIn,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class ItemPedidoDto {
  @IsNumber()
  producto_id!: number;

  @IsNumber()
  @Min(1)
  cantidad!: number;

  @IsNumber()
  @Min(0)
  precio!: number;
}

export class CrearPedidoDto {
  @IsNumber()
  usuarioId!: number;

  @IsOptional()
  @IsNumber()
  procesadoPor?: number;

  @IsOptional()
  @IsString()
  direccion?: string;

  @IsOptional()
  @IsString()
  notas?: string;

  @IsOptional()
  @IsIn(['contado', 'credito'])
  tipoPago?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemPedidoDto)
  items!: ItemPedidoDto[];
}

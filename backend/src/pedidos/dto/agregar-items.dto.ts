import {
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  ArrayMinSize,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TIPOS_PRESENTACION } from '../detalle-pedido.entity';
import { MinSegunPresentacion } from './validators/min-segun-presentacion.validator';

class ItemAgregarDto {
  @IsNumber()
  producto_id!: number;

  @IsNumber()
  @IsInt()
  @MinSegunPresentacion()
  cantidad!: number;

  @IsOptional()
  @IsIn([...TIPOS_PRESENTACION])
  tipo_presentacion?: string;

  @IsNumber()
  @Min(0)
  precio!: number;
}

export class AgregarItemsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ItemAgregarDto)
  items!: ItemAgregarDto[];
}

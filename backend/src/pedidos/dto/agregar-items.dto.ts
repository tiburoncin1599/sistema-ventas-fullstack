import { IsNumber, IsArray, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class ItemAgregarDto {
  @IsNumber()
  producto_id!: number;

  @IsNumber()
  @Min(1)
  cantidad!: number;

  @IsNumber()
  @Min(0)
  precio!: number;
}

export class AgregarItemsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemAgregarDto)
  items!: ItemAgregarDto[];
}

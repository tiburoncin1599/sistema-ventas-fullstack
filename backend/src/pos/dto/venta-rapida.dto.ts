import {
  IsArray,
  IsNumber,
  IsString,
  IsOptional,
  Min,
  ArrayMinSize,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class ItemVentaDto {
  @ApiProperty({ description: 'ID del producto' })
  @IsNumber()
  producto_id!: number;

  @ApiProperty({ description: 'Cantidad', minimum: 1 })
  @IsNumber()
  @Min(1)
  cantidad!: number;
}

export class VentaRapidaDto {
  @ApiProperty({ description: 'ID del cliente/usuario' })
  @IsNumber()
  usuarioId!: number;

  @ApiProperty({ type: [ItemVentaDto], description: 'Items a vender' })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ItemVentaDto)
  items!: ItemVentaDto[];

  @ApiProperty({ description: 'Metodo de pago', example: 'efectivo' })
  @IsString()
  metodoPago!: string;

  @ApiProperty({ description: 'Monto recibido (efectivo)', required: false })
  @IsOptional()
  @IsNumber()
  montoRecibido?: number;

  @ApiProperty({ description: 'ID del usuario que procesa', required: false })
  @IsOptional()
  @IsNumber()
  procesadoPor?: number;
}

export class BuscarProductoDto {
  @ApiProperty({ description: 'Termino de busqueda', required: false })
  @IsOptional()
  @IsString()
  termino?: string;

  @ApiProperty({ description: 'Codigo de barras', required: false })
  @IsOptional()
  @IsString()
  codigo?: string;
}

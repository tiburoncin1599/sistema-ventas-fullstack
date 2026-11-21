import {
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ArrayMinSize,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { MinSegunPresentacion } from '../../pedidos/dto/validators/min-segun-presentacion.validator';

class ItemVentaDto {
  @ApiProperty({ description: 'ID del producto' })
  @IsInt()
  @Min(1)
  producto_id!: number;

  @ApiProperty({
    description: 'Cantidad según la presentación elegida',
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  @MinSegunPresentacion()
  cantidad!: number;

  @ApiProperty({
    description: 'UNIDAD (mínimo 3) o PAQUETE (mínimo 1)',
    enum: ['UNIDAD', 'PAQUETE'],
  })
  @IsIn(['UNIDAD', 'PAQUETE'])
  tipo_presentacion!: 'UNIDAD' | 'PAQUETE';
}

export class VentaRapidaDto {
  @ApiProperty({ description: 'ID del cliente/usuario' })
  @IsInt()
  @Min(1)
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

  @ApiProperty({
    description: 'Tipo contable del cobro',
    enum: ['CONTADO', 'CREDITO'],
    required: false,
  })
  @IsOptional()
  @IsIn(['CONTADO', 'CREDITO', 'contado', 'credito'])
  tipoPago?: string;

  @ApiProperty({ description: 'Monto recibido (efectivo)', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  montoRecibido?: number;

  @ApiProperty({ description: 'ID del usuario que procesa', required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
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

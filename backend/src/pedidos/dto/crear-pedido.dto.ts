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
import { TIPOS_PAGO, type TipoPago } from '../pedido.entity';
import { TIPOS_PRESENTACION } from '../detalle-pedido.entity';
import { MinSegunPresentacion } from './validators/min-segun-presentacion.validator';

class ItemPedidoDto {
  @IsNumber()
  producto_id!: number;

  @IsNumber()
  @MinSegunPresentacion()
  cantidad!: number;

  /** UNIDAD (mínimo 3) o PAQUETE (mínimo 1). Opcional por compatibilidad. */
  @IsOptional()
  @IsIn([...TIPOS_PRESENTACION])
  tipo_presentacion?: string;

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

  /** Forma canónica del tipo de pago solicitada por el POS del vendedor. */
  @IsOptional()
  @IsIn([...TIPOS_PAGO])
  tipo_pago?: TipoPago;

  /** Compatibilidad con clientes anteriores que envían `tipoPago` en minúsculas. */
  @IsOptional()
  @IsIn([...TIPOS_PAGO, 'contado', 'credito'])
  tipoPago?: string;

  /** Abono al momento de la venta; si es menor al total se registra deuda. */
  @IsOptional()
  @IsNumber()
  @Min(0)
  montoPagado?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemPedidoDto)
  items!: ItemPedidoDto[];
}

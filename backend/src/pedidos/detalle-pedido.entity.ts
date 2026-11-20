import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Pedido } from './pedido.entity';
import { Producto } from '../productos/producto.entity';

const decimal = () => ({
  from: (v?: string | null) => (v ? Number(v) : v),
  to: (v?: number | null) => v,
});

/** Presentación canónica en la que se pide cada ítem de un pedido. */
export const TIPOS_PRESENTACION = ['UNIDAD', 'PAQUETE'] as const;
export type TipoPresentacion = (typeof TIPOS_PRESENTACION)[number];

/** Mínimo de `cantidad` permitido según la presentación elegida. */
export const CANTIDAD_MINIMA_POR_PRESENTACION: Record<TipoPresentacion, number> =
  {
    UNIDAD: 3,
    PAQUETE: 1,
  };

/** Normaliza variantes (`unidad`, `paquete`, etc.) a la forma persistida. */
export function normalizarTipoPresentacion(
  valor?: string | null,
): TipoPresentacion | undefined {
  const limpio = (valor ?? '').trim().toUpperCase();
  return (TIPOS_PRESENTACION as readonly string[]).includes(limpio)
    ? (limpio as TipoPresentacion)
    : undefined;
}

@Entity('detalle_pedido')
export class DetallePedido {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Pedido)
  @JoinColumn({ name: 'pedido_id' })
  pedido!: Pedido;

  @Column()
  pedido_id!: number;

  @ManyToOne(() => Producto)
  @JoinColumn({ name: 'producto_id' })
  producto!: Producto;

  @Column()
  producto_id!: number;

  @Column()
  cantidad!: number;

  /**
   * 'UNIDAD' (mínimo 3) o 'PAQUETE' (mínimo 1). Los registros anteriores a la
   * migración se clasifican como UNIDAD para conservar su significado.
   */
  @Column({ type: 'varchar', length: 10, default: 'UNIDAD' })
  tipo_presentacion!: TipoPresentacion;

  /** Unidades físicas vendidas: `cantidad × factor_conversion`. */
  @Column({ type: 'int', default: 1 })
  unidades!: number;

  /** 1 paquete = N unidades (1 cuando la presentación es UNIDAD). */
  @Column({ type: 'int', default: 1 })
  factor_conversion!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, transformer: decimal() })
  precio_unitario!: number;
}

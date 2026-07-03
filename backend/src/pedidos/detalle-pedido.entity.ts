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

  @Column({ type: 'decimal', precision: 10, scale: 2, transformer: decimal() })
  precio_unitario!: number;
}

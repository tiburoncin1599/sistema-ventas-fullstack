import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Producto } from '../productos/producto.entity';

@Entity('inventario')
export class Inventario {
  @PrimaryGeneratedColumn()
  id!: number;

  @OneToOne(() => Producto)
  @JoinColumn({ name: 'producto_id' })
  producto!: Producto;

  @Column()
  producto_id!: number;

  @Column({ default: 0 })
  cantidad!: number;

  @Column({ default: 5 })
  cantidad_minima!: number;

  @Column({ nullable: true })
  ubicacion?: string;
}

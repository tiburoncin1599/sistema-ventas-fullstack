import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Producto } from '../productos/producto.entity';
import { Usuario } from '../usuarios/usuario.entity';

@Entity('inventario_movimientos')
export class InventarioMovimiento {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column()
  producto_id!: number;

  @ManyToOne(() => Producto)
  @JoinColumn({ name: 'producto_id' })
  producto!: Producto;

  @Column({ length: 20 })
  tipo!: string;

  @Column({ type: 'int' })
  cantidad!: number;

  @Column({ type: 'int', nullable: true })
  cantidad_anterior!: number | null;

  @Column({ type: 'int', nullable: true })
  cantidad_nueva!: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  costo_unitario!: number | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  motivo!: string | null;

  @Column({ type: 'int', nullable: true })
  referencia_id!: number | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  referencia_tipo!: string | null;

  @Column({ type: 'int', nullable: true })
  usuario_id!: number | null;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'usuario_id' })
  usuario!: Usuario | null;

  @CreateDateColumn()
  creado_en!: Date;
}

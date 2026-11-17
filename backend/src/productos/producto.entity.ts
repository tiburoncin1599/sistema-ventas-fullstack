import { Categoria } from '../categorias/categoria.entity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn
} from 'typeorm';

const decimal = () => ({
  from: (v?: string | null) => (v ? Number(v) : v),
  to: (v?: number | null) => v,
});

@Entity('productos')
export class Producto {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 50, nullable: true, unique: true })
  codigo?: string;

  @Column({ length: 200 })
  nombre!: string;

  @Column({ nullable: true })
  descripcion?: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, transformer: decimal() })
  precio!: number;

  @Column({ nullable: true })
  imagen_url?: string;

  @ManyToOne(() => Categoria, { nullable: true, eager: true })
  @JoinColumn({ name: 'categoria_id' })
  categoria?: Categoria;

  @Column({ default: true })
  activo!: boolean;
}

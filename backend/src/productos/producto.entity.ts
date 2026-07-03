import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Categoria } from '../categorias/categoria.entity';

const decimal = () => ({
  from: (v?: string | null) => (v ? Number(v) : v),
  to: (v?: number | null) => v,
});

@Entity('productos')
export class Producto {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 200 })
  nombre!: string;

  @Column({ nullable: true })
  descripcion?: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, transformer: decimal() })
  precio!: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    transformer: decimal(),
  })
  precio_costo?: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    transformer: decimal(),
  })
  precio_por_docena?: number;

  @Column({ length: 50, nullable: true })
  tamano?: string;

  @Column({ nullable: true })
  imagen_url?: string;

  @ManyToOne(() => Categoria, { nullable: true })
  @JoinColumn({ name: 'categoria_id' })
  categoria?: Categoria;

  @Column({ nullable: true })
  categoria_id?: number;

  @Column({ default: true })
  activo!: boolean;

  @CreateDateColumn()
  creado_en!: Date;
}

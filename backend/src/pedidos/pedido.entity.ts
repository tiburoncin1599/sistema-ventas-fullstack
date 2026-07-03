import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Usuario } from '../usuarios/usuario.entity';

const decimal = () => ({
  from: (v?: string | null) => (v ? Number(v) : v),
  to: (v?: number | null) => v,
});

@Entity('pedidos')
export class Pedido {
  @PrimaryGeneratedColumn()
  id!: number;
  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'usuario_id' })
  usuario!: Usuario;

  @Column()
  usuario_id!: number;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'procesado_por' })
  procesador?: Usuario;

  @Column({ nullable: true })
  procesado_por?: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, transformer: decimal() })
  total!: number;

  @Column({ default: 'pendiente' })
  estado!: string;

  @Column({ nullable: true })
  direccion_entrega?: string;

  @Column({ nullable: true })
  notas?: string;

  @CreateDateColumn()
  creado_en!: Date;
}

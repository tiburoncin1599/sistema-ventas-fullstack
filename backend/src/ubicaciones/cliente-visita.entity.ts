import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Usuario } from '../usuarios/usuario.entity';
import { Pedido } from '../pedidos/pedido.entity';

@Entity('cliente_visitas')
export class ClienteVisita {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column()
  vendedor_id!: number;

  @ManyToOne(() => Usuario, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vendedor_id' })
  vendedor?: Usuario;

  @Column({ nullable: true })
  cliente_id?: number | null;

  @ManyToOne(() => Usuario, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'cliente_id' })
  cliente?: Usuario;

  @Column({ length: 150 })
  nombre_cliente!: string;

  @Index()
  @Column({ nullable: true })
  pedido_id?: number | null;

  @ManyToOne(() => Pedido, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'pedido_id' })
  pedido?: Pedido;

  @Column({ type: 'double precision' })
  latitud!: number;

  @Column({ type: 'double precision' })
  longitud!: number;

  @Column({ type: 'double precision', nullable: true })
  precision!: number | null;

  @Column('simple-array', { default: '' })
  dias_visita!: string[];

  @Index()
  @CreateDateColumn()
  creado_en!: Date;
}

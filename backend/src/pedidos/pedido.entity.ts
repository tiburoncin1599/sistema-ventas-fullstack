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

/** Forma canónica persistida en `pedidos.tipo_pago`. */
export const TIPOS_PAGO = ['CONTADO', 'CREDITO'] as const;
export type TipoPago = (typeof TIPOS_PAGO)[number];

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

  /** 'CONTADO' = pago inmediato; 'CREDITO' = genera deuda pendiente. */
  @Column({ type: 'varchar', length: 10, default: 'CONTADO' })
  tipo_pago!: TipoPago;

  @Column({ nullable: true })
  tipo_identificador!: string;  // 'publico' | 'privado'

  @Column({ nullable: true })
  identificador_publico!: string;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  historial_estados!: {
    estado: string;
    fecha: Date;
    usuario?: number;
    observacion?: string;
  }[];

  @Column({ type: 'timestamp', onUpdate: 'CURRENT_TIMESTAMP' })
  actualizado_en!: Date;

  @Column({ nullable: true })
  direccion_entrega?: string;

  @Column({ nullable: true })
  notas?: string;

  @CreateDateColumn()
  creado_en!: Date;
}

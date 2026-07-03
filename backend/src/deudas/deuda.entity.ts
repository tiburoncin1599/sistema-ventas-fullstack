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

@Entity('deudas')
export class Deuda {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'usuario_id' })
  usuario!: Usuario;

  @Column()
  usuario_id!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, transformer: decimal() })
  monto!: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: decimal(),
  })
  monto_pagado!: number;

  @Column({ nullable: true })
  descripcion?: string;

  @Column({ default: 'pendiente' })
  estado!: string;

  @CreateDateColumn()
  fecha_creacion!: Date;

  @Column({ nullable: true })
  fecha_pago?: Date;

  @Column({ nullable: true })
  factura_url?: string;
}

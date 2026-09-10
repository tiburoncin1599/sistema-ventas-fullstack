import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Usuario } from '../usuarios/usuario.entity';

@Entity('seguimientos')
export class Seguimiento {
  @PrimaryColumn()
  usuario_id!: number;

  @ManyToOne(() => Usuario, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'usuario_id' })
  usuario?: Usuario;

  @Column({ default: false })
  activo!: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  iniciado_en!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  ultima_actualizacion_en!: Date | null;

  @Column({ type: 'double precision', nullable: true })
  latitud!: number | null;

  @Column({ type: 'double precision', nullable: true })
  longitud!: number | null;

  @Column({ type: 'double precision', nullable: true })
  precision!: number | null;
}

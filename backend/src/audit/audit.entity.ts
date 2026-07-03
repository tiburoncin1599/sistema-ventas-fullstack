import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('auditoria')
export class Audit {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column({ length: 50 })
  accion!: string;

  @Column({ length: 100 })
  entidad!: string;

  @Column({ type: 'int', nullable: true })
  entidad_id!: number | null;

  @Column({ type: 'jsonb', nullable: true })
  valor_anterior!: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true })
  valor_nuevo!: Record<string, unknown> | null;

  @Index()
  @Column({ type: 'int', nullable: true })
  usuario_id!: number | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  usuario_nombre!: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  usuario_rol!: string | null;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ip!: string | null;

  @CreateDateColumn()
  creado_en!: Date;
}

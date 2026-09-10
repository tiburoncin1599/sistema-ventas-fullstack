import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('vendedor_ubicaciones')
export class Ubicacion {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column()
  usuario_id!: number;

  @Column({ type: 'double precision' })
  latitud!: number;

  @Column({ type: 'double precision' })
  longitud!: number;

  @Column({ type: 'double precision', nullable: true })
  precision!: number | null;

  @Index()
  @CreateDateColumn()
  creado_en!: Date;
}

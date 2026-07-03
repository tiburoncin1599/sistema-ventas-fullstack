import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('proveedores')
export class Proveedor {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 200 })
  nombre!: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  nit!: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  telefono!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  email!: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  direccion!: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  contacto_nombre!: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  contacto_telefono!: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  notas!: string | null;

  @Column({ default: true })
  activo!: boolean;

  @CreateDateColumn()
  creado_en!: Date;

  @UpdateDateColumn()
  actualizado_en!: Date;
}

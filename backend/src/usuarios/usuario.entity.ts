import { Exclude } from 'class-transformer';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity('usuarios')
export class Usuario {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 100 })
  nombre!: string;

  @Column({ unique: true, length: 150 })
  email!: string;

  @Column({ nullable: true })
  google_id?: string;

  @Column()
  @Exclude()
  password_hash!: string;

  @Column({ default: 'cliente' })
  rol!: string;

  @Column({ nullable: true })
  telefono?: string;

  @Column({ nullable: true })
  carnet?: string;

  @Column({ nullable: true })
  ubicacion?: string;

  @Column({ default: true })
  activo!: boolean;

  @CreateDateColumn()
  creado_en!: Date;
}

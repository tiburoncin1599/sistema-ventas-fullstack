import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Usuario } from '../usuarios/usuario.entity';

@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Usuario, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'usuario_id' })
  usuario?: Usuario;

  @Column()
  usuario_id!: number;

  @Column({ length: 500 })
  token!: string;

  @Column()
  expires_at!: Date;

  @Column({ default: false })
  revocado!: boolean;

  @CreateDateColumn()
  creado_en!: Date;
}

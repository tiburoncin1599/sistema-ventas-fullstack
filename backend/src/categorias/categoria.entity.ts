import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('categorias')
export class Categoria {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 100 })
  nombre!: string;

  @Column({ nullable: true })
  descripcion?: string;

  @Column({ nullable: true })
  imagen_url?: string;
}

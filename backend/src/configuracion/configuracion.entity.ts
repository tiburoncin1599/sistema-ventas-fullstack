import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('configuracion')
export class Configuracion {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 200, nullable: true })
  nombre_empresa!: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  logo_url!: string | null;

  @Column({ type: 'varchar', length: 20, default: 'Bs' })
  moneda!: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  moneda_simbolo!: string | null;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  impuesto_porcentaje!: number;

  @Column({ type: 'varchar', length: 20, nullable: true })
  nit!: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  direccion!: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  telefono!: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  whatsapp!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  email_empresa!: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  qr_bancario_url!: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  terminos_condiciones!: string | null;

  @Column({ default: true })
  notificaciones_stock!: boolean;

  @Column({ default: 5 })
  stock_minimo_alerta!: number;

  @Column({ default: false })
  modo_oscuro!: boolean;
}

import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Usuario } from '../../usuarios/usuario.entity';

export type TipoNotificacion = 'STOCK_BAJO' | 'REPORTE_VENTAS' | 'COMPROBANTE';
export type EstadoNotificacion = 'ENVIADO' | 'GENERADO_LINK' | 'ERROR';

/**
 * Historial de todo lo que el sistema intentó enviar por WhatsApp.
 * Se persiste tanto en modo API como en modo enlace directo (wa.me), de modo
 * que siempre queda trazabilidad del evento.
 */
@Entity('notificaciones_historial')
export class NotificacionHistorial {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 30 })
  tipo!: TipoNotificacion;

  @Column({ type: 'varchar', length: 30, nullable: true })
  destinatario_telefono!: string | null;

  @Column({ type: 'text' })
  mensaje!: string;

  @Column({ type: 'varchar', length: 20 })
  estado!: EstadoNotificacion;

  @ManyToOne(() => Usuario, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'usuario_id' })
  usuario?: Usuario | null;

  @Column({ type: 'integer', nullable: true })
  usuario_id!: number | null;

  @CreateDateColumn({ name: 'creado_en' })
  creado_en!: Date;
}

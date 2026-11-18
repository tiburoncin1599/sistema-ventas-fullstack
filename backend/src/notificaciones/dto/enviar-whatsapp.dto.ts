import { IsDateString, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import type { TipoNotificacion } from '../entities/notificacion-historial.entity';

/** Contrato interno usado por WhatsappService.enviarNotificacion. */
export class EnviarWhatsappDto {
  @IsString()
  @IsIn(['STOCK_BAJO', 'REPORTE_VENTAS', 'COMPROBANTE'])
  tipo!: TipoNotificacion;

  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  mensaje!: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  destinatario_telefono?: string;

  @IsOptional()
  @IsDateString()
  fechaInicio?: string;

  @IsOptional()
  @IsDateString()
  fechaFin?: string;
}

/** Body del endpoint que genera y envía el reporte ejecutivo. */
export class NotificarReporteDto {
  @IsOptional()
  @IsDateString()
  fechaInicio?: string;

  @IsOptional()
  @IsDateString()
  fechaFin?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  destinatarioTelefono?: string;
}

/** Body del endpoint que genera y envía la alerta de stock bajo. */
export class NotificarStockDto {
  @IsOptional()
  @IsString()
  @MaxLength(30)
  destinatarioTelefono?: string;
}

import { PartialType } from '@nestjs/swagger';
import { IsString, IsNumber, IsBoolean, IsOptional, Min } from 'class-validator';

export class ActualizarConfiguracionDto {
  @IsOptional()
  @IsString()
  nombre_empresa?: string;

  @IsOptional()
  @IsString()
  logo_url?: string;

  @IsOptional()
  @IsString()
  moneda?: string;

  @IsOptional()
  @IsString()
  moneda_simbolo?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  impuesto_porcentaje?: number;

  @IsOptional()
  @IsString()
  nit?: string;

  @IsOptional()
  @IsString()
  direccion?: string;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsOptional()
  @IsString()
  whatsapp?: string;

  @IsOptional()
  @IsString()
  email_empresa?: string;

  @IsOptional()
  @IsString()
  qr_bancario_url?: string;

  @IsOptional()
  @IsString()
  terminos_condiciones?: string;

  @IsOptional()
  @IsBoolean()
  notificaciones_stock?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1)
  stock_minimo_alerta?: number;

  @IsOptional()
  @IsBoolean()
  modo_oscuro?: boolean;
}

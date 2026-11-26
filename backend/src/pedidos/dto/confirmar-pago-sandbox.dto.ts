import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';

/** Medios simulados disponibles en el checkout (no se envían a una pasarela real). */
export const METODOS_PAGO_SANDBOX = ['QR_SIMPLE', 'TARJETA'] as const;

export class ConfirmarPagoSandboxDto {
  /** Clave de idempotencia: un pedido solo puede confirmarse con una referencia. */
  @IsString()
  @Matches(/^TXN-SANDBOX-[A-Za-z0-9-]{6,}$/, {
    message: 'referencia_transaccion debe tener el formato TXN-SANDBOX-...',
  })
  referencia_transaccion!: string;

  /** Si se omite, se abona el saldo pendiente calculado desde los detalles. */
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  monto?: number;

  @IsOptional()
  @IsIn([...METODOS_PAGO_SANDBOX])
  metodo_pago?: string;

  /** Avanza `pendiente -> confirmado` respetando la máquina de estados. */
  @IsOptional()
  @IsBoolean()
  avanzar_estado?: boolean;
}

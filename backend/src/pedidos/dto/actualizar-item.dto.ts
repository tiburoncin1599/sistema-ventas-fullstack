import { IsInt, IsNumber, Min } from 'class-validator';

/**
 * El servicio toma la presentación del detalle ya persistido y aplica su
 * mínimo real (UNIDAD=3, PAQUETE=1). Enviar `tipo_presentacion` aquí sería
 * engañoso con `forbidNonWhitelisted: true`, y un mínimo fijo de UNIDAD
 * rechazaría paquetes válidos. El DTO sólo garantiza un entero positivo.
 */
export class ActualizarItemDto {
  @IsNumber()
  @IsInt()
  @Min(1)
  cantidad!: number;
}

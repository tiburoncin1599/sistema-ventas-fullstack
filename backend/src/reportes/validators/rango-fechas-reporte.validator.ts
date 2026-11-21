import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

type FiltrosConFechas = {
  fechaInicio?: string;
  fechaFin?: string;
  desde?: string;
  hasta?: string;
};

/**
 * Valida el rango resultante de resolver los alias legacy:
 * `fechaInicio ?? desde` y `fechaFin ?? hasta`.
 *
 * Tolera que falte alguno de los extremos. Si ambas formas conviven con el
 * mismo valor no hay conflicto: se prioriza la forma canónica. Los formatos
 * inválidos los reporta `@IsDateString()`, no este validador.
 */
@ValidatorConstraint({ name: 'rangoFechasReporte', async: false })
export class RangoFechasReporteConstraint
  implements ValidatorConstraintInterface
{
  validate(_valor: unknown, args: ValidationArguments): boolean {
    const filtros = args.object as FiltrosConFechas;
    const inicio = filtros.fechaInicio ?? filtros.desde;
    const fin = filtros.fechaFin ?? filtros.hasta;
    if (!inicio || !fin) return true;

    const inicioMs = new Date(inicio).getTime();
    const finMs = new Date(fin).getTime();
    if (Number.isNaN(inicioMs) || Number.isNaN(finMs)) return true;
    return inicioMs <= finMs;
  }

  defaultMessage(): string {
    return 'El rango de fechas es inválido: la fecha de inicio no puede ser posterior a la fecha de fin';
  }
}

/** Decorador de clase para DTOs de filtros de reportes. */
export function RangoFechasReporte(
  validationOptions?: ValidationOptions,
): ClassDecorator {
  return (target) => {
    registerDecorator({
      target: target as Function,
      propertyName: undefined as unknown as string,
      options: validationOptions,
      constraints: [],
      validator: RangoFechasReporteConstraint,
    });
  };
}

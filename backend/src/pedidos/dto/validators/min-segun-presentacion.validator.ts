import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import {
  CANTIDAD_MINIMA_POR_PRESENTACION,
  normalizarTipoPresentacion,
} from '../../detalle-pedido.entity';

/**
 * Valida `cantidad` contra el mínimo de la presentación declarada en el mismo
 * item: UNIDAD => 3, PAQUETE => 1.
 *
 * Si `tipo_presentacion` no viene (o no es válido) se aplica el mínimo de la
 * presentación por defecto, UNIDAD (3). Los clientes que envíen el payload
 * legacy deben declarar explícitamente `PAQUETE` para conservar el mínimo 1.
 */
@ValidatorConstraint({ name: 'cantidadSegunPresentacion', async: false })
export class CantidadSegunPresentacionConstraint
  implements ValidatorConstraintInterface
{
  validate(cantidad: unknown, args: ValidationArguments): boolean {
    if (typeof cantidad !== 'number' || !Number.isFinite(cantidad)) {
      return false;
    }
    const item = args.object as { tipo_presentacion?: string };
    const presentacion =
      normalizarTipoPresentacion(item.tipo_presentacion) ?? 'UNIDAD';
    const minimo = CANTIDAD_MINIMA_POR_PRESENTACION[presentacion];
    return cantidad >= minimo;
  }

  defaultMessage(args: ValidationArguments): string {
    const item = args.object as { tipo_presentacion?: string };
    const presentacion =
      normalizarTipoPresentacion(item.tipo_presentacion) ?? 'UNIDAD';
    const minimo = CANTIDAD_MINIMA_POR_PRESENTACION[presentacion];
    const etiqueta =
      presentacion === 'UNIDAD'
        ? minimo === 1
          ? 'unidad'
          : 'unidades'
        : minimo === 1
          ? 'paquete'
          : 'paquetes';
    return `El pedido mínimo es de ${minimo} ${etiqueta} cuando la presentación es ${presentacion}`;
  }
}

/** Decorador de campo para usar dentro de los DTO de items de pedido. */
export function MinSegunPresentacion(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return (object: object, propertyName: string | symbol) => {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName as string,
      options: validationOptions,
      constraints: [],
      validator: CantidadSegunPresentacionConstraint,
    });
  };
}

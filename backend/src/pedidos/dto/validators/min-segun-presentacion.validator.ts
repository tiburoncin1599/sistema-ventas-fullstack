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
 * Si `tipo_presentacion` no viene, se aplica el mínimo histórico (1) para no
 * romper clientes anteriores que envían el payload antiguo. Los frontends
 * nuevos siempre envían el campo, por lo que la regla se aplica completa.
 */
@ValidatorConstraint({ name: 'cantidadSegunPresentacion', async: false })
export class CantidadSegunPresentacionConstraint
  implements ValidatorConstraintInterface
{
  validate(
    cantidad: unknown,
    args: ValidationArguments,
  ): boolean {
    if (typeof cantidad !== 'number' || !Number.isFinite(cantidad)) {
      return false;
    }
    const item = args.object as { tipo_presentacion?: string };
    const presentacion = normalizarTipoPresentacion(item.tipo_presentacion);
    const minimo = presentacion
      ? CANTIDAD_MINIMA_POR_PRESENTACION[presentacion]
      : 1;
    return cantidad >= minimo;
  }

  defaultMessage(args: ValidationArguments): string {
    const item = args.object as { tipo_presentacion?: string };
    const presentacion = normalizarTipoPresentacion(item.tipo_presentacion);
    if (!presentacion) {
      return 'La cantidad debe ser al menos 1';
    }
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

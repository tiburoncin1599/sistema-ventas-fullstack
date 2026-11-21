/**
 * Desglose monetario para facturas y comprobantes.
 *
 * `pedidos.total` es la fuente autoritativa: se calcula en el backend a partir
 * de unidades físicas y se persiste con la venta. Los documentos no deben
 * "adivinar" impuestos a partir de diferencias de factor de paquete.
 */
export interface DesgloseMontos {
  /** Base imponible mostrada. Igual al total cuando no hay impuesto explícito. */
  subtotal: number;
  /** Impuesto real solo cuando la diferencia coincide con el porcentaje configurado. */
  impuesto: number;
  /** Se mantiene por compatibilidad con los comprobantes existentes. */
  descuento: number;
  total: number;
  /** El total ya incluye el impuesto configurado (no se lista como línea aparte). */
  impuestoIncluido: boolean;
}

const redondear = (valor: number): number => Math.round(valor * 100) / 100;

export function desglosarMontos(params: {
  /** Suma de `precio_unitario * unidades` de los detalles. */
  subtotalDetalles: number;
  /** Total persistido en el pedido. */
  total: number;
  /** Porcentaje de impuesto de la configuración (puede ser 0). */
  impuestoPorcentaje?: number | null;
}): DesgloseMontos {
  const total = redondear(Number(params.total) || 0);
  const subtotalDetalles = redondear(Number(params.subtotalDetalles) || 0);
  const porcentaje = Number(params.impuestoPorcentaje) || 0;

  if (porcentaje <= 0) {
    return {
      subtotal: total,
      impuesto: 0,
      descuento: 0,
      total,
      impuestoIncluido: false,
    };
  }

  const diferencia = redondear(total - subtotalDetalles);
  const esperado = redondear((subtotalDetalles * porcentaje) / 100);
  const tolerancia = Math.max(0.05, Math.abs(esperado) * 0.01);

  // Solo se considera impuesto si la diferencia coincide con el porcentaje
  // configurado. Un paquete de 12 unidades facturado como 1 no debe generar
  // un "impuesto" de 11 veces el precio.
  if (Math.abs(diferencia - esperado) <= tolerancia && esperado > 0) {
    return {
      subtotal: subtotalDetalles,
      impuesto: esperado,
      descuento: 0,
      total,
      impuestoIncluido: false,
    };
  }

  return {
    subtotal: total,
    impuesto: 0,
    descuento: 0,
    total,
    // Total igual al detalle: el Configuración puede declarar un porcentaje
    // informativo ya incluido en el precio.
    impuestoIncluido: diferencia === 0,
  };
}

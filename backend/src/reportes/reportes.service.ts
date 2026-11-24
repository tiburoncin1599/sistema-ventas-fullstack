import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, ObjectLiteral, SelectQueryBuilder } from 'typeorm';
import { FiltroReportesDto } from './dto/filtro-reportes.dto';

export type AgrupacionVentas = 'dia' | 'semana' | 'mes' | 'ano';

/** Filtros ya resueltos por el controlador (incluye el rol del solicitante). */
export interface FiltrosEfectivos {
  fechaInicio?: string;
  fechaFin?: string;
  productoId?: number;
  vendedorId?: number;
  categoriaId?: number;
  tipo?: string;
  usuarioId?: number;
  agrupacion?: AgrupacionVentas;
}

export interface PuntoVentaFecha extends Record<string, unknown> {
  fecha: string;
  total_pedidos: number;
  unidades_vendidas: number;
  total_vendido: number;
  ticket_promedio: number;
  /** Alias de compatibilidad con `/pedidos/ventas/personal`. */
  promedio_ticket: number;
  /** Alias de compatibilidad con los E2E funcionales. */
  cancelados: number;
}

export interface ResumenGanancias extends Record<string, unknown> {
  ingresos: number;
  costo: number;
  utilidad_bruta: number;
  /** Alias de compatibilidad con los E2E funcionales. */
  ganancia: number;
  margen_porcentual: number;
  total_pedidos: number;
  ticket_promedio: number;
  promedio_ticket: number;
}

export interface ProductoRanking extends Record<string, unknown> {
  producto_id: number;
  nombre: string;
  codigo: string | null;
  unidades_vendidas: number;
  ingresos: number;
  costo: number;
  utilidad: number;
  margen_porcentual: number;
}

export interface TopProductosResult {
  masVendidos: ProductoRanking[];
  masRentables: ProductoRanking[];
}

const num = (valor: unknown): number => {
  const n = Number(valor);
  return Number.isFinite(n) ? n : 0;
};

const redondear = (valor: number): number => Math.round(valor * 100) / 100;

/**
 * Los pedidos entregados también son ventas concretadas: el único estado
 * anulado es `cancelado`. Filtrar por un estado literal dejaría fuera las
 * ventas POS (entregadas al momento de cobrar).
 */
const CONDICION_VENTA = "pe.estado <> 'cancelado'";

/** Unidades físicas vendidas por línea (paquete = cantidad × factor). */
const UNIDADES_DETALLE = 'COALESCE(dp.unidades, dp.cantidad)';

@Injectable()
export class ReportesService {
  constructor(@InjectDataSource() private dataSource: DataSource) {}

  /** Resuelve los alias `desde`/`hasta` a los nombres canónicos del DTO. */
  private resolver(filtros: FiltroReportesDto | FiltrosEfectivos): FiltrosEfectivos {
    return {
      fechaInicio: filtros.fechaInicio ?? (filtros as FiltroReportesDto).desde,
      fechaFin: filtros.fechaFin ?? (filtros as FiltroReportesDto).hasta,
      productoId: filtros.productoId,
      vendedorId: filtros.vendedorId,
      categoriaId: filtros.categoriaId,
      tipo: filtros.tipo,
      usuarioId: filtros.usuarioId,
      agrupacion: filtros.agrupacion,
    };
  }

  /**
   * Condiciones SQL sobre la tabla `pedidos` (sin joins de detalle), para que
   * SUM(total) no se duplique por línea. El filtro de producto se resuelve con
   * EXISTS para conservar el mismo alcance que `baseVentas`.
   */
  private condicionesPedidos(f: FiltrosEfectivos): {
    sql: string;
    params: unknown[];
  } {
    const condiciones: string[] = [];
    const params: unknown[] = [];
    if (f.fechaInicio) {
      condiciones.push(`pe.creado_en >= $${params.length + 1}::date`);
      params.push(f.fechaInicio);
    }
    if (f.fechaFin) {
      condiciones.push(
        `pe.creado_en < ($${params.length + 1}::date + INTERVAL '1 day')`,
      );
      params.push(f.fechaFin);
    }
    if (f.vendedorId) {
      condiciones.push(`pe.procesado_por = $${params.length + 1}::int`);
      params.push(f.vendedorId);
    }
    if (f.productoId) {
      condiciones.push(
        `EXISTS (SELECT 1 FROM detalle_pedido dp_filtro
                 WHERE dp_filtro.pedido_id = pe.id
                   AND dp_filtro.producto_id = $${params.length + 1}::int)`,
      );
      params.push(f.productoId);
    }
    return {
      sql: condiciones.length ? condiciones.join(' AND ') : 'TRUE',
      params,
    };
  }

  /** Aplica rango de fechas, producto y vendedor sobre un QueryBuilder de pedidos. */
  private aplicarFiltros(
    qb: SelectQueryBuilder<ObjectLiteral>,
    filtros: FiltrosEfectivos,
  ): void {
    qb.andWhere(CONDICION_VENTA);

    if (filtros.fechaInicio) {
      qb.andWhere('pe.creado_en >= :fechaInicio::date', {
        fechaInicio: filtros.fechaInicio,
      });
    }
    if (filtros.fechaFin) {
      qb.andWhere("pe.creado_en < (:fechaFin::date + INTERVAL '1 day')", {
        fechaFin: filtros.fechaFin,
      });
    }
    if (filtros.productoId) {
      qb.andWhere('dp.producto_id = :productoId', {
        productoId: filtros.productoId,
      });
    }
    if (filtros.vendedorId) {
      // `procesado_por` es el vendedor que gestionó el pedido (ver
      // ReportesController: un rol 'ventas' nunca puede consultar a otro).
      qb.andWhere('pe.procesado_por = :vendedorId', {
        vendedorId: filtros.vendedorId,
      });
    }
  }

  /** Base común: pedidos → detalle → producto, sin depender de metadatos de
   * entidad (la columna `precio_costo` existe en BD pero no en la entidad
   * `Producto`, por eso se construye sobre nombres de tabla). */
  private baseVentas(filtros: FiltrosEfectivos): SelectQueryBuilder<ObjectLiteral> {
    const qb = this.dataSource
      .createQueryBuilder()
      .from('pedidos', 'pe')
      .innerJoin('detalle_pedido', 'dp', 'dp.pedido_id = pe.id')
      .innerJoin('productos', 'p', 'p.id = dp.producto_id');
    this.aplicarFiltros(qb, filtros);
    return qb;
  }

  /** Expresión de agrupación temporal parametrizable por alias de tabla. */
  private expresionFecha(alias: string, agrupacion: AgrupacionVentas): string {
    const expresiones: Record<AgrupacionVentas, string> = {
      dia: `TO_CHAR(DATE(${alias}.creado_en), 'YYYY-MM-DD')`,
      semana: `TO_CHAR(DATE_TRUNC('week', ${alias}.creado_en), 'YYYY-MM-DD')`,
      mes: `TO_CHAR(DATE_TRUNC('month', ${alias}.creado_en), 'YYYY-MM-DD')`,
      ano: `TO_CHAR(DATE_TRUNC('year', ${alias}.creado_en), 'YYYY-MM-DD')`,
    };
    return expresiones[agrupacion];
  }

  /**
   * Ticket promedio y cancelados se calculan sobre `pedidos.total`, nunca
   * sobre agregados del detalle, para no mezclar granularidades.
   */
  private async resumenPedidosPorFecha(
    f: FiltrosEfectivos,
    agrupacion: AgrupacionVentas,
  ): Promise<
    Map<string, { totalVendido: number; ticket: number; cancelados: number }>
  > {
    const expr = this.expresionFecha('pe', agrupacion);
    const { sql: base, params } = this.condicionesPedidos(f);

    const filas = await this.dataSource.query(
      `SELECT ${expr} AS fecha,
              COALESCE(SUM(pe.total), 0) AS total_vendido,
              COALESCE(AVG(pe.total), 0) AS ticket,
              0 AS cancelados
       FROM pedidos pe
       WHERE ${base} AND pe.estado <> 'cancelado'
       GROUP BY ${expr}
       UNION ALL
       SELECT ${expr} AS fecha,
              0 AS total_vendido,
              0 AS ticket,
              COUNT(*)::int AS cancelados
       FROM pedidos pe
       WHERE ${base} AND pe.estado = 'cancelado'
       GROUP BY ${expr}`,
      params,
    );

    const resumen = new Map<
      string,
      { totalVendido: number; ticket: number; cancelados: number }
    >();
    for (const fila of filas as Record<string, unknown>[]) {
      const fecha = String(fila.fecha);
      const actual = resumen.get(fecha) ?? {
        totalVendido: 0,
        ticket: 0,
        cancelados: 0,
      };
      resumen.set(fecha, {
        totalVendido: actual.totalVendido + num(fila.total_vendido),
        ticket: actual.ticket + num(fila.ticket),
        cancelados: actual.cancelados + num(fila.cancelados),
      });
    }
    return resumen;
  }

  /** Series temporales: total vendido, pedidos y ticket promedio por día/mes. */
  async ventasPorFecha(
    filtros: FiltroReportesDto | FiltrosEfectivos,
  ): Promise<PuntoVentaFecha[]> {
    const f = this.resolver(filtros);
    const agrupacion = f.agrupacion ?? 'dia';
    const agrupacionSql = this.expresionFecha('pe', agrupacion);

    const filas = await this.baseVentas(f)
      .select(agrupacionSql, 'fecha')
      .addSelect('COUNT(DISTINCT pe.id)', 'total_pedidos')
      .addSelect(`COALESCE(SUM(${UNIDADES_DETALLE}), 0)`, 'unidades_vendidas')
      .groupBy(agrupacionSql)
      .orderBy('fecha', 'ASC')
      .getRawMany<Record<string, unknown>>();

    const resumen = await this.resumenPedidosPorFecha(f, agrupacion);

    return filas.map((fila) => {
      const fecha = String(fila.fecha);
      const datosPedido = resumen.get(fecha);
      const ticket = num(datosPedido?.ticket);
      return {
        fecha,
        total_pedidos: num(fila.total_pedidos),
        unidades_vendidas: num(fila.unidades_vendidas),
        // `pedidos.total` es autoritativo y se agrega sin joins de detalle.
        total_vendido: num(datosPedido?.totalVendido),
        ticket_promedio: ticket,
        promedio_ticket: ticket,
        cancelados: num(datosPedido?.cancelados),
      };
    });
  }

  /** Ingresos vs. costos: utilidad bruta y margen porcentual. */
  async ganancias(
    filtros: FiltroReportesDto | FiltrosEfectivos,
  ): Promise<ResumenGanancias> {
    const f = this.resolver(filtros);
    // El costo sí depende del detalle; los ingresos y el ticket se toman de
    // `pedidos.total` en una consulta separada para no duplicar por línea.
    const fila = await this.baseVentas(f)
      .select(
        `COALESCE(SUM(${UNIDADES_DETALLE} * COALESCE(p.precio_costo, 0)), 0)`,
        'costo',
      )
      .getRawOne<Record<string, unknown>>();

    const { sql: condiciones, params } = this.condicionesPedidos(f);
    const pedidoFila = await this.dataSource.query(
      `SELECT COALESCE(SUM(total), 0) AS ingresos,
              COALESCE(AVG(total), 0) AS ticket_promedio,
              COUNT(*)::int AS total_pedidos
       FROM pedidos pe
       WHERE ${condiciones} AND pe.estado <> 'cancelado'`,
      params,
    );

    const ingresos = num(pedidoFila?.[0]?.ingresos);
    const ticket = num(pedidoFila?.[0]?.ticket_promedio);
    const costo = num(fila?.costo);
    const utilidadBruta = redondear(ingresos - costo);
    return {
      ingresos,
      costo,
      utilidad_bruta: utilidadBruta,
      ganancia: utilidadBruta,
      margen_porcentual:
        ingresos > 0 ? redondear((utilidadBruta / ingresos) * 100) : 0,
      total_pedidos: num(pedidoFila?.[0]?.total_pedidos),
      ticket_promedio: ticket,
      promedio_ticket: ticket,
    };
  }

  /** Top 10 por unidades vendidas y Top 10 por utilidad. */
  async topProductos(
    filtros: FiltroReportesDto | FiltrosEfectivos,
  ): Promise<TopProductosResult> {
    const f = this.resolver(filtros);

    const construir = () =>
      this.baseVentas(f)
        .select('p.id', 'producto_id')
        .addSelect('p.nombre', 'nombre')
        .addSelect('p.codigo', 'codigo')
        .addSelect(`COALESCE(SUM(${UNIDADES_DETALLE}), 0)`, 'unidades_vendidas')
        .addSelect(
          `COALESCE(SUM(${UNIDADES_DETALLE} * dp.precio_unitario), 0)`,
          'ingresos',
        )
        .addSelect(
          `COALESCE(SUM(${UNIDADES_DETALLE} * COALESCE(p.precio_costo, 0)), 0)`,
          'costo',
        )
        .addSelect(
          `COALESCE(SUM(${UNIDADES_DETALLE} * (dp.precio_unitario - COALESCE(p.precio_costo, 0))), 0)`,
          'utilidad',
        )
        .groupBy('p.id')
        .addGroupBy('p.nombre')
        .addGroupBy('p.codigo');

    const mapear = (filas: Record<string, unknown>[]): ProductoRanking[] =>
      filas.map((fila) => {
        const ingresos = num(fila.ingresos);
        const utilidad = num(fila.utilidad);
        return {
          producto_id: num(fila.producto_id),
          nombre: String(fila.nombre),
          codigo: fila.codigo == null ? null : String(fila.codigo),
          unidades_vendidas: num(fila.unidades_vendidas),
          ingresos,
          costo: num(fila.costo),
          utilidad,
          margen_porcentual:
            ingresos > 0 ? redondear((utilidad / ingresos) * 100) : 0,
        };
      });

    const [porUnidades, porUtilidad] = await Promise.all([
      construir()
        .orderBy('unidades_vendidas', 'DESC')
        .limit(10)
        .getRawMany<Record<string, unknown>>(),
      construir()
        .orderBy('utilidad', 'DESC')
        .limit(10)
        .getRawMany<Record<string, unknown>>(),
    ]);

    return {
      masVendidos: mapear(porUnidades),
      masRentables: mapear(porUtilidad),
    };
  }

  /** Ventas por día de un vendedor (o de todo el personal si no se indica usuarioId). */
  async ventasPersonalPorDia(usuarioId?: number, desde?: string, hasta?: string) {
    let sql = `
      SELECT
        TO_CHAR(DATE(creado_en), 'YYYY-MM-DD') AS fecha,
        COUNT(*)::int AS total_pedidos,
        COALESCE(SUM(total), 0) AS total_vendido
      FROM pedidos
      WHERE estado <> 'cancelado' AND procesado_por IS NOT NULL
    `;
    const params: unknown[] = [];
    let idx = 1;
    if (usuarioId) { sql += ` AND procesado_por = $${idx++}::int`; params.push(usuarioId); }
    if (desde) { sql += ` AND creado_en >= $${idx++}::date`; params.push(desde); }
    if (hasta) { sql += ` AND creado_en < ($${idx++})::date + INTERVAL '1 day'`; params.push(hasta); }
    sql += ` GROUP BY DATE(creado_en) ORDER BY fecha ASC`;
    return this.dataSource.query(sql, params);
  }

  async ventasPorProducto(
    desde?: string,
    hasta?: string,
    categoria_id?: number,
    vendedorId?: number,
    productoId?: number,
  ) {
    let sql = `
      SELECT
        p.id,
        p.nombre,
        p.precio,
        c.nombre AS categoria,
        COALESCE(SUM(COALESCE(dp.unidades, dp.cantidad)), 0)::int AS unidades_vendidas,
        COALESCE(SUM(COALESCE(dp.unidades, dp.cantidad) * dp.precio_unitario), 0) AS total_ingresos
      FROM detalle_pedido dp
      JOIN productos p ON p.id = dp.producto_id
      LEFT JOIN categorias c ON c.id = p.categoria_id
      JOIN pedidos pe ON pe.id = dp.pedido_id
      WHERE pe.estado <> 'cancelado'
    `;
    const params: unknown[] = [];
    let idx = 1;
    if (desde) { sql += ` AND pe.creado_en >= $${idx++}::date`; params.push(desde); }
    if (hasta) { sql += ` AND pe.creado_en < ($${idx++})::date + INTERVAL '1 day'`; params.push(hasta); }
    if (categoria_id) { sql += ` AND p.categoria_id = $${idx++}::int`; params.push(categoria_id); }
    if (vendedorId) { sql += ` AND pe.procesado_por = $${idx++}::int`; params.push(vendedorId); }
    if (productoId) { sql += ` AND p.id = $${idx++}::int`; params.push(productoId); }
    sql += ` GROUP BY p.id, p.nombre, p.precio, c.nombre ORDER BY total_ingresos DESC`;
    return this.dataSource.query(sql, params);
  }

  async ventasPorCategoria(
    desde?: string,
    hasta?: string,
    vendedorId?: number,
  ) {
    let sql = `
      SELECT
        c.id,
        c.nombre,
        COALESCE(SUM(COALESCE(dp.unidades, dp.cantidad)), 0)::int AS unidades_vendidas,
        COALESCE(SUM(COALESCE(dp.unidades, dp.cantidad) * dp.precio_unitario), 0) AS total_ingresos
      FROM categorias c
      LEFT JOIN productos p ON p.categoria_id = c.id
      LEFT JOIN detalle_pedido dp ON dp.producto_id = p.id
      LEFT JOIN pedidos pe ON pe.id = dp.pedido_id
        AND pe.estado <> 'cancelado'
        AND ($1::date IS NULL OR pe.creado_en >= $1::date)
        AND ($2::date IS NULL OR pe.creado_en < ($2::date + INTERVAL '1 day'))
        AND ($3::int IS NULL OR pe.procesado_por = $3::int)
    `;
    const params: unknown[] = [
      desde ?? null,
      hasta ?? null,
      vendedorId ?? null,
    ];
    sql += ` GROUP BY c.id, c.nombre ORDER BY total_ingresos DESC`;
    return this.dataSource.query(sql, params);
  }

  async inventarioActual() {
    return this.dataSource.query(`
      SELECT
        p.id, p.nombre, p.precio, p.precio_costo,
        i.cantidad, i.cantidad_minima,
        c.nombre AS categoria
      FROM inventario i
      JOIN productos p ON p.id = i.producto_id
      LEFT JOIN categorias c ON c.id = p.categoria_id
      ORDER BY p.nombre ASC
    `);
  }

  async clientesFrecuentes(vendedorId?: number) {
    const params: unknown[] = [];
    let sql = `
      SELECT
        u.id, u.nombre, u.email,
        COUNT(pe.id)::int AS total_compras,
        COALESCE(SUM(pe.total), 0) AS total_gastado,
        MAX(pe.creado_en) AS ultima_compra
      FROM usuarios u
      JOIN pedidos pe ON pe.usuario_id = u.id
      WHERE u.rol = 'cliente' AND pe.estado <> 'cancelado'
    `;
    if (vendedorId) {
      sql += ` AND pe.procesado_por = $1`;
      params.push(vendedorId);
    }
    sql += `
      GROUP BY u.id, u.nombre, u.email
      ORDER BY total_gastado DESC
      LIMIT 20
    `;
    return this.dataSource.query(sql, params);
  }

  async exportarCSV(tipo: string, filtros: FiltrosEfectivos): Promise<string> {
    let data: Record<string, unknown>[];

    switch (tipo) {
      case 'ventas-por-fecha':
        data = await this.ventasPorFecha(filtros);
        break;
      case 'ganancias':
        data = [await this.ganancias(filtros)];
        break;
      case 'top-productos': {
        const top = await this.topProductos(filtros);
        data = top.masVendidos as unknown as Record<string, unknown>[];
        break;
      }
      case 'ventas-por-producto':
        data = await this.ventasPorProducto(
          filtros.fechaInicio,
          filtros.fechaFin,
          filtros.categoriaId,
          filtros.vendedorId,
          filtros.productoId,
        );
        break;
      case 'ventas-por-categoria':
        data = await this.ventasPorCategoria(
          filtros.fechaInicio,
          filtros.fechaFin,
          filtros.vendedorId,
        );
        break;
      case 'inventario':
        data = await this.inventarioActual();
        break;
      case 'clientes':
        data = await this.clientesFrecuentes(filtros.vendedorId);
        break;
      default:
        data = [];
    }

    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const lines = [
      headers.join(','),
      ...data.map((row) =>
        headers
          .map((h) => {
            const val = row[h];
            if (val === null || val === undefined) return '';
            const str = String(val);
            return str.includes(',') || str.includes('"') || str.includes('\n')
              ? `"${str.replace(/"/g, '""')}"`
              : str;
          })
          .join(','),
      ),
    ];
    return lines.join('\n');
  }
}

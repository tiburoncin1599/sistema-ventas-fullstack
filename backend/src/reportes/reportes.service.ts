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
  agrupacion?: AgrupacionVentas;
}

export interface PuntoVentaFecha extends Record<string, unknown> {
  fecha: string;
  total_pedidos: number;
  unidades_vendidas: number;
  total_vendido: number;
  ticket_promedio: number;
}

export interface ResumenGanancias extends Record<string, unknown> {
  ingresos: number;
  costo: number;
  utilidad_bruta: number;
  margen_porcentual: number;
  total_pedidos: number;
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
 * En este sistema el flujo operativo usa `pendiente` como estado activo y
 * `cancelado` como único estado anulado (no existen `completado`/`entregado`).
 * Por eso "pedidos concretados" se traduce a `estado <> 'cancelado'`: aplicar
 * un filtro literal por `completado|entregado` dejaría todos los reportes
 * vacíos con los datos reales de la base.
 */
const CONDICION_VENTA = "pe.estado <> 'cancelado'";

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
      agrupacion: filtros.agrupacion,
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

  /** Series temporales: total vendido, pedidos y ticket promedio por día/mes. */
  async ventasPorFecha(
    filtros: FiltroReportesDto | FiltrosEfectivos,
  ): Promise<PuntoVentaFecha[]> {
    const f = this.resolver(filtros);
    const expresiones: Record<AgrupacionVentas, string> = {
      dia: "TO_CHAR(DATE(pe.creado_en), 'YYYY-MM-DD')",
      semana: "TO_CHAR(DATE_TRUNC('week', pe.creado_en), 'YYYY-MM-DD')",
      mes: "TO_CHAR(DATE_TRUNC('month', pe.creado_en), 'YYYY-MM-DD')",
      ano: "TO_CHAR(DATE_TRUNC('year', pe.creado_en), 'YYYY-MM-DD')",
    };
    const agrupacion = expresiones[f.agrupacion ?? 'dia'];

    const filas = await this.baseVentas(f)
      .select(agrupacion, 'fecha')
      .addSelect('COUNT(DISTINCT pe.id)', 'total_pedidos')
      .addSelect('COALESCE(SUM(dp.cantidad), 0)', 'unidades_vendidas')
      .addSelect(
        'COALESCE(SUM(dp.cantidad * dp.precio_unitario), 0)',
        'total_vendido',
      )
      .addSelect(
        'COALESCE(SUM(dp.cantidad * dp.precio_unitario), 0) / NULLIF(COUNT(DISTINCT pe.id), 0)',
        'ticket_promedio',
      )
      .groupBy(agrupacion)
      .orderBy('fecha', 'ASC')
      .getRawMany<Record<string, unknown>>();

    return filas.map((fila) => ({
      fecha: String(fila.fecha),
      total_pedidos: num(fila.total_pedidos),
      unidades_vendidas: num(fila.unidades_vendidas),
      total_vendido: num(fila.total_vendido),
      ticket_promedio: num(fila.ticket_promedio),
    }));
  }

  /** Ingresos vs. costos: utilidad bruta y margen porcentual. */
  async ganancias(
    filtros: FiltroReportesDto | FiltrosEfectivos,
  ): Promise<ResumenGanancias> {
    const f = this.resolver(filtros);
    const fila = await this.baseVentas(f)
      .select(
        'COALESCE(SUM(dp.cantidad * dp.precio_unitario), 0)',
        'ingresos',
      )
      .addSelect(
        'COALESCE(SUM(dp.cantidad * COALESCE(p.precio_costo, 0)), 0)',
        'costo',
      )
      .addSelect(
        'COALESCE(SUM(dp.cantidad * (dp.precio_unitario - COALESCE(p.precio_costo, 0))), 0)',
        'utilidad_bruta',
      )
      .addSelect('COUNT(DISTINCT pe.id)', 'total_pedidos')
      .getRawOne<Record<string, unknown>>();

    const ingresos = num(fila?.ingresos);
    const utilidadBruta = num(fila?.utilidad_bruta);
    return {
      ingresos,
      costo: num(fila?.costo),
      utilidad_bruta: utilidadBruta,
      margen_porcentual:
        ingresos > 0 ? redondear((utilidadBruta / ingresos) * 100) : 0,
      total_pedidos: num(fila?.total_pedidos),
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
        .addSelect('COALESCE(SUM(dp.cantidad), 0)', 'unidades_vendidas')
        .addSelect(
          'COALESCE(SUM(dp.cantidad * dp.precio_unitario), 0)',
          'ingresos',
        )
        .addSelect(
          'COALESCE(SUM(dp.cantidad * COALESCE(p.precio_costo, 0)), 0)',
          'costo',
        )
        .addSelect(
          'COALESCE(SUM(dp.cantidad * (dp.precio_unitario - COALESCE(p.precio_costo, 0))), 0)',
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
      WHERE estado != 'cancelado' AND procesado_por IS NOT NULL
    `;
    const params: unknown[] = [];
    let idx = 1;
    if (usuarioId) { sql += ` AND procesado_por = $${idx++}`; params.push(usuarioId); }
    if (desde) { sql += ` AND creado_en >= $${idx++}::date`; params.push(desde); }
    if (hasta) { sql += ` AND creado_en < ($${idx++})::date + INTERVAL '1 day'`; params.push(hasta); }
    sql += ` GROUP BY DATE(creado_en) ORDER BY fecha ASC`;
    return this.dataSource.query(sql, params);
  }

  async ventasPorProducto(desde?: string, hasta?: string, categoria_id?: number) {
    let sql = `
      SELECT
        p.id,
        p.nombre,
        p.precio,
        c.nombre AS categoria,
        COALESCE(SUM(dp.cantidad), 0)::int AS unidades_vendidas,
        COALESCE(SUM(dp.cantidad * dp.precio_unitario), 0) AS total_ingresos
      FROM detalle_pedido dp
      JOIN productos p ON p.id = dp.producto_id
      LEFT JOIN categorias c ON c.id = p.categoria_id
      JOIN pedidos pe ON pe.id = dp.pedido_id
      WHERE pe.estado != 'cancelado'
    `;
    const params: unknown[] = [];
    let idx = 1;
    if (desde) { sql += ` AND pe.creado_en >= $${idx++}`; params.push(desde); }
    if (hasta) { sql += ` AND pe.creado_en < ($${idx++})::date + INTERVAL '1 day'`; params.push(hasta); }
    if (categoria_id) { sql += ` AND p.categoria_id = $${idx++}`; params.push(categoria_id); }
    sql += ` GROUP BY p.id, p.nombre, p.precio, c.nombre ORDER BY total_ingresos DESC`;
    return this.dataSource.query(sql, params);
  }

  async ventasPorCategoria(desde?: string, hasta?: string) {
    let sql = `
      SELECT
        c.id,
        c.nombre,
        COALESCE(SUM(dp.cantidad), 0)::int AS unidades_vendidas,
        COALESCE(SUM(dp.cantidad * dp.precio_unitario), 0) AS total_ingresos
      FROM categorias c
      LEFT JOIN productos p ON p.categoria_id = c.id
      LEFT JOIN detalle_pedido dp ON dp.producto_id = p.id
      LEFT JOIN pedidos pe ON pe.id = dp.pedido_id AND pe.estado != 'cancelado'
      WHERE 1=1
    `;
    const params: unknown[] = [];
    let idxCat = 1;
    if (desde) { sql += ` AND pe.creado_en >= $${idxCat++}`; params.push(desde); }
    if (hasta) { sql += ` AND pe.creado_en < ($${idxCat++})::date + INTERVAL '1 day'`; params.push(hasta); }
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

  async clientesFrecuentes() {
    return this.dataSource.query(`
      SELECT
        u.id, u.nombre, u.email,
        COUNT(pe.id)::int AS total_compras,
        COALESCE(SUM(pe.total), 0) AS total_gastado,
        MAX(pe.creado_en) AS ultima_compra
      FROM usuarios u
      JOIN pedidos pe ON pe.usuario_id = u.id
      WHERE u.rol = 'cliente' AND pe.estado != 'cancelado'
      GROUP BY u.id, u.nombre, u.email
      ORDER BY total_gastado DESC
      LIMIT 20
    `);
  }

  async exportarCSV(tipo: string, desde?: string, hasta?: string): Promise<string> {
    const filtros = { fechaInicio: desde, fechaFin: hasta };
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
        data = await this.ventasPorProducto(desde, hasta);
        break;
      case 'ventas-por-categoria':
        data = await this.ventasPorCategoria(desde, hasta);
        break;
      case 'inventario':
        data = await this.inventarioActual();
        break;
      case 'clientes':
        data = await this.clientesFrecuentes();
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

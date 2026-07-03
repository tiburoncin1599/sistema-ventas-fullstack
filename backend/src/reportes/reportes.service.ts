import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class ReportesService {
  constructor(@InjectDataSource() private dataSource: DataSource) {}

  async ventasPorFecha(desde?: string, hasta?: string) {
    let sql = `
      SELECT
        DATE(creado_en) AS fecha,
        COUNT(*)::int AS total_pedidos,
        COALESCE(SUM(total), 0) AS total_vendido,
        COUNT(*) FILTER (WHERE estado = 'cancelado')::int AS cancelados
      FROM pedidos
      WHERE 1=1
    `;
    const params: unknown[] = [];
    if (desde) { sql += ` AND creado_en >= $1`; params.push(desde); }
    if (hasta) { sql += ` AND creado_en <= $2`; params.push(hasta); }
    sql += ` GROUP BY DATE(creado_en) ORDER BY fecha DESC`;
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
    if (hasta) { sql += ` AND pe.creado_en <= $${idx++}`; params.push(hasta); }
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
    if (desde) { sql += ` AND pe.creado_en >= $1`; params.push(desde); }
    if (hasta) { sql += ` AND pe.creado_en <= $2`; params.push(hasta); }
    sql += ` GROUP BY c.id, c.nombre ORDER BY total_ingresos DESC`;
    return this.dataSource.query(sql, params);
  }

  async ganancias(desde?: string, hasta?: string) {
    let sql = `
      SELECT
        COALESCE(SUM(dp.cantidad * dp.precio_unitario), 0) AS ingresos,
        COALESCE(SUM(dp.cantidad * COALESCE(p.precio_costo, 0)), 0) AS costo,
        COALESCE(SUM(dp.cantidad * (dp.precio_unitario - COALESCE(p.precio_costo, 0))), 0) AS ganancia
      FROM detalle_pedido dp
      JOIN productos p ON p.id = dp.producto_id
      JOIN pedidos pe ON pe.id = dp.pedido_id
      WHERE pe.estado != 'cancelado'
    `;
    const params: unknown[] = [];
    if (desde) { sql += ` AND pe.creado_en >= $1`; params.push(desde); }
    if (hasta) { sql += ` AND pe.creado_en <= $2`; params.push(hasta); }
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
    let data: Record<string, unknown>[];

    switch (tipo) {
      case 'ventas-por-fecha':
        data = await this.ventasPorFecha(desde, hasta);
        break;
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
        headers.map((h) => {
          const val = row[h];
          if (val === null || val === undefined) return '';
          const str = String(val);
          return str.includes(',') || str.includes('"') || str.includes('\n')
            ? `"${str.replace(/"/g, '""')}"`
            : str;
        }).join(','),
      ),
    ];
    return lines.join('\n');
  }
}

import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ROLES, normalizarRol } from '../auth/roles.constant';

@Injectable()
export class DashboardService {
  constructor(@InjectDataSource() private dataSource: DataSource) {}

  async obtenerMetricas(rol: string, usuarioId?: number) {
    const rolNormalizado = normalizarRol(rol);
    const esVentas = rolNormalizado === ROLES.VENTAS;
    const vendedorId = esVentas ? usuarioId : undefined;

    const hoy = new Date();
    const inicioHoy = new Date(hoy);
    inicioHoy.setHours(0, 0, 0, 0);
    const inicioSemana = new Date(hoy);
    inicioSemana.setDate(hoy.getDate() - hoy.getDay());
    inicioSemana.setHours(0, 0, 0, 0);
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const finHoy = new Date(hoy);
    finHoy.setHours(0, 0, 0, 0);
    finHoy.setDate(finHoy.getDate() + 1);

    // Factories lazy: un rol nunca ejecuta consultas de métricas que no se
    // devuelven en su respuesta (antes se lanzaban todas y se descartaban).
    const componentes: Record<string, () => Promise<unknown>> = {
      ventasHoy: () => this.ventasEnRango(inicioHoy, finHoy, vendedorId),
      ventasSemana: () => this.ventasEnRango(inicioSemana, finHoy, vendedorId),
      ventasMes: () => this.ventasEnRango(inicioMes, finHoy, vendedorId),
      totales: () => this.totalesGlobales(),
      productosMasVendidos: () => this.productosMasVendidos(),
      stockBajo: () => this.stockBajo(),
      ultimosPedidos: () => this.ultimosPedidos(vendedorId),
      clientesRecientes: () => this.clientesRecientes(vendedorId),
      ventasPorMes: () => this.ventasPorMes(vendedorId),
    };

    const claves =
      esVentas
        ? ['ventasHoy', 'ventasSemana', 'ventasMes', 'productosMasVendidos', 'ultimosPedidos', 'clientesRecientes', 'ventasPorMes']
        : rolNormalizado === ROLES.INVENTARIO
          ? ['productosMasVendidos', 'stockBajo', 'ultimosPedidos']
          : Object.keys(componentes);

    const resultados = await Promise.all(
      claves.map((clave) => componentes[clave]()),
    );

    return Object.fromEntries(claves.map((clave, i) => [clave, resultados[i]]));
  }

  private async ventasEnRango(desde: Date, hasta: Date, vendedorId?: number) {
    const condiciones = ['creado_en >= $1', 'creado_en < $2'];
    const params: unknown[] = [desde, hasta];
    if (vendedorId) {
      condiciones.push(`procesado_por = $${params.length + 1}`);
      params.push(vendedorId);
    }
    const result = await this.dataSource.query(
      `SELECT
         COUNT(*) FILTER (WHERE estado <> 'cancelado')::int AS total_pedidos,
         COALESCE(SUM(total) FILTER (WHERE estado <> 'cancelado'), 0) AS total_vendido,
         COALESCE(AVG(total) FILTER (WHERE estado <> 'cancelado'), 0) AS ticket_promedio,
         COUNT(*) FILTER (WHERE estado = 'pendiente')::int AS pendientes,
         COUNT(*) FILTER (WHERE estado = 'cancelado')::int AS cancelados
       FROM pedidos
       WHERE ${condiciones.join(' AND ')}`,
      params,
    );
    return result[0];
  }

  private async totalesGlobales() {
    const result = await this.dataSource.query(`
      SELECT
        (SELECT COUNT(*)::int FROM usuarios WHERE activo = true) AS total_usuarios,
        (SELECT COUNT(*)::int FROM productos WHERE activo = true) AS total_productos,
        (SELECT COUNT(*)::int FROM pedidos WHERE estado <> 'cancelado') AS total_pedidos,
        (SELECT COALESCE(SUM(total), 0) FROM pedidos WHERE estado <> 'cancelado') AS ingresos_totales,
        (SELECT COALESCE(AVG(total), 0) FROM pedidos WHERE estado <> 'cancelado') AS ticket_promedio,
        (SELECT COUNT(*)::int FROM inventario i WHERE i.cantidad <= i.cantidad_minima) AS productos_stock_bajo,
        (SELECT COALESCE(SUM(monto - monto_pagado), 0) FROM deudas WHERE estado IN ('pendiente', 'parcial')) AS deudas_pendientes
    `);
    return result[0];
  }

  private async productosMasVendidos() {
    return this.dataSource.query(`
      SELECT
        p.id,
        p.nombre,
        p.precio,
        COALESCE(SUM(COALESCE(dp.unidades, dp.cantidad)), 0)::int AS total_vendido,
        COALESCE(SUM(COALESCE(dp.unidades, dp.cantidad) * dp.precio_unitario), 0) AS total_ingresos
      FROM detalle_pedido dp
      JOIN productos p ON p.id = dp.producto_id
      JOIN pedidos pe ON pe.id = dp.pedido_id
      WHERE pe.estado <> 'cancelado'
      GROUP BY p.id, p.nombre, p.precio
      ORDER BY total_vendido DESC
      LIMIT 10
    `);
  }

  private async stockBajo() {
    return this.dataSource.query(`
      SELECT
        i.id,
        p.id AS producto_id,
        p.nombre,
        i.cantidad,
        i.cantidad_minima,
        GREATEST(i.cantidad_minima - i.cantidad, 0) AS faltante
      FROM inventario i
      JOIN productos p ON p.id = i.producto_id
      WHERE i.cantidad <= i.cantidad_minima
      ORDER BY i.cantidad ASC
      LIMIT 10
    `);
  }

  private async ultimosPedidos(vendedorId?: number) {
    const params: unknown[] = [];
    let sql = `
      SELECT
        pe.id,
        pe.total,
        pe.estado,
        pe.creado_en,
        u.nombre AS usuario_nombre
      FROM pedidos pe
      LEFT JOIN usuarios u ON u.id = pe.usuario_id
    `;
    if (vendedorId) {
      sql += ` WHERE pe.procesado_por = $1`;
      params.push(vendedorId);
    }
    sql += ` ORDER BY pe.creado_en DESC LIMIT 10`;
    return this.dataSource.query(sql, params);
  }

  private async clientesRecientes(vendedorId?: number) {
    if (vendedorId) {
      return this.dataSource.query(
        `
          SELECT DISTINCT u.id, u.nombre, u.email, u.creado_en
          FROM usuarios u
          JOIN pedidos pe ON pe.usuario_id = u.id
          WHERE u.rol = 'cliente' AND u.activo = true AND pe.procesado_por = $1
          ORDER BY u.creado_en DESC
          LIMIT 10
        `,
        [vendedorId],
      );
    }
    return this.dataSource.query(`
      SELECT id, nombre, email, creado_en
      FROM usuarios
      WHERE rol = 'cliente' AND activo = true
      ORDER BY creado_en DESC
      LIMIT 10
    `);
  }

  private async ventasPorMes(vendedorId?: number) {
    const condiciones = [
      "estado <> 'cancelado'",
      "creado_en >= NOW() - INTERVAL '12 months'",
    ];
    const params: unknown[] = [];
    if (vendedorId) {
      condiciones.push(`procesado_por = $${params.length + 1}`);
      params.push(vendedorId);
    }
    return this.dataSource.query(
      `SELECT
         TO_CHAR(creado_en, 'YYYY-MM') AS mes,
         COUNT(*)::int AS total_pedidos,
         COALESCE(SUM(total), 0) AS total_vendido,
         COALESCE(AVG(total), 0) AS ticket_promedio
       FROM pedidos
       WHERE ${condiciones.join(' AND ')}
       GROUP BY TO_CHAR(creado_en, 'YYYY-MM')
       ORDER BY mes ASC`,
      params,
    );
  }
}

import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class DashboardService {
  constructor(@InjectDataSource() private dataSource: DataSource) {}

  async obtenerMetricas() {
    const hoy = new Date();
    const inicioHoy = new Date(hoy);
    inicioHoy.setHours(0, 0, 0, 0);
    const inicioSemana = new Date(hoy);
    inicioSemana.setDate(hoy.getDate() - hoy.getDay());
    inicioSemana.setHours(0, 0, 0, 0);
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const inicioAnio = new Date(hoy.getFullYear(), 0, 1);

    const [
      ventasHoy,
      ventasSemana,
      ventasMes,
      totales,
      productosMasVendidos,
      stockBajo,
      ultimosPedidos,
      clientesRecientes,
      ventasPorMes,
    ] = await Promise.all([
      this.ventasEnRango(inicioHoy, hoy),
      this.ventasEnRango(inicioSemana, hoy),
      this.ventasEnRango(inicioMes, hoy),
      this.totalesGlobales(),
      this.productosMasVendidos(),
      this.stockBajo(),
      this.ultimosPedidos(),
      this.clientesRecientes(),
      this.ventasPorMes(),
    ]);

    return {
      ventasHoy,
      ventasSemana,
      ventasMes,
      totales,
      productosMasVendidos,
      stockBajo,
      ultimosPedidos,
      clientesRecientes,
      ventasPorMes,
    };
  }

  private async ventasEnRango(desde: Date, hasta: Date) {
    const result = await this.dataSource.query(
      `SELECT
        COUNT(*)::int AS total_pedidos,
        COALESCE(SUM(total), 0) AS total_vendido,
        COUNT(*) FILTER (WHERE estado = 'pendiente')::int AS pendientes,
        COUNT(*) FILTER (WHERE estado = 'cancelado')::int AS cancelados
      FROM pedidos
      WHERE creado_en >= $1 AND creado_en <= $2`,
      [desde, hasta],
    );
    return result[0];
  }

  private async totalesGlobales() {
    const result = await this.dataSource.query(`
      SELECT
        (SELECT COUNT(*)::int FROM usuarios WHERE activo = true) AS total_usuarios,
        (SELECT COUNT(*)::int FROM productos WHERE activo = true) AS total_productos,
        (SELECT COUNT(*)::int FROM pedidos) AS total_pedidos,
        (SELECT COALESCE(SUM(total), 0) FROM pedidos WHERE estado != 'cancelado') AS ingresos_totales,
        (SELECT COUNT(*)::int FROM inventario WHERE cantidad <= cantidad_minima) AS productos_stock_bajo,
        (SELECT COALESCE(SUM(monto - monto_pagado), 0) FROM deudas WHERE estado = 'pendiente') AS deudas_pendientes
    `);
    return result[0];
  }

  private async productosMasVendidos() {
    return this.dataSource.query(`
      SELECT
        p.id,
        p.nombre,
        p.precio,
        COALESCE(SUM(dp.cantidad), 0)::int AS total_vendido,
        COALESCE(SUM(dp.cantidad * dp.precio_unitario), 0) AS total_ingresos
      FROM detalle_pedido dp
      JOIN productos p ON p.id = dp.producto_id
      JOIN pedidos pe ON pe.id = dp.pedido_id
      WHERE pe.estado NOT IN ('cancelado')
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
        (i.cantidad_minima - i.cantidad) AS faltante
      FROM inventario i
      JOIN productos p ON p.id = i.producto_id
      WHERE i.cantidad <= i.cantidad_minima
      ORDER BY i.cantidad ASC
      LIMIT 10
    `);
  }

  private async ultimosPedidos() {
    return this.dataSource.query(`
      SELECT
        pe.id,
        pe.total,
        pe.estado,
        pe.creado_en,
        u.nombre AS usuario_nombre
      FROM pedidos pe
      LEFT JOIN usuarios u ON u.id = pe.usuario_id
      ORDER BY pe.creado_en DESC
      LIMIT 10
    `);
  }

  private async clientesRecientes() {
    return this.dataSource.query(`
      SELECT id, nombre, email, creado_en
      FROM usuarios
      WHERE rol = 'cliente' AND activo = true
      ORDER BY creado_en DESC
      LIMIT 10
    `);
  }

  private async ventasPorMes() {
    return this.dataSource.query(`
      SELECT
        TO_CHAR(creado_en, 'YYYY-MM') AS mes,
        COUNT(*)::int AS total_pedidos,
        COALESCE(SUM(total), 0) AS total_vendido
      FROM pedidos
      WHERE estado != 'cancelado'
        AND creado_en >= NOW() - INTERVAL '12 months'
      GROUP BY TO_CHAR(creado_en, 'YYYY-MM')
      ORDER BY mes ASC
    `);
  }
}

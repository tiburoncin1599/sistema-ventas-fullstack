import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class NotificacionesService {
  constructor(@InjectDataSource() private dataSource: DataSource) {}

  async obtenerAlertas() {
    const [stockBajo, pedidosRecientes, deudasPendientes, ultimosIngresos] =
      await Promise.all([
        this.stockBajo(),
        this.pedidosRecientes(),
        this.deudasPendientes(),
        this.ultimosIngresos(),
      ]);

    return {
      stockBajo,
      pedidosRecientes,
      deudasPendientes,
      ultimosIngresos,
      total: stockBajo.length + pedidosRecientes.length + deudasPendientes.length,
    };
  }

  private async stockBajo() {
    return this.dataSource.query(`
      SELECT
        i.id,
        p.id AS producto_id,
        p.nombre,
        i.cantidad,
        i.cantidad_minima,
        (i.cantidad_minima - i.cantidad) AS faltante,
        'stock_bajo' AS tipo
      FROM inventario i
      JOIN productos p ON p.id = i.producto_id
      WHERE i.cantidad <= i.cantidad_minima AND p.activo = true
      ORDER BY i.cantidad ASC
      LIMIT 10
    `);
  }

  private async pedidosRecientes() {
    return this.dataSource.query(`
      SELECT
        pe.id,
        pe.total,
        pe.estado,
        pe.creado_en,
        u.nombre AS cliente,
        'pedido_nuevo' AS tipo
      FROM pedidos pe
      LEFT JOIN usuarios u ON u.id = pe.usuario_id
      WHERE pe.creado_en >= NOW() - INTERVAL '24 hours'
      ORDER BY pe.creado_en DESC
      LIMIT 10
    `);
  }

  private async deudasPendientes() {
    return this.dataSource.query(`
      SELECT
        d.id,
        d.monto,
        d.monto_pagado,
        (d.monto - d.monto_pagado) AS saldo,
        d.fecha_creacion,
        u.nombre AS cliente,
        'deuda_pendiente' AS tipo
      FROM deudas d
      LEFT JOIN usuarios u ON u.id = d.usuario_id
      WHERE d.estado = 'pendiente'
      ORDER BY d.fecha_creacion ASC
      LIMIT 10
    `);
  }

  private async ultimosIngresos() {
    return this.dataSource.query(`
      SELECT
        im.id,
        im.cantidad,
        im.motivo,
        im.creado_en,
        p.nombre AS producto,
        'movimiento' AS tipo
      FROM inventario_movimientos im
      JOIN productos p ON p.id = im.producto_id
      WHERE im.tipo = 'entrada'
        AND im.creado_en >= NOW() - INTERVAL '24 hours'
      ORDER BY im.creado_en DESC
      LIMIT 10
    `);
  }
}

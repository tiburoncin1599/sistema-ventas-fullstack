import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Like } from 'typeorm';
import { PedidosService } from '../pedidos/pedidos.service';

@Injectable()
export class POSService {
  constructor(
    @InjectDataSource() private dataSource: DataSource,
    private pedidosService: PedidosService,
  ) {}

  async buscarProductos(termino: string) {
    if (!termino || termino.length < 1) return [];

    return this.dataSource.query(
      `
      SELECT p.id, p.nombre, p.precio, p.codigo, i.cantidad AS stock
      FROM productos p
      LEFT JOIN inventario i ON i.producto_id = p.id
      WHERE p.activo = true
        AND (p.nombre ILIKE $1 OR p.codigo ILIKE $1)
      ORDER BY p.nombre ASC
      LIMIT 20
    `,
      [`%${termino}%`],
    );
  }

  async obtenerProductoPorCodigo(codigo: string) {
    const productos = await this.dataSource.query(
      `
      SELECT p.id, p.nombre, p.precio, p.codigo, i.cantidad AS stock
      FROM productos p
      LEFT JOIN inventario i ON i.producto_id = p.id
      WHERE p.activo = true AND p.codigo = $1
      LIMIT 1
    `,
      [codigo],
    );

    if (productos.length === 0) {
      throw new BadRequestException('Producto no encontrado');
    }

    return productos[0];
  }

  async ventaRapida(params: {
    usuarioId: number;
    items: Array<{ producto_id: number; cantidad: number }>;
    metodoPago: string;
    montoRecibido?: number;
    procesadoPor?: number;
  }) {
    const productos: any[] = await this.dataSource.query(
      `SELECT id, nombre, precio FROM productos WHERE id = ANY($1) AND activo = true`,
      [params.items.map((i) => i.producto_id)],
    );

    if (productos.length !== params.items.length) {
      throw new BadRequestException('Uno o más productos no encontrados');
    }

    const precioMap = new Map(productos.map((p) => [p.id, Number(p.precio)]));

    const itemsPedido = params.items.map((item) => ({
      producto_id: item.producto_id,
      cantidad: item.cantidad,
      precio: precioMap.get(item.producto_id) || 0,
    }));

    const pedido = await this.pedidosService.crear(
      params.usuarioId,
      undefined,
      itemsPedido,
      `Venta POS - ${params.metodoPago}`,
      params.procesadoPor,
    );

    await this.pedidosService.actualizarEstado(pedido.id, 'confirmado');
    await this.pedidosService.actualizarEstado(pedido.id, 'entregado');

    const cambio =
      params.metodoPago === 'efectivo' && params.montoRecibido
        ? params.montoRecibido - Number(pedido.total)
        : 0;

    return {
      ...pedido,
      metodo_pago: params.metodoPago,
      cambio: cambio > 0 ? cambio : 0,
    };
  }
}

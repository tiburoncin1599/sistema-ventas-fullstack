import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { PedidosService, normalizarTipoPago } from '../pedidos/pedidos.service';
import { factorConversion } from '../pedidos/conversion-paquetes';
import type { TipoPresentacion } from '../pedidos/detalle-pedido.entity';
import type { TipoPago } from '../pedidos/pedido.entity';

interface ItemVenta {
  producto_id: number;
  cantidad: number;
  tipo_presentacion: TipoPresentacion;
}

interface ProductoPos {
  id: number;
  nombre: string;
  precio: string | number;
  factor_paquete?: number | null;
}

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
      SELECT p.id, p.nombre, p.precio, p.codigo, p.factor_paquete,
             i.cantidad AS stock
      FROM productos p
      LEFT JOIN inventario i ON i.producto_id = p.id
      WHERE p.activo = true
        AND (p.nombre ILIKE $1 OR p.codigo ILIKE $1)
      ORDER BY LOWER(p.nombre) ASC, p.id ASC
      LIMIT 20
    `,
      [`%${termino}%`],
    );
  }

  async obtenerProductoPorCodigo(codigo: string) {
    const productos = await this.dataSource.query(
      `
      SELECT p.id, p.nombre, p.precio, p.codigo, p.factor_paquete,
             i.cantidad AS stock
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

  /** `metodoPago` es descriptivo; `tipoPago` define contabilidad y deuda. */
  private resolverTipoPago(metodoPago: string, tipoPago?: string): TipoPago {
    const canonico = normalizarTipoPago(tipoPago ?? metodoPago);
    if (canonico) return canonico;
    const texto = (tipoPago ?? metodoPago ?? '').toLowerCase();
    return texto.includes('credit') || texto.includes('crédito')
      ? 'CREDITO'
      : 'CONTADO';
  }

  async ventaRapida(params: {
    usuarioId: number;
    items: ItemVenta[];
    metodoPago: string;
    tipoPago?: string;
    montoRecibido?: number;
    procesadoPor?: number;
  }) {
    // Se fusionan solo líneas idénticas: unidades y paquetes del mismo
    // producto son líneas distintas porque consumen stock diferente.
    const porClave = new Map<string, ItemVenta>();
    for (const item of params.items) {
      const clave = `${item.producto_id}:${item.tipo_presentacion}`;
      const existente = porClave.get(clave);
      if (existente) {
        existente.cantidad += item.cantidad;
      } else {
        porClave.set(clave, { ...item });
      }
    }
    const itemsPos = [...porClave.values()];

    const idsUnicos = [...new Set(itemsPos.map((i) => i.producto_id))];
    const productos: ProductoPos[] = await this.dataSource.query(
      `SELECT id, nombre, precio, factor_paquete
       FROM productos
       WHERE id = ANY($1) AND activo = true`,
      [idsUnicos],
    );
    if (productos.length !== idsUnicos.length) {
      throw new BadRequestException('Uno o más productos no encontrados');
    }
    const productosPorId = new Map(productos.map((p) => [p.id, p]));

    const itemsConUnidades = itemsPos.map((item) => {
      const producto = productosPorId.get(item.producto_id)!;
      const factor =
        item.tipo_presentacion === 'PAQUETE' ? factorConversion(producto) : 1;
      return {
        ...item,
        precio: Number(producto.precio),
        unidades: item.cantidad * factor,
      };
    });

    const totalEstimado = itemsConUnidades.reduce(
      (sum, item) => sum + item.precio * item.unidades,
      0,
    );
    const tipoPago = this.resolverTipoPago(
      params.metodoPago,
      params.tipoPago,
    );

    if (
      tipoPago === 'CONTADO' &&
      params.montoRecibido !== undefined &&
      params.montoRecibido < totalEstimado
    ) {
      throw new BadRequestException(
        'El monto recibido es menor al total de la venta',
      );
    }

    // `crear()` persiste el estado y la deuda de forma coherente: contado
    // pagado → entregado; crédito/parcial → pedido pendiente con su deuda.
    const pedido = await this.pedidosService.crear(
      params.usuarioId,
      undefined,
      itemsConUnidades.map((item) => ({
        producto_id: item.producto_id,
        cantidad: item.cantidad,
        tipo_presentacion: item.tipo_presentacion,
        precio: item.precio,
      })),
      `Venta POS - ${params.metodoPago}`,
      params.procesadoPor,
      tipoPago,
      tipoPago === 'CREDITO'
        ? (params.montoRecibido ?? 0)
        : params.montoRecibido,
    );

    const cambio =
      tipoPago === 'CONTADO' && params.montoRecibido !== undefined
        ? params.montoRecibido - Number(pedido.total)
        : 0;

    return {
      ...pedido,
      metodo_pago: params.metodoPago,
      cambio: cambio > 0 ? cambio : 0,
    };
  }
}

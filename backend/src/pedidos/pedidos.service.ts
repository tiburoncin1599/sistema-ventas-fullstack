import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import {
  In,
  Not,
  IsNull,
  Repository,
  DataSource,
  Between,
  MoreThanOrEqual,
  LessThanOrEqual,
  FindOptionsWhere,
} from 'typeorm';
import { Pedido } from './pedido.entity';
import { DetallePedido } from './detalle-pedido.entity';
import { Producto } from '../productos/producto.entity';
import { Usuario } from '../usuarios/usuario.entity';
import { Deuda } from '../deudas/deuda.entity';
import { InventarioService } from '../inventario/inventario.service';
import { InventarioMovimientosService } from '../inventario-movimientos/inventario-movimientos.service';

interface ItemPedido {
  producto_id: number;
  cantidad: number;
  precio: number;
}

@Injectable()
export class PedidosService {
  constructor(
    @InjectRepository(Pedido)
    private pedidosRepo: Repository<Pedido>,
    @InjectRepository(DetallePedido)
    private detalleRepo: Repository<DetallePedido>,
    private inventarioService: InventarioService,
    private inventarioMovimientosService: InventarioMovimientosService,
    @InjectDataSource() private dataSource: DataSource,
  ) {}

  findAll(page = 1, limit = 50) {
    return this.pedidosRepo.find({
      relations: ['usuario', 'procesador'],
      order: { creado_en: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  findAllByEstado(estado: string, page = 1, limit = 50) {
    return this.pedidosRepo.find({
      where: { estado },
      relations: ['usuario', 'procesador'],
      order: { creado_en: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  /**
   * Listado con filtros combinados: estado, sin vendedor asignado
   * (sinProcesador) o filtrado por vendedor asignado (procesadorId).
   */
  findAllFiltrado(options: {
    estado?: string;
    sinProcesador?: boolean;
    procesadorId?: number;
    page?: number;
    limit?: number;
  }) {
    const where: FindOptionsWhere<Pedido> = {};
    if (options.estado) where.estado = options.estado;
    if (options.sinProcesador) where.procesado_por = IsNull();
    if (options.procesadorId) where.procesado_por = options.procesadorId;
    return this.pedidosRepo.find({
      where,
      relations: ['usuario', 'procesador'],
      order: { creado_en: 'DESC' },
      skip: ((options.page || 1) - 1) * (options.limit || 50),
      take: options.limit || 50,
    });
  }

  /** Pedidos creados por clientes externos que aún no tienen vendedor. */
  findPendientesAsignacion() {
    return this.findAllFiltrado({
      sinProcesador: true,
      limit: 100,
    });
  }

  /** Asigna un pedido sin vendedor a un usuario del personal de ventas. */
  async asignarVendedor(pedidoId: number, vendedorId: number) {
    const pedido = await this.findOne(pedidoId);
    if (pedido.procesado_por != null) {
      throw new BadRequestException(
        'Este pedido ya tiene un vendedor asignado',
      );
    }
    const vendedor = await this.pedidosRepo.manager.findOne(Usuario, {
      where: { id: vendedorId, rol: 'ventas', activo: true },
    });
    if (!vendedor) {
      throw new BadRequestException(
        'El vendedor seleccionado no existe o no está activo',
      );
    }
    await this.pedidosRepo.update(pedidoId, { procesado_por: vendedorId });
    return this.findOne(pedidoId);
  }

  findAllByDateRange(desde?: Date, hasta?: Date) {
    const where: any = {};
    if (desde || hasta) {
      where.creado_en = {};
      if (desde) where.creado_en['>='] = desde;
      if (hasta) {
        const hastaFin = new Date(hasta);
        hastaFin.setHours(23, 59, 59, 999);
        where.creado_en['<='] = hastaFin;
      }
    }
    return this.pedidosRepo.find({
      where,
      relations: ['usuario', 'procesador'],
      order: { creado_en: 'DESC' },
    });
  }

  findByUsuario(usuarioId: number) {
    return this.pedidosRepo.find({
      where: { usuario_id: usuarioId },
      relations: ['usuario', 'procesador'],
      order: { creado_en: 'DESC' },
    });
  }

  async findOne(id: number) {
    const pedido = await this.pedidosRepo.findOne({
      where: { id },
      relations: ['usuario', 'procesador'],
    });
    if (!pedido) throw new NotFoundException('Pedido no encontrado');
    return pedido;
  }

  async findDetalles(pedidoId: number) {
    return this.detalleRepo.find({
      where: { pedido_id: pedidoId },
      relations: ['producto'],
    });
  }

  async findFactura(id: number) {
    const pedido = await this.findOne(id);
    const detalles = await this.findDetalles(id);
    return { pedido, detalles };
  }

  /**
   * Resuelve los precios desde la BD: el cliente NUNCA define el precio.
   * Debe llamarse dentro de la transacción del pedido.
   */
  private async preciosDesdeBD(
    manager: import('typeorm').EntityManager,
    items: ItemPedido[],
  ): Promise<Map<number, number>> {
    const idsUnicos = [...new Set(items.map((i) => i.producto_id))];
    const productos = await manager.find(Producto, {
      where: { id: In(idsUnicos), activo: true },
    });
    if (productos.length !== idsUnicos.length) {
      throw new BadRequestException(
        'Uno o más productos no existen o están inactivos',
      );
    }
    return new Map(productos.map((p) => [p.id, Number(p.precio)]));
  }

  async crear(
    usuarioId: number,
    direccion: string | undefined,
    items: ItemPedido[],
    notas?: string,
    procesadoPor?: number,
    tipoPago?: string,
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const precios = await this.preciosDesdeBD(queryRunner.manager, items);
      const total = items.reduce(
        (sum, i) => sum + (precios.get(i.producto_id) ?? 0) * i.cantidad,
        0,
      );

      const pedido = queryRunner.manager.create(Pedido, {
        usuario_id: usuarioId,
        procesado_por: procesadoPor,
        total,
        direccion_entrega: direccion || '',
        notas: notas || '',
        estado: 'pendiente',
      });
      const pedidoGuardado = await queryRunner.manager.save(pedido);

      for (const item of items) {
        await this.inventarioService.descontar(
          item.producto_id,
          item.cantidad,
          queryRunner.manager,
        );
        await this.inventarioMovimientosService.registrar({
          producto_id: item.producto_id,
          tipo: 'venta',
          cantidad: item.cantidad,
          referencia_tipo: 'pedido',
          referencia_id: pedidoGuardado.id,
        }, queryRunner.manager).catch(() => {});
        const detalle = queryRunner.manager.create(DetallePedido, {
          pedido_id: pedidoGuardado.id,
          producto_id: item.producto_id,
          cantidad: item.cantidad,
          precio_unitario: precios.get(item.producto_id) ?? 0,
        });
        await queryRunner.manager.save(detalle);
      }

      // Crédito: registra el saldo pendiente en el módulo de deudas existente,
      // dentro de la misma transacción del pedido.
      if (tipoPago === 'credito') {
        await queryRunner.manager.save(
          queryRunner.manager.create(Deuda, {
            usuario_id: usuarioId,
            vendedor_id: procesadoPor,
            monto: total,
            descripcion: `Venta a crédito · Pedido #${pedidoGuardado.id}${notas ? ` — ${notas}` : ''}`,
            estado: 'pendiente',
            monto_pagado: 0,
          }),
        );
      }

      await queryRunner.commitTransaction();

      // Contado: la operación queda registrada como pagada según la lógica
      // actual (estado "entregado").
      if (tipoPago === 'contado') {
        await this.actualizarEstado(pedidoGuardado.id, 'confirmado');
        await this.actualizarEstado(pedidoGuardado.id, 'enviado');
        await this.actualizarEstado(pedidoGuardado.id, 'entregado');
      }

      return this.findOne(pedidoGuardado.id);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  private async findDetallesConManager(
    manager: import('typeorm').EntityManager,
    pedidoId: number,
  ) {
    return manager.find(DetallePedido, {
      where: { pedido_id: pedidoId },
      relations: ['producto'],
    });
  }

  private readonly transiciones: Record<string, string[]> = {
    pendiente: ['confirmado', 'cancelado'],
    confirmado: ['enviado', 'cancelado'],
    enviado: ['entregado', 'cancelado'],
    entregado: [],
    cancelado: [],
  };

  /**
   * Control de edición: un pedido solo se modifica en estado "pendiente".
   * Confirmado/enviado queda restringido a cambios de estado (quien edite items
   * alteraría el stock comprometido de una venta ya procesada).
   */
  private verificarEditable(pedido: Pedido) {
    if (pedido.estado !== 'pendiente') {
      throw new BadRequestException(
        'Un pedido solo se puede modificar mientras está en estado "pendiente"',
      );
    }
  }

  async actualizarEstado(id: number, estado: string) {
    const pedido = await this.findOne(id);
    const permitidos = this.transiciones[pedido.estado];
    if (!permitidos || !permitidos.includes(estado)) {
      throw new BadRequestException(
        `No se puede cambiar de "${pedido.estado}" a "${estado}". Transiciones permitidas: ${(permitidos || []).join(', ')}`,
      );
    }

    if (estado !== 'cancelado') {
      await this.pedidosRepo.update(id, { estado });
      return this.findOne(id);
    }

    // Al cancelar se devuelve el stock, dentro de una transacción
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const detalles = await queryRunner.manager.find(DetallePedido, {
        where: { pedido_id: id },
      });
      for (const detalle of detalles) {
        await this.inventarioService.devolver(
          detalle.producto_id,
          detalle.cantidad,
          queryRunner.manager,
        );
        await this.inventarioMovimientosService.registrar({
          producto_id: detalle.producto_id,
          tipo: 'devolucion',
          cantidad: detalle.cantidad,
          referencia_tipo: 'pedido',
          referencia_id: id,
          motivo: 'Pedido cancelado',
        }, queryRunner.manager).catch(() => {});
      }
      await queryRunner.manager.update(Pedido, id, { estado });
      await queryRunner.commitTransaction();
      return this.findOne(id);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async agregarItems(pedidoId: number, items: ItemPedido[]) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const pedido = await this.findOne(pedidoId);
      this.verificarEditable(pedido);

      const precios = await this.preciosDesdeBD(queryRunner.manager, items);

      for (const item of items) {
        await this.inventarioService.descontar(
          item.producto_id,
          item.cantidad,
          queryRunner.manager,
        );
        const detalle = queryRunner.manager.create(DetallePedido, {
          pedido_id: pedidoId,
          producto_id: item.producto_id,
          cantidad: item.cantidad,
          precio_unitario: precios.get(item.producto_id) ?? 0,
        });
        await queryRunner.manager.save(detalle);
      }

      const detalles = await this.findDetallesConManager(queryRunner.manager, pedidoId);
      const total = detalles.reduce(
        (sum, d) => sum + Number(d.precio_unitario) * d.cantidad,
        0,
      );
      await queryRunner.manager.update(Pedido, pedidoId, { total });

      await queryRunner.commitTransaction();
      return this.findFactura(pedidoId);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async eliminarItem(pedidoId: number, itemId: number) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const pedido = await this.findOne(pedidoId);
      this.verificarEditable(pedido);

      const detalle = await this.detalleRepo.findOne({
        where: { id: itemId, pedido_id: pedidoId },
      });
      if (!detalle)
        throw new NotFoundException('Detalle del pedido no encontrado');

      await this.inventarioService.devolver(
        detalle.producto_id,
        detalle.cantidad,
        queryRunner.manager,
      );
      await this.inventarioMovimientosService.registrar({
        producto_id: detalle.producto_id,
        tipo: 'devolucion',
        cantidad: detalle.cantidad,
        referencia_tipo: 'pedido',
        referencia_id: pedidoId,
        motivo: 'Eliminación de item del pedido',
      }, queryRunner.manager).catch(() => {});
      await queryRunner.manager.delete(DetallePedido, itemId);

      const detalles = await this.findDetallesConManager(queryRunner.manager, pedidoId);
      const total =
        detalles.length > 0
          ? detalles.reduce(
              (sum, d) => sum + Number(d.precio_unitario) * d.cantidad,
              0,
            )
          : 0;
      await queryRunner.manager.update(Pedido, pedidoId, { total });

      await queryRunner.commitTransaction();
      return this.findFactura(pedidoId);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async eliminar(id: number) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const pedido = await this.findOne(id);
      // Un pedido entregado ya se vendió: no devuelve stock
      const devolverStock = pedido.estado !== 'entregado';
      const detalles = await this.findDetalles(id);

      if (devolverStock) {
        for (const detalle of detalles) {
          await this.inventarioService.devolver(
            detalle.producto_id,
            detalle.cantidad,
            queryRunner.manager,
          );
          await this.inventarioMovimientosService.registrar({
            producto_id: detalle.producto_id,
            tipo: 'devolucion',
            cantidad: detalle.cantidad,
            referencia_tipo: 'pedido',
            referencia_id: id,
            motivo: 'Pedido eliminado',
          }, queryRunner.manager).catch(() => {});
        }
      }

      await queryRunner.manager.delete(DetallePedido, { pedido_id: id });
      await queryRunner.manager.delete(Pedido, id);

      await queryRunner.commitTransaction();
      return { message: 'Pedido eliminado correctamente' };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async actualizarItemCantidad(
    pedidoId: number,
    itemId: number,
    nuevaCantidad: number,
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const pedido = await this.findOne(pedidoId);
      this.verificarEditable(pedido);

      const detalle = await this.detalleRepo.findOne({
        where: { id: itemId, pedido_id: pedidoId },
      });
      if (!detalle)
        throw new NotFoundException('Detalle del pedido no encontrado');

      const diff = nuevaCantidad - detalle.cantidad;
      if (diff > 0) {
        await this.inventarioService.descontar(
          detalle.producto_id,
          diff,
          queryRunner.manager,
        );
      } else if (diff < 0) {
        await this.inventarioService.devolver(
          detalle.producto_id,
          Math.abs(diff),
          queryRunner.manager,
        );
      }

      await queryRunner.manager.update(DetallePedido, itemId, {
        cantidad: nuevaCantidad,
      });

      const detalles = await this.findDetallesConManager(queryRunner.manager, pedidoId);
      const total = detalles.reduce(
        (sum, d) => sum + Number(d.precio_unitario) * d.cantidad,
        0,
      );
      await queryRunner.manager.update(Pedido, pedidoId, { total });

      await queryRunner.commitTransaction();
      return this.findFactura(pedidoId);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async ventasPersonal(desde?: Date, hasta?: Date, usuarioId?: number) {
    const query = this.pedidosRepo
      .createQueryBuilder('pedido')
      .leftJoinAndSelect('pedido.procesador', 'procesador')
      .select('pedido.procesado_por', 'usuario_id')
      .addSelect('procesador.nombre', 'usuario_nombre')
      .addSelect('COUNT(pedido.id)', 'total_pedidos')
      .addSelect('SUM(pedido.total)', 'total_vendido')
      .where('pedido.procesado_por IS NOT NULL');

    if (usuarioId) {
      query.andWhere('pedido.procesado_por = :uid', { uid: usuarioId });
    }

    if (desde) query.andWhere('pedido.creado_en >= :desde', { desde });
    if (hasta) {
      const hastaFin = new Date(hasta);
      hastaFin.setHours(23, 59, 59, 999);
      query.andWhere('pedido.creado_en <= :hasta', { hasta: hastaFin });
    }

    const filas = await query
      .groupBy('pedido.procesado_por')
      .addGroupBy('procesador.nombre')
      .orderBy('total_vendido', 'DESC')
      .getRawMany();

    // Detalle de pedidos por vendedor (para la vista "Ver pedidos").
    // Incluye cliente y productos para consolidar la información.
    const whereDetalle: FindOptionsWhere<Pedido> = {
      procesado_por: usuarioId ?? Not(IsNull()),
    };
    if (desde || hasta) {
      if (desde && hasta) {
        const hastaFin = new Date(hasta);
        hastaFin.setHours(23, 59, 59, 999);
        whereDetalle.creado_en = Between(desde, hastaFin);
      } else if (desde) {
        whereDetalle.creado_en = MoreThanOrEqual(desde);
      } else {
        const hastaFin = new Date(hasta!);
        hastaFin.setHours(23, 59, 59, 999);
        whereDetalle.creado_en = LessThanOrEqual(hastaFin);
      }
    }
    const pedidosDetalle = await this.pedidosRepo.find({
      where: whereDetalle,
      relations: ['usuario'],
    });
    const pedidosPorUsuario = new Map<number, unknown[]>();

    if (pedidosDetalle.length > 0) {
      const ids = pedidosDetalle.map((p) => p.id);
      const items = await this.detalleRepo.find({
        where: { pedido_id: In(ids) },
        relations: ['producto'],
      });
      const itemsPorPedido = new Map<number, string[]>();
      for (const it of items) {
        const lista = itemsPorPedido.get(it.pedido_id) || [];
        const nombre = it.producto?.nombre || `Producto #${it.producto_id}`;
        lista.push(`${nombre} x${it.cantidad}`);
        itemsPorPedido.set(it.pedido_id, lista);
      }

      for (const p of pedidosDetalle) {
        if (p.procesado_por == null) continue;
        const arr = pedidosPorUsuario.get(p.procesado_por) || [];
        arr.push({
          id: p.id,
          total: Number(p.total),
          estado: p.estado,
          fecha: p.creado_en,
          cliente: p.usuario?.nombre || '',
          productos: itemsPorPedido.get(p.id) || [],
        });
        pedidosPorUsuario.set(p.procesado_por, arr);
      }
    }

    return filas.map((f) => ({
      usuario_id: Number(f.usuario_id),
      usuario_nombre: f.usuario_nombre as string,
      total_pedidos: Number(f.total_pedidos),
      total_vendido: Number(f.total_vendido),
      pedidos: pedidosPorUsuario.get(Number(f.usuario_id)) || [],
    }));
  }
}

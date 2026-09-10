import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { In, Repository, DataSource } from 'typeorm';
import { Pedido } from './pedido.entity';
import { DetallePedido } from './detalle-pedido.entity';
import { Producto } from '../productos/producto.entity';
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

      await queryRunner.commitTransaction();
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
      if (pedido.estado === 'cancelado' || pedido.estado === 'entregado') {
        throw new BadRequestException(
          'No se puede modificar un pedido cancelado o entregado',
        );
      }

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
      if (pedido.estado === 'cancelado' || pedido.estado === 'entregado') {
        throw new BadRequestException(
          'No se puede modificar un pedido cancelado o entregado',
        );
      }

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
      if (pedido.estado === 'cancelado' || pedido.estado === 'entregado') {
        throw new BadRequestException(
          'No se puede modificar un pedido cancelado o entregado',
        );
      }

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

  async ventasPersonal(desde?: Date, hasta?: Date) {
    const query = this.pedidosRepo
      .createQueryBuilder('pedido')
      .leftJoinAndSelect('pedido.procesador', 'procesador')
      .select('pedido.procesado_por', 'usuario_id')
      .addSelect('procesador.nombre', 'usuario_nombre')
      .addSelect('COUNT(pedido.id)', 'total_pedidos')
      .addSelect('SUM(pedido.total)', 'total_vendido')
      .where('pedido.procesado_por IS NOT NULL');

    if (desde) query.andWhere('pedido.creado_en >= :desde', { desde });
    if (hasta) {
      const hastaFin = new Date(hasta);
      hastaFin.setHours(23, 59, 59, 999);
      query.andWhere('pedido.creado_en <= :hasta', { hasta: hastaFin });
    }

    return query
      .groupBy('pedido.procesado_por')
      .addGroupBy('procesador.nombre')
      .orderBy('total_vendido', 'DESC')
      .getRawMany();
  }
}

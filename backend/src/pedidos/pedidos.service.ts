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
  EntityManager,
} from 'typeorm';
import { Pedido } from './pedido.entity';
import { DetallePedido } from './detalle-pedido.entity';
import { Producto } from '../productos/producto.entity';
import { Usuario } from '../usuarios/usuario.entity';
import { Deuda } from '../deudas/deuda.entity';
import { InventarioService } from '../inventario/inventario.service';
import { InventarioMovimientosService } from '../inventario-movimientos/inventario-movimientos.service';
import { InventarioMovimiento } from '../inventario-movimientos/inventario-movimiento.entity';
import { AuditService } from '../audit/audit.service';

interface ItemPedido {
  producto_id: number;
  cantidad: number;
  precio: number;
}

/** Usuario que ejecuta la operación; se persiste dentro de la transacción. */
export interface AuditorPedido {
  usuario_id: number;
  usuario_rol?: string;
  usuario_nombre?: string;
  ip?: string;
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
    private readonly auditService: AuditService,
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
  async asignarVendedor(
    pedidoId: number,
    vendedorId: number,
    auditor?: AuditorPedido,
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    const manager = queryRunner.manager;
    try {
      const pedido = await manager.findOne(Pedido, { where: { id: pedidoId } });
      if (!pedido) throw new NotFoundException('Pedido no encontrado');
      if (pedido.procesado_por != null) {
        throw new BadRequestException(
          'Este pedido ya tiene un vendedor asignado',
        );
      }
      const vendedor = await manager.findOne(Usuario, {
        where: { id: vendedorId, rol: 'ventas', activo: true },
      });
      if (!vendedor) {
        throw new BadRequestException(
          'El vendedor seleccionado no existe o no está activo',
        );
      }
      await manager.update(Pedido, pedidoId, { procesado_por: vendedorId });
      await this.auditar(manager, {
        accion: 'asignar_vendedor',
        entidad_id: pedidoId,
        valor_anterior: { procesado_por: null },
        valor_nuevo: { procesado_por: vendedorId },
        auditor,
      });
      await queryRunner.commitTransaction();
      return this.findOne(pedidoId);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
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

  /** Resuelve los precios desde la BD: el cliente NUNCA define el precio. */
  private async preciosDesdeBD(
    manager: EntityManager,
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

  private nuevoHistorial(estados: string[], auditor?: AuditorPedido) {
    return estados.map((estado) => ({
      estado,
      fecha: new Date(),
      ...(auditor?.usuario_id ? { usuario: auditor.usuario_id } : {}),
      observacion: 'Registrado desde el punto de venta',
    }));
  }

  /** Auditoría del ejecutor escrita con el manager de la transacción activa. */
  private async auditar(
    manager: EntityManager,
    datos: {
      accion: string;
      entidad_id?: number;
      valor_anterior?: Record<string, unknown>;
      valor_nuevo?: Record<string, unknown>;
      auditor?: AuditorPedido;
    },
  ) {
    if (!datos.auditor) return;
    await this.auditService.registrarEnTransaccion(
      {
        accion: datos.accion,
        entidad: 'pedido',
        entidad_id: datos.entidad_id,
        valor_anterior: datos.valor_anterior,
        valor_nuevo: datos.valor_nuevo,
        usuario_id: datos.auditor.usuario_id,
        usuario_nombre: datos.auditor.usuario_nombre,
        usuario_rol: datos.auditor.usuario_rol,
        ip: datos.auditor.ip,
      },
      manager,
    );
  }

  /**
   * Paso (a)+(b): valida stock con pessimistic_write, descuenta y escribe el
   * movimiento SALIDA del Kardex con motivo y referencia al pedido.
   * Cualquier fallo lanza y provoca el rollback de toda la operación.
   */
  private async registrarSalida(
    manager: EntityManager,
    pedidoId: number,
    items: { producto_id: number; cantidad: number }[],
    motivo: string,
    usuarioId?: number,
  ) {
    for (const item of items) {
      const inventario = await this.inventarioService.descontarConBloqueo(
        item.producto_id,
        item.cantidad,
        manager,
      );
      await this.inventarioMovimientosService.registrar(
        {
          producto_id: item.producto_id,
          tipo: 'salida',
          cantidad: item.cantidad,
          cantidad_anterior: inventario.cantidadAnterior,
          cantidad_nueva: inventario.cantidadNueva,
          motivo,
          referencia_tipo: 'pedido',
          referencia_id: pedidoId,
          usuario_id: usuarioId,
        },
        manager,
      );
    }
  }

  /** Devolución de stock y Kardex, también dentro de la transacción. */
  private async registrarDevolucion(
    manager: EntityManager,
    pedidoId: number,
    items: { producto_id: number; cantidad: number }[],
    motivo: string,
    usuarioId?: number,
  ) {
    for (const item of items) {
      await this.inventarioService.devolver(
        item.producto_id,
        item.cantidad,
        manager,
      );
      await this.inventarioMovimientosService.registrar(
        {
          producto_id: item.producto_id,
          tipo: 'devolucion',
          cantidad: item.cantidad,
          motivo,
          referencia_tipo: 'pedido',
          referencia_id: pedidoId,
          usuario_id: usuarioId,
        },
        manager,
      );
    }
  }

  /** ¿Ya se descontó el stock de este pedido? Evita dobles descuentos. */
  private async stockDescontado(manager: EntityManager, pedidoId: number) {
    const movimientos = await manager.count(InventarioMovimiento, {
      where: {
        tipo: 'salida',
        referencia_tipo: 'pedido',
        referencia_id: pedidoId,
      },
    });
    return movimientos > 0;
  }

  async crear(
    usuarioId: number,
    direccion: string | undefined,
    items: ItemPedido[],
    notas?: string,
    procesadoPor?: number,
    tipoPago?: string,
    montoPagado?: number,
    auditor?: AuditorPedido,
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    const manager = queryRunner.manager;
    try {
      const precios = await this.preciosDesdeBD(manager, items);
      const total = items.reduce(
        (sum, i) => sum + (precios.get(i.producto_id) ?? 0) * i.cantidad,
        0,
      );
      const esCredito = tipoPago === 'credito';
      // Contado sin monto explícito se considera totalmente pagado.
      const abono =
        !esCredito && montoPagado === undefined
          ? total
          : Math.min(Math.max(Number(montoPagado ?? 0), 0), total);
      const contado = !esCredito && abono >= total;
      const estadoFinal = contado ? 'entregado' : 'pendiente';

      const pedido = manager.create(Pedido, {
        usuario_id: usuarioId,
        procesado_por: procesadoPor,
        total,
        direccion_entrega: direccion || '',
        notas: notas || '',
        estado: estadoFinal,
        historial_estados: contado
          ? this.nuevoHistorial(['confirmado', 'enviado', 'entregado'], auditor)
          : this.nuevoHistorial(['pendiente'], auditor),
      });
      const pedidoGuardado = await manager.save(pedido);

      // Stock + Kardex en la MISMA transacción, antes de cualquier commit.
      await this.registrarSalida(
        manager,
        pedidoGuardado.id,
        items,
        'Venta registrada desde el punto de venta',
        auditor?.usuario_id,
      );

      for (const item of items) {
        const detalle = manager.create(DetallePedido, {
          pedido_id: pedidoGuardado.id,
          producto_id: item.producto_id,
          cantidad: item.cantidad,
          precio_unitario: precios.get(item.producto_id) ?? 0,
        });
        await manager.save(detalle);
      }

      // Paso (c): deuda por crédito o pago parcial.
      if (tipoPago === 'credito' || (abono > 0 && abono < total)) {
        await manager.save(
          manager.create(Deuda, {
            usuario_id: usuarioId,
            vendedor_id: procesadoPor,
            pedido_id: pedidoGuardado.id,
            monto: total,
            descripcion: `Venta a ${tipoPago === 'credito' ? 'crédito' : 'pago parcial'} · Pedido #${pedidoGuardado.id}${notas ? ` — ${notas}` : ''}`,
            estado: abono >= total ? 'pagado' : 'pendiente',
            monto_pagado: abono,
          }),
        );
      }

      // Paso (d): auditoría del usuario ejecutor, atómica con el resto.
      await this.auditar(manager, {
        accion: 'crear',
        entidad_id: pedidoGuardado.id,
        valor_nuevo: {
          total,
          estado: estadoFinal,
          tipoPago: tipoPago || 'contado',
          monto_pagado: abono,
          items: items.length,
        },
        auditor,
      });

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
    manager: EntityManager,
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

  /** Un pedido solo se modifica mientras está en estado "pendiente". */
  private verificarEditable(pedido: Pedido) {
    if (pedido.estado !== 'pendiente') {
      throw new BadRequestException(
        'Un pedido solo se puede modificar mientras está en estado "pendiente"',
      );
    }
  }

  /**
   * Confirma la venta al pasar a "entregado". Si el pedido ya descontó stock
   * al crearse (flujo POS) no vuelve a hacerlo; si no, ejecuta la validación
   * con bloqueo pesimista + descuento + Kardex + auditoría de forma atómica.
   */
  async actualizarEstado(
    id: number,
    estado: string,
    auditor?: AuditorPedido,
  ) {
    const pedido = await this.findOne(id);
    const permitidos = this.transiciones[pedido.estado];
    if (!permitidos || !permitidos.includes(estado)) {
      throw new BadRequestException(
        `No se puede cambiar de "${pedido.estado}" a "${estado}". Transiciones permitidas: ${(permitidos || []).join(', ')}`,
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    const manager = queryRunner.manager;
    try {
      // Bloquea el pedido para evitar dos transiciones concurrentes.
      const bloqueado = await manager
        .createQueryBuilder(Pedido, 'pedido')
        .setLock('pessimistic_write')
        .where('pedido.id = :id', { id })
        .getOne();
      if (!bloqueado) throw new NotFoundException('Pedido no encontrado');

      const permitidosEnBD = this.transiciones[bloqueado.estado] || [];
      if (!permitidosEnBD.includes(estado)) {
        throw new BadRequestException(
          `No se puede cambiar de "${bloqueado.estado}" a "${estado}". Transiciones permitidas: ${permitidosEnBD.join(', ')}`,
        );
      }

      if (estado === 'entregado' && !(await this.stockDescontado(manager, id))) {
        const detalles = await manager.find(DetallePedido, {
          where: { pedido_id: id },
        });
        await this.registrarSalida(
          manager,
          id,
          detalles,
          'Pedido marcado como entregado',
          auditor?.usuario_id,
        );
      }

      if (estado === 'cancelado') {
        const detalles = await manager.find(DetallePedido, {
          where: { pedido_id: id },
        });
        await this.registrarDevolucion(
          manager,
          id,
          detalles,
          'Pedido cancelado',
          auditor?.usuario_id,
        );
      }

      await manager.update(Pedido, id, {
        estado,
        historial_estados: [
          ...(bloqueado.historial_estados || []),
          ...this.nuevoHistorial([estado], auditor),
        ],
      });

      await this.auditar(manager, {
        accion: estado === 'entregado' ? 'confirmar_venta' : 'modificar_estado',
        entidad_id: id,
        valor_anterior: { estado: bloqueado.estado },
        valor_nuevo: { estado },
        auditor,
      });

      await queryRunner.commitTransaction();
      return this.findOne(id);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async agregarItems(
    pedidoId: number,
    items: ItemPedido[],
    auditor?: AuditorPedido,
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    const manager = queryRunner.manager;
    try {
      const pedido = await this.findOne(pedidoId);
      this.verificarEditable(pedido);

      const precios = await this.preciosDesdeBD(manager, items);

      await this.registrarSalida(
        manager,
        pedidoId,
        items,
        'Items agregados al pedido',
        auditor?.usuario_id,
      );

      for (const item of items) {
        const detalle = manager.create(DetallePedido, {
          pedido_id: pedidoId,
          producto_id: item.producto_id,
          cantidad: item.cantidad,
          precio_unitario: precios.get(item.producto_id) ?? 0,
        });
        await manager.save(detalle);
      }

      const detalles = await this.findDetallesConManager(manager, pedidoId);
      const total = detalles.reduce(
        (sum, d) => sum + Number(d.precio_unitario) * d.cantidad,
        0,
      );
      await manager.update(Pedido, pedidoId, { total });

      await this.auditar(manager, {
        accion: 'agregar_items',
        entidad_id: pedidoId,
        valor_nuevo: { items: items.length, total },
        auditor,
      });

      await queryRunner.commitTransaction();
      return this.findFactura(pedidoId);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async eliminarItem(
    pedidoId: number,
    itemId: number,
    auditor?: AuditorPedido,
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    const manager = queryRunner.manager;
    try {
      const pedido = await this.findOne(pedidoId);
      this.verificarEditable(pedido);

      const detalle = await this.detalleRepo.findOne({
        where: { id: itemId, pedido_id: pedidoId },
      });
      if (!detalle)
        throw new NotFoundException('Detalle del pedido no encontrado');

      await this.registrarDevolucion(
        manager,
        pedidoId,
        [detalle],
        'Eliminación de item del pedido',
        auditor?.usuario_id,
      );
      await manager.delete(DetallePedido, itemId);

      const detalles = await this.findDetallesConManager(manager, pedidoId);
      const total =
        detalles.length > 0
          ? detalles.reduce(
              (sum, d) => sum + Number(d.precio_unitario) * d.cantidad,
              0,
            )
          : 0;
      await manager.update(Pedido, pedidoId, { total });

      await this.auditar(manager, {
        accion: 'eliminar_item',
        entidad_id: pedidoId,
        valor_anterior: { producto_id: detalle.producto_id, cantidad: detalle.cantidad },
        valor_nuevo: { total },
        auditor,
      });

      await queryRunner.commitTransaction();
      return this.findFactura(pedidoId);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async eliminar(id: number, auditor?: AuditorPedido) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    const manager = queryRunner.manager;
    try {
      const pedido = await this.findOne(id);
      // Un pedido entregado ya se vendió: no devuelve stock
      const devolverStock = pedido.estado !== 'entregado';
      const detalles = await this.findDetalles(id);

      if (devolverStock) {
        await this.registrarDevolucion(
          manager,
          id,
          detalles,
          'Pedido eliminado',
          auditor?.usuario_id,
        );
      }

      await manager.delete(DetallePedido, { pedido_id: id });
      await manager.delete(Deuda, { pedido_id: id });
      await manager.delete(Pedido, id);

      await this.auditar(manager, {
        accion: 'eliminar',
        entidad_id: id,
        valor_anterior: { estado: pedido.estado, total: pedido.total },
        valor_nuevo: { estado: 'eliminado' },
        auditor,
      });

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
    auditor?: AuditorPedido,
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    const manager = queryRunner.manager;
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
        await this.registrarSalida(
          manager,
          pedidoId,
          [{ producto_id: detalle.producto_id, cantidad: diff }],
          'Aumento de cantidad en item del pedido',
          auditor?.usuario_id,
        );
      } else if (diff < 0) {
        await this.registrarDevolucion(
          manager,
          pedidoId,
          [{ producto_id: detalle.producto_id, cantidad: Math.abs(diff) }],
          'Reducción de cantidad en item del pedido',
          auditor?.usuario_id,
        );
      }

      await manager.update(DetallePedido, itemId, {
        cantidad: nuevaCantidad,
      });

      const detalles = await this.findDetallesConManager(manager, pedidoId);
      const total = detalles.reduce(
        (sum, d) => sum + Number(d.precio_unitario) * d.cantidad,
        0,
      );
      await manager.update(Pedido, pedidoId, { total });

      await this.auditar(manager, {
        accion: 'actualizar_item',
        entidad_id: pedidoId,
        valor_anterior: { cantidad: detalle.cantidad },
        valor_nuevo: { cantidad: nuevaCantidad, total },
        auditor,
      });

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

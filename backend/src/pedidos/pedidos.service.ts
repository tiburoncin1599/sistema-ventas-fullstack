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
  And,
  MoreThanOrEqual,
  LessThan,
  FindOptionsWhere,
  EntityManager,
} from 'typeorm';
import { Pedido, TIPOS_PAGO, type TipoPago } from './pedido.entity';
import {
  CANTIDAD_MINIMA_POR_PRESENTACION,
  DetallePedido,
  normalizarTipoPresentacion,
  type TipoPresentacion,
} from './detalle-pedido.entity';
import { factorConversion } from './conversion-paquetes';
import { Producto } from '../productos/producto.entity';
import { Usuario } from '../usuarios/usuario.entity';
import { Deuda } from '../deudas/deuda.entity';
import { ConfirmarPagoSandboxDto } from './dto/confirmar-pago-sandbox.dto';
import { InventarioService } from '../inventario/inventario.service';
import { InventarioMovimientosService } from '../inventario-movimientos/inventario-movimientos.service';
import { InventarioMovimiento } from '../inventario-movimientos/inventario-movimiento.entity';
import { AuditService } from '../audit/audit.service';

interface ItemPedido {
  producto_id: number;
  cantidad: number;
  precio: number;
  /** Opcional por compatibilidad; ausente = presentación histórica (UNIDAD). */
  tipo_presentacion?: string;
}

/** Ítem ya resuelto: precio desde BD, factor y unidades físicas calculadas. */
interface ItemResuelto {
  producto_id: number;
  cantidad: number;
  tipo_presentacion: TipoPresentacion;
  precio_unitario: number;
  factor_conversion: number;
  /** `cantidad × factor_conversion`: lo que realmente sale del inventario. */
  unidades: number;
}

/** Estructura mínima que necesitan los movimientos de stock/Kardex. */
interface ItemStock {
  producto_id: number;
  cantidad: number;
  unidades?: number;
}

/**
 * Normaliza cualquier variante aceptada por la API (`CONTADO`, `contado`,
 * `CREDITO`, `credito`) a la forma canónica persistida. Devuelve `undefined`
 * cuando el llamador no envió el campo, para no inventar un pago inmediato.
 */
export function normalizarTipoPago(valor?: string | null): TipoPago | undefined {
  const limpio = (valor ?? '').trim().toUpperCase();
  return (TIPOS_PAGO as readonly string[]).includes(limpio)
    ? (limpio as TipoPago)
    : undefined;
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
      if (hasta) where.creado_en['<'] = this.finDelDia(hasta);
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
   * Resuelve precios y conversión desde la BD: el cliente NUNCA define ni el
   * precio ni el factor. Los productos legacy sin `tipo_presentacion` mantienen
   * factor 1, por lo que su total y su consumo de stock no cambian.
   */
  private async resolverItems(
    manager: EntityManager,
    items: ItemPedido[],
  ): Promise<ItemResuelto[]> {
    const idsUnicos = [...new Set(items.map((i) => i.producto_id))];
    const productos = await manager.find(Producto, {
      where: { id: In(idsUnicos), activo: true },
    });
    if (productos.length !== idsUnicos.length) {
      throw new BadRequestException(
        'Uno o más productos no existen o están inactivos',
      );
    }
    const porId = new Map(productos.map((p) => [p.id, p]));

    return items.map((item) => {
      const producto = porId.get(item.producto_id)!;
      const presentacion =
        normalizarTipoPresentacion(item.tipo_presentacion) ?? 'UNIDAD';
      const minimo = CANTIDAD_MINIMA_POR_PRESENTACION[presentacion];
      if (!Number.isInteger(item.cantidad) || item.cantidad < minimo) {
        throw new BadRequestException(
          `Cantidad inválida para ${producto.nombre}: se requieren al menos ${minimo} ${presentacion === 'PAQUETE' ? 'paquete(s)' : 'unidad(es)'} enteras`,
        );
      }
      const esPaquete = presentacion === 'PAQUETE';
      const factor = esPaquete ? factorConversion(producto) : 1;
      return {
        producto_id: item.producto_id,
        cantidad: item.cantidad,
        tipo_presentacion: presentacion,
        precio_unitario: Number(producto.precio),
        factor_conversion: factor,
        unidades: item.cantidad * factor,
      };
    });
  }

  /** Total de unidad de negocio: precio × unidades físicas. */
  private totalDesdeDetalles(detalles: DetallePedido[]): number {
    return detalles.reduce(
      (sum, d) =>
        sum + Number(d.precio_unitario) * (d.unidades ?? d.cantidad),
      0,
    );
  }

  private estadoDeuda(monto: number, pagado: number): 'pagado' | 'parcial' | 'pendiente' {
    if (pagado >= monto) return 'pagado';
    if (pagado > 0) return 'parcial';
    return 'pendiente';
  }

  /**
   * Mantiene `Deuda` alineada con el total del pedido después de cualquier
   * modificación de ítems. El saldo pagado nunca se reescribe: solo se
   * recalcula el estado (pagado/parcial/pendiente).
   */
  private async sincronizarDeuda(
    manager: EntityManager,
    pedido: Pedido,
    total: number,
  ) {
    const deuda = await manager.findOne(Deuda, {
      where: { pedido_id: pedido.id },
    });

    if (!deuda) {
      if (normalizarTipoPago(pedido.tipo_pago) === 'CREDITO') {
        await manager.save(
          manager.create(Deuda, {
            usuario_id: pedido.usuario_id,
            vendedor_id: pedido.procesado_por,
            pedido_id: pedido.id,
            monto: total,
            monto_pagado: 0,
            descripcion: `Venta a crédito · Pedido #${pedido.id}`,
            estado: 'pendiente',
          }),
        );
      }
      return;
    }

    const pagado = Number(deuda.monto_pagado) || 0;
    const estado = this.estadoDeuda(total, pagado);
    await manager.update(Deuda, deuda.id, {
      monto: total,
      estado,
      ...(estado === 'pagado' && !deuda.fecha_pago
        ? { fecha_pago: new Date() }
        : {}),
    });
  }

  /** Pedido bloqueado dentro de la transacción para mutaciones concurrentes. */
  private async findPedidoBloqueado(manager: EntityManager, id: number) {
    const pedido = await manager.findOne(Pedido, {
      where: { id },
      lock: { mode: 'pessimistic_write' },
    });
    if (!pedido) throw new NotFoundException('Pedido no encontrado');
    return pedido;
  }

  /**
   * Devuelve únicamente el stock que sigue pendiente de devolución para este
   * pedido. Así cancelar y después eliminar (o eliminar tras borrar un ítem)
   * no genera stock fantasma.
   */
  private async devolverStockPendiente(
    manager: EntityManager,
    pedidoId: number,
    detalles: DetallePedido[],
    motivo: string,
    usuarioId?: number,
  ) {
    const movimientos = await manager.find(InventarioMovimiento, {
      where: {
        referencia_tipo: 'pedido',
        referencia_id: pedidoId,
        tipo: In(['salida', 'venta', 'devolucion']),
      },
    });

    const netoPorProducto = new Map<number, number>();
    for (const movimiento of movimientos) {
      const tipo = String(movimiento.tipo).toLowerCase();
      const delta =
        tipo === 'devolucion'
          ? -Number(movimiento.cantidad)
          : Number(movimiento.cantidad);
      netoPorProducto.set(
        movimiento.producto_id,
        (netoPorProducto.get(movimiento.producto_id) ?? 0) + delta,
      );
    }

    const unidadesPorProducto = new Map<number, number>();
    for (const detalle of detalles) {
      const unidades = Number(detalle.unidades ?? detalle.cantidad);
      unidadesPorProducto.set(
        detalle.producto_id,
        (unidadesPorProducto.get(detalle.producto_id) ?? 0) + unidades,
      );
    }

    const items: ItemStock[] = [];
    for (const [producto_id, unidades] of unidadesPorProducto) {
      const pendiente = Math.max(
        0,
        Math.min(netoPorProducto.get(producto_id) ?? 0, unidades),
      );
      if (pendiente > 0) {
        items.push({ producto_id, cantidad: pendiente, unidades: pendiente });
      }
    }

    if (items.length > 0) {
      await this.registrarDevolucion(manager, pedidoId, items, motivo, usuarioId);
    }
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
    items: ItemStock[],
    motivo: string,
    usuarioId?: number,
  ) {
    for (const item of items) {
      // Un paquete consume sus unidades físicas, no una unidad por paquete.
      const unidades = item.unidades ?? item.cantidad;
      const inventario = await this.inventarioService.descontarConBloqueo(
        item.producto_id,
        unidades,
        manager,
      );
      await this.inventarioMovimientosService.registrar(
        {
          producto_id: item.producto_id,
          tipo: 'salida',
          cantidad: unidades,
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
    items: ItemStock[],
    motivo: string,
    usuarioId?: number,
  ) {
    for (const item of items) {
      // Devuelve exactamente lo que se descontó (unidades físicas).
      const unidades = item.unidades ?? item.cantidad;
      const inventario = await this.inventarioService.devolver(
        item.producto_id,
        unidades,
        manager,
      );
      await this.inventarioMovimientosService.registrar(
        {
          producto_id: item.producto_id,
          tipo: 'devolucion',
          cantidad: unidades,
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

  /** ¿Ya se descontó el stock de este pedido? Evita dobles descuentos. */
  private async stockDescontado(manager: EntityManager, pedidoId: number) {
    const movimientos = await manager.count(InventarioMovimiento, {
      where: {
        // Según el origen del pedido el egreso histórico se registró como
        // 'salida' o como 'venta'. Ambos significan stock ya descontado.
        tipo: In(['salida', 'venta']),
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
      const resueltos = await this.resolverItems(manager, items);
      const total = resueltos.reduce(
        (sum, i) => sum + i.precio_unitario * i.unidades,
        0,
      );
      const tipo = normalizarTipoPago(tipoPago);
      const esCredito = tipo === 'CREDITO';
      // Solo un contado explícito sin monto se considera totalmente pagado.
      // Si el campo no viene, el pedido queda pendiente (no se inventa un cobro).
      const abono =
        montoPagado === undefined
          ? tipo === 'CONTADO' ? total : 0
          : Math.min(Math.max(Number(montoPagado ?? 0), 0), total);
      // Un crédito totalmente cancelado tampoco debe quedar como pendiente.
      const pagadoTotalmente = abono >= total;
      const estadoFinal = pagadoTotalmente ? 'entregado' : 'pendiente';

      const pedido = manager.create(Pedido, {
        usuario_id: usuarioId,
        procesado_por: procesadoPor,
        total,
        direccion_entrega: direccion || '',
        notas: notas || '',
        estado: estadoFinal,
        tipo_pago: tipo ?? 'CONTADO',
        historial_estados: pagadoTotalmente
          ? this.nuevoHistorial(['confirmado', 'enviado', 'entregado'], auditor)
          : this.nuevoHistorial(['pendiente'], auditor),
      });
      const pedidoGuardado = await manager.save(pedido);

      // Stock + Kardex en la MISMA transacción, antes de cualquier commit.
      await this.registrarSalida(
        manager,
        pedidoGuardado.id,
        resueltos,
        'Venta registrada desde el punto de venta',
        auditor?.usuario_id,
      );

      for (const item of resueltos) {
        const detalle = manager.create(DetallePedido, {
          pedido_id: pedidoGuardado.id,
          producto_id: item.producto_id,
          cantidad: item.cantidad,
          tipo_presentacion: item.tipo_presentacion,
          factor_conversion: item.factor_conversion,
          unidades: item.unidades,
          precio_unitario: item.precio_unitario,
        });
        await manager.save(detalle);
      }

      // Paso (c): deuda por crédito o pago parcial, en la MISMA transacción.
      if (esCredito || (abono > 0 && abono < total)) {
        await manager.save(
          manager.create(Deuda, {
            usuario_id: usuarioId,
            vendedor_id: procesadoPor,
            pedido_id: pedidoGuardado.id,
            monto: total,
            descripcion: `Venta a ${esCredito ? 'crédito' : 'pago parcial'} · Pedido #${pedidoGuardado.id}${notas ? ` — ${notas}` : ''}`,
            estado: this.estadoDeuda(total, abono),
            monto_pagado: abono,
            ...(pagadoTotalmente ? { fecha_pago: new Date() } : {}),
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
          tipo_pago: tipo ?? 'CONTADO',
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

  /**
   * Confirma un pago simulado (QR o tarjeta de prueba) en una sola transacción.
   * El total se recalcula desde los detalles, se contabiliza como CONTADO y se
   * liquida la deuda del pedido si existía. NUNCA toca stock: ese ya se descontó
   * al crear el pedido. Repetir la misma referencia es idempotente.
   */
  async confirmarPagoSandbox(
    pedidoId: number,
    dto: ConfirmarPagoSandboxDto,
    auditor?: AuditorPedido,
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    const manager = queryRunner.manager;
    try {
      const pedido = await this.findPedidoBloqueado(manager, pedidoId);
      if (pedido.estado === 'cancelado') {
        throw new BadRequestException(
          'No se puede confirmar el pago de un pedido cancelado',
        );
      }

      const referencia = dto.referencia_transaccion.trim();
      const pagadoAnterior = Number(pedido.monto_pagado ?? 0) || 0;
      const detalles = await this.findDetallesConManager(manager, pedidoId);
      const total = this.totalDesdeDetalles(detalles);

      if (pedido.referencia_transaccion) {
        if (pedido.referencia_transaccion !== referencia) {
          throw new BadRequestException(
            'El pedido ya tiene una referencia de pago distinta',
          );
        }
      } else {
        const referenciaEnOtro = await manager.findOne(Pedido, {
          where: { referencia_transaccion: referencia },
        });
        if (referenciaEnOtro && referenciaEnOtro.id !== pedidoId) {
          throw new BadRequestException(
            'La referencia de transacción ya está asociada a otro pedido',
          );
        }

        const abono = dto.monto === undefined
          ? Math.max(total - pagadoAnterior, 0)
          : Number(dto.monto);
        if (!Number.isFinite(abono) || abono < 0) {
          throw new BadRequestException('El monto del pago no es válido');
        }
        if (pagadoAnterior + abono > total + 0.01) {
          throw new BadRequestException(
            'El monto del pago supera el total del pedido',
          );
        }

        const nuevoPagado = Math.min(pagadoAnterior + abono, total);
        const completo = nuevoPagado >= total - 0.005;
        const ahora = new Date();
        const metodo = dto.metodo_pago ?? 'SANDBOX';
        const estadoFinal = dto.avanzar_estado && pedido.estado === 'pendiente'
          ? 'confirmado'
          : pedido.estado;

        await manager.update(Pedido, pedidoId, {
          monto_pagado: nuevoPagado,
          tipo_pago: completo ? 'CONTADO' : pedido.tipo_pago,
          metodo_pago: metodo,
          referencia_transaccion: referencia,
          ...(completo ? { fecha_pago: ahora } : {}),
          ...(estadoFinal !== pedido.estado
            ? {
                estado: estadoFinal,
                historial_estados: [
                  ...(pedido.historial_estados || []),
                  {
                    estado: estadoFinal,
                    fecha: ahora,
                    ...(auditor?.usuario_id
                      ? { usuario: auditor.usuario_id }
                      : {}),
                    observacion: 'Pago sandbox aprobado',
                  },
                ],
              }
            : {}),
        });

        const deuda = await manager.findOne(Deuda, {
          where: { pedido_id: pedidoId },
          lock: { mode: 'pessimistic_write' },
        });
        if (deuda) {
          const montoDeuda = Number(deuda.monto) || 0;
          const pagadoDeuda = Number(deuda.monto_pagado) || 0;
          const abonoDeuda = Math.min(
            abono,
            Math.max(montoDeuda - pagadoDeuda, 0),
          );
          const nuevoPagadoDeuda = Math.min(
            pagadoDeuda + abonoDeuda,
            montoDeuda,
          );
          const estadoDeudaFinal = this.estadoDeuda(
            montoDeuda,
            nuevoPagadoDeuda,
          );
          await manager.update(Deuda, deuda.id, {
            monto_pagado: nuevoPagadoDeuda,
            estado: estadoDeudaFinal,
            referencia_transaccion: referencia,
            ...(estadoDeudaFinal === 'pagado' && !deuda.fecha_pago
              ? { fecha_pago: ahora }
              : {}),
          });
        } else if (!completo) {
          await manager.save(
            manager.create(Deuda, {
              usuario_id: pedido.usuario_id,
              vendedor_id: pedido.procesado_por,
              pedido_id: pedidoId,
              monto: total,
              monto_pagado: nuevoPagado,
              descripcion: `Pago parcial sandbox · Pedido #${pedidoId}`,
              estado: this.estadoDeuda(total, nuevoPagado),
              referencia_transaccion: referencia,
            }),
          );
        }

        await this.auditar(manager, {
          accion: 'confirmar_pago_sandbox',
          entidad_id: pedidoId,
          valor_anterior: {
            tipo_pago: pedido.tipo_pago,
            estado: pedido.estado,
            monto_pagado: pagadoAnterior,
          },
          valor_nuevo: {
            tipo_pago: completo ? 'CONTADO' : pedido.tipo_pago,
            estado: estadoFinal,
            monto_pagado: nuevoPagado,
            metodo_pago: metodo,
            referencia_transaccion: referencia,
          },
          auditor,
        });
      }

      const deudaActual = await manager.findOne(Deuda, {
        where: { pedido_id: pedidoId },
      });
      await queryRunner.commitTransaction();

      const actualizado = await this.findOne(pedidoId);
      return {
        pedidoId,
        referencia_transaccion: referencia,
        tipo_pago: actualizado.tipo_pago,
        metodo_pago: actualizado.metodo_pago ?? dto.metodo_pago ?? 'SANDBOX',
        monto_pagado: Number(actualizado.monto_pagado ?? 0),
        total: Number(actualizado.total),
        saldo: Math.max(
          Number(actualizado.total) - Number(actualizado.monto_pagado ?? 0),
          0,
        ),
        estado: actualizado.estado,
        deuda_id: deudaActual?.id ?? null,
      };
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
        // Solo se devuelve lo que aún no había sido devuelto por borrados
        // parciales de ítems o reducciones de cantidad.
        await this.devolverStockPendiente(
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
      const pedido = await this.findPedidoBloqueado(manager, pedidoId);
      this.verificarEditable(pedido);

      const resueltos = await this.resolverItems(manager, items);

      await this.registrarSalida(
        manager,
        pedidoId,
        resueltos,
        'Items agregados al pedido',
        auditor?.usuario_id,
      );

      for (const item of resueltos) {
        const detalle = manager.create(DetallePedido, {
          pedido_id: pedidoId,
          producto_id: item.producto_id,
          cantidad: item.cantidad,
          tipo_presentacion: item.tipo_presentacion,
          factor_conversion: item.factor_conversion,
          unidades: item.unidades,
          precio_unitario: item.precio_unitario,
        });
        await manager.save(detalle);
      }

      const detalles = await this.findDetallesConManager(manager, pedidoId);
      const total = this.totalDesdeDetalles(detalles);
      await manager.update(Pedido, pedidoId, { total });
      await this.sincronizarDeuda(manager, pedido, total);

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
      const pedido = await this.findPedidoBloqueado(manager, pedidoId);
      this.verificarEditable(pedido);

      const detalle = await manager.findOne(DetallePedido, {
        where: { id: itemId, pedido_id: pedidoId },
      });
      if (!detalle)
        throw new NotFoundException('Detalle del pedido no encontrado');

      await this.devolverStockPendiente(
        manager,
        pedidoId,
        [detalle],
        'Eliminación de item del pedido',
        auditor?.usuario_id,
      );
      await manager.delete(DetallePedido, itemId);

      const detalles = await this.findDetallesConManager(manager, pedidoId);
      const total = this.totalDesdeDetalles(detalles);
      await manager.update(Pedido, pedidoId, { total });
      await this.sincronizarDeuda(manager, pedido, total);

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
      const pedido = await this.findPedidoBloqueado(manager, id);
      // Un pedido entregado ya se vendió: no devuelve stock.
      const devolverStock = pedido.estado !== 'entregado';
      const detalles = await this.findDetallesConManager(manager, id);

      if (devolverStock) {
        await this.devolverStockPendiente(
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
      const pedido = await this.findPedidoBloqueado(manager, pedidoId);
      this.verificarEditable(pedido);

      const detalle = await manager.findOne(DetallePedido, {
        where: { id: itemId, pedido_id: pedidoId },
      });
      if (!detalle)
        throw new NotFoundException('Detalle del pedido no encontrado');

      const presentacion =
        normalizarTipoPresentacion(detalle.tipo_presentacion) ?? 'UNIDAD';
      const minimo = CANTIDAD_MINIMA_POR_PRESENTACION[presentacion];
      if (!Number.isInteger(nuevaCantidad) || nuevaCantidad < minimo) {
        throw new BadRequestException(
          `El pedido mínimo es de ${minimo} ${presentacion === 'PAQUETE' ? 'paquete(s)' : 'unidad(es)'}`,
        );
      }

      const factor = detalle.factor_conversion ?? 1;
      const diff = nuevaCantidad - detalle.cantidad;
      const diffFisicas = Math.abs(diff) * factor;
      if (diff > 0) {
        await this.registrarSalida(
          manager,
          pedidoId,
          [{ producto_id: detalle.producto_id, cantidad: diffFisicas }],
          'Aumento de cantidad en item del pedido',
          auditor?.usuario_id,
        );
      } else if (diff < 0) {
        await this.registrarDevolucion(
          manager,
          pedidoId,
          [{ producto_id: detalle.producto_id, cantidad: diffFisicas }],
          'Reducción de cantidad en item del pedido',
          auditor?.usuario_id,
        );
      }

      await manager.update(DetallePedido, itemId, {
        cantidad: nuevaCantidad,
        factor_conversion: factor,
        unidades: nuevaCantidad * factor,
      });

      const detalles = await this.findDetallesConManager(manager, pedidoId);
      const total = this.totalDesdeDetalles(detalles);
      await manager.update(Pedido, pedidoId, { total });
      await this.sincronizarDeuda(manager, pedido, total);

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

  /** Cierre de día canónico para filtros inclusivos por fecha. */
  private finDelDia(hasta: Date | string): Date {
    const fin = new Date(hasta);
    fin.setHours(0, 0, 0, 0);
    fin.setDate(fin.getDate() + 1);
    return fin;
  }

  /**
   * Proyección aditiva de datos del cliente ya cargados en la relación.
   * Solo campos incluidos en la lista blanca: nunca se hace spread de la
   * entidad `Usuario`, porque eso omitiría el `@Exclude()` de `password_hash`.
   */
  private datosClientePedido(pedido: Pedido) {
    const cliente = pedido.usuario;
    return {
      cliente_carnet: cliente?.carnet?.trim() || null,
      cliente_telefono: cliente?.telefono?.trim() || null,
      cliente_email: cliente?.email?.trim() || null,
      cliente_ubicacion: cliente?.ubicacion?.trim() || null,
      direccion_entrega: pedido.direccion_entrega?.trim() || null,
      notas: pedido.notas?.trim() || null,
      tipo_pago: pedido.tipo_pago ?? 'CONTADO',
    };
  }

  async ventasPersonal(desde?: Date, hasta?: Date, usuarioId?: number) {
    const query = this.pedidosRepo
      .createQueryBuilder('pedido')
      .leftJoinAndSelect('pedido.procesador', 'procesador')
      .select('pedido.procesado_por', 'usuario_id')
      .addSelect('procesador.nombre', 'usuario_nombre')
      .addSelect('COUNT(pedido.id)', 'total_pedidos')
      .addSelect('COALESCE(SUM(pedido.total), 0)', 'total_vendido')
      .addSelect(
        'COALESCE(SUM(pedido.total), 0) / NULLIF(COUNT(pedido.id), 0)',
        'promedio_ticket',
      )
      .where('pedido.procesado_por IS NOT NULL')
      .andWhere("pedido.estado <> 'cancelado'");

    if (usuarioId) {
      query.andWhere('pedido.procesado_por = :uid', { uid: usuarioId });
    }

    if (desde) query.andWhere('pedido.creado_en >= :desde', { desde });
    if (hasta) {
      // Cierre de día unificado: < (fecha + 1 día), sin setHours(23,59,59,999).
      query.andWhere('pedido.creado_en < :hasta', {
        hasta: this.finDelDia(hasta),
      });
    }

    const filas = await query
      .groupBy('pedido.procesado_por')
      .addGroupBy('procesador.nombre')
      .orderBy('total_vendido', 'DESC')
      .getRawMany();

    const whereDetalle: FindOptionsWhere<Pedido> = {
      procesado_por: usuarioId ?? Not(IsNull()),
      estado: Not('cancelado'),
    };
    const fin = hasta ? this.finDelDia(hasta) : undefined;
    if (desde && fin) {
      whereDetalle.creado_en = And(MoreThanOrEqual(desde), LessThan(fin));
    } else if (desde) {
      whereDetalle.creado_en = MoreThanOrEqual(desde);
    } else if (fin) {
      whereDetalle.creado_en = LessThan(fin);
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
          ...this.datosClientePedido(p),
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
      promedio_ticket: Number(f.promedio_ticket),
      pedidos: pedidosPorUsuario.get(Number(f.usuario_id)) || [],
    }));
  }
}

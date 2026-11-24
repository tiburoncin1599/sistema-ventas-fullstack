import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { InventarioMovimiento } from './inventario-movimiento.entity';
import { Inventario } from '../inventario/inventario.entity';
import { InventarioService } from '../inventario/inventario.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class InventarioMovimientosService {
  constructor(
    @InjectRepository(InventarioMovimiento)
    private movimientosRepo: Repository<InventarioMovimiento>,
    private inventarioService: InventarioService,
    private readonly auditService: AuditService,
    @InjectDataSource() private dataSource: DataSource,
  ) {}

  async registrar(
    params: {
      producto_id: number;
      tipo: string;
      cantidad: number;
      cantidad_anterior?: number;
      cantidad_nueva?: number;
      costo_unitario?: number;
      motivo?: string;
      referencia_id?: number;
      referencia_tipo?: string;
      usuario_id?: number;
    },
    manager?: EntityManager,
  ) {
    const repo = manager
      ? manager.getRepository(InventarioMovimiento)
      : this.movimientosRepo;
    const movimiento = repo.create(params);
    return repo.save(movimiento);
  }

  /** Saldo bloqueado dentro de la transacción para conciliar el Kardex. */
  private async saldoBloqueado(manager: EntityManager, producto_id: number) {
    const item = await manager
      .getRepository(Inventario)
      .createQueryBuilder('inventario')
      .setLock('pessimistic_write')
      .where('inventario.producto_id = :productoId', { productoId: producto_id })
      .getOne();
    return item ? Number(item.cantidad) : null;
  }

  async listar(page = 1, limit = 50) {
    const [data, total] = await this.movimientosRepo.findAndCount({
      relations: ['producto', 'usuario'],
      order: { creado_en: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total };
  }

  async findByProducto(producto_id: number, page = 1, limit = 50) {
    const [data, total] = await this.movimientosRepo.findAndCount({
      where: { producto_id },
      relations: ['producto', 'usuario'],
      order: { creado_en: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total };
  }

  async registrarEntrada(params: {
    producto_id: number;
    cantidad: number;
    costo_unitario?: number;
    motivo?: string;
    usuario_id?: number;
  }) {
    if (!Number.isInteger(params.cantidad) || params.cantidad <= 0) {
      throw new BadRequestException('La cantidad de la entrada debe ser > 0');
    }
    return this.dataSource.transaction(async (manager) => {
      const cantAnterior = (await this.saldoBloqueado(manager, params.producto_id)) ?? 0;
      const cantNueva = await this.inventarioService.incrementar(
        params.producto_id,
        params.cantidad,
        manager,
      );

      await this.auditService.registrarEnTransaccion(
        {
          accion: 'entrada_inventario',
          entidad: 'inventario',
          entidad_id: params.producto_id,
          valor_anterior: { cantidad: cantAnterior },
          valor_nuevo: { cantidad: cantNueva },
          usuario_id: params.usuario_id,
          usuario_rol: 'inventario',
        },
        manager,
      );

      return this.registrar(
        {
          ...params,
          tipo: 'entrada',
          cantidad_anterior: cantAnterior,
          cantidad_nueva: cantNueva,
          referencia_tipo: 'manual',
        },
        manager,
      );
    });
  }

  async registrarSalida(params: {
    producto_id: number;
    cantidad: number;
    motivo?: string;
    usuario_id?: number;
  }) {
    if (!Number.isInteger(params.cantidad) || params.cantidad <= 0) {
      throw new BadRequestException('La cantidad de la salida debe ser > 0');
    }
    return this.dataSource.transaction(async (manager) => {
      const cantAnterior = await this.saldoBloqueado(manager, params.producto_id);
      if (cantAnterior === null) {
        throw new NotFoundException('Inventario no encontrado');
      }

      await this.inventarioService.descontar(
        params.producto_id,
        params.cantidad,
        manager,
      );
      const cantNueva = cantAnterior - params.cantidad;

      await this.auditService.registrarEnTransaccion(
        {
          accion: 'salida_inventario',
          entidad: 'inventario',
          entidad_id: params.producto_id,
          valor_anterior: { cantidad: cantAnterior },
          valor_nuevo: { cantidad: cantNueva },
          usuario_id: params.usuario_id,
          usuario_rol: 'inventario',
        },
        manager,
      );

      return this.registrar(
        {
          ...params,
          tipo: 'salida',
          cantidad_anterior: cantAnterior,
          cantidad_nueva: cantNueva,
          referencia_tipo: 'manual',
        },
        manager,
      );
    });
  }

  async registrarAjuste(params: {
    producto_id: number;
    cantidad: number;
    motivo?: string;
    usuario_id?: number;
  }) {
    // `InventarioService.actualizar` es transaccional y ya escribe el AJUSTE
    // con cantidad con signo, cantidad_anterior/cantidad_nueva y auditoría.
    return this.inventarioService.actualizar(params.producto_id, params.cantidad, {
      motivo: params.motivo,
      usuario_id: params.usuario_id,
      usuario_rol: 'inventario',
    });
  }

  /** Delta con signo del movimiento; compartido por el Kardex individual y el global. */
  private deltaMovimiento(movimiento: InventarioMovimiento) {
    const tipo = String(movimiento.tipo).toLowerCase();
    if (tipo === 'entrada' || tipo === 'devolucion') {
      return Number(movimiento.cantidad);
    }
    if (tipo === 'salida' || tipo === 'venta') {
      return -Number(movimiento.cantidad);
    }
    if (tipo === 'ajuste') {
      const anterior = movimiento.cantidad_anterior;
      const nueva = movimiento.cantidad_nueva;
      return anterior !== null && anterior !== undefined &&
        nueva !== null && nueva !== undefined
        ? Number(nueva) - Number(anterior)
        : Number(movimiento.cantidad);
    }
    return 0;
  }

  /** `cantidad_nueva` es la fuente de conciliación cuando el movimiento la guardó. */
  private saldoMovimiento(
    movimiento: InventarioMovimiento,
    saldoAnterior: number,
  ) {
    return movimiento.cantidad_nueva !== null &&
      movimiento.cantidad_nueva !== undefined
      ? Number(movimiento.cantidad_nueva)
      : saldoAnterior + this.deltaMovimiento(movimiento);
  }

  async kardex(producto_id: number) {
    const movimientos = await this.movimientosRepo.find({
      where: { producto_id },
      relations: ['usuario'],
      order: { creado_en: 'ASC', id: 'ASC' },
    });

    let saldo = 0;
    return movimientos.map((m) => {
      saldo = this.saldoMovimiento(m, saldo);
      return {
        ...m,
        saldo_actual: saldo,
      };
    });
  }

  /**
   * Kardex global: saldo acumulado por producto calculado en orden cronológico
   * y devuelto del movimiento más reciente al más antiguo para la tabla.
   */
  async kardexGeneral() {
    const movimientos = await this.movimientosRepo.find({
      relations: ['producto', 'usuario'],
      order: { creado_en: 'ASC', id: 'ASC' },
    });

    const saldos = new Map<number, number>();
    const filas = movimientos.map((m) => {
      const saldo = this.saldoMovimiento(m, saldos.get(m.producto_id) ?? 0);
      saldos.set(m.producto_id, saldo);

      return {
        id: m.id,
        producto_id: m.producto_id,
        producto: m.producto
          ? {
              id: m.producto.id,
              nombre: m.producto.nombre,
              codigo: m.producto.codigo ?? null,
            }
          : null,
        tipo: m.tipo,
        cantidad: Number(m.cantidad),
        delta: this.deltaMovimiento(m),
        cantidad_anterior: m.cantidad_anterior,
        cantidad_nueva: m.cantidad_nueva,
        motivo: m.motivo,
        referencia_id: m.referencia_id,
        referencia_tipo: m.referencia_tipo,
        usuario: m.usuario ? { id: m.usuario.id, nombre: m.usuario.nombre } : null,
        creado_en: m.creado_en,
        saldo_actual: saldo,
      };
    });

    return filas.reverse();
  }
}

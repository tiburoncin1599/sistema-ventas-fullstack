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

  async kardex(producto_id: number) {
    const movimientos = await this.movimientosRepo.find({
      where: { producto_id },
      relations: ['usuario'],
      order: { creado_en: 'ASC', id: 'ASC' },
    });

    let saldo = 0;
    return movimientos.map((m) => {
      const tipo = String(m.tipo).toLowerCase();
      const delta =
        tipo === 'entrada' || tipo === 'devolucion'
          ? Number(m.cantidad)
          : tipo === 'salida' || tipo === 'venta'
            ? -Number(m.cantidad)
            : tipo === 'ajuste'
              ? m.cantidad_anterior !== null && m.cantidad_nueva !== null
                ? Number(m.cantidad_nueva) - Number(m.cantidad_anterior)
                : Number(m.cantidad)
              : 0;

      // Cuando el movimiento guardó el saldo resultante, esa es la fuente de
      // conciliación; si no, se reconstruye desde el delta.
      saldo =
        m.cantidad_nueva !== null && m.cantidad_nueva !== undefined
          ? Number(m.cantidad_nueva)
          : saldo + delta;

      return {
        ...m,
        saldo_actual: saldo,
      };
    });
  }
}

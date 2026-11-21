import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Inventario } from './inventario.entity';
import { InventarioMovimiento } from '../inventario-movimientos/inventario-movimiento.entity';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class InventarioService {
  constructor(
    @InjectRepository(Inventario)
    private inventarioRepo: Repository<Inventario>,
    @InjectRepository(InventarioMovimiento)
    private movimientosRepo: Repository<InventarioMovimiento>,
    @InjectDataSource() private dataSource: DataSource,
    private readonly auditService: AuditService,
  ) {}

  private repo(manager?: EntityManager) {
    return manager ? manager.getRepository(Inventario) : this.inventarioRepo;
  }

  /**
   * Orden alfabético determinista e insensible a mayúsculas/minúsculas.
   * TypeORM no acepta expresiones como `LOWER(producto.nombre)` en `orderBy`
   * con `getMany()`, por eso el ORDER BY se hace sobre la relación en `find()`
   * y se normaliza en memoria con el mismo criterio del frontend.
   */
  private ordenarPorNombre<T extends { producto?: { id: number; nombre: string } | null }>(
    lista: T[],
  ): T[] {
    return [...lista].sort(
      (a, b) =>
        (a.producto?.nombre ?? '').localeCompare(
          b.producto?.nombre ?? '',
          'es',
          { sensitivity: 'base' },
        ) ||
        (a.producto?.id ?? 0) - (b.producto?.id ?? 0),
    );
  }

  async findAll(page = 1, limit = 50) {
    const items = await this.inventarioRepo.find({
      relations: ['producto', 'producto.categoria'],
      order: { producto: { nombre: 'ASC', id: 'ASC' } },
      skip: (page - 1) * limit,
      take: limit,
    });
    return this.ordenarPorNombre(items);
  }

  async findOne(productoId: number) {
    const item = await this.inventarioRepo.findOne({
      where: { producto_id: productoId },
      relations: ['producto'],
    });
    if (!item)
      throw new NotFoundException(
        'Inventario no encontrado para este producto',
      );
    return item;
  }

  /** Alertas según el umbral configurado por producto, no un literal 10. */
  async alertas() {
    const items = await this.inventarioRepo
      .createQueryBuilder('inventario')
      .leftJoinAndSelect('inventario.producto', 'producto')
      .where('inventario.cantidad <= inventario.cantidad_minima')
      .orderBy('producto.nombre', 'ASC')
      .addOrderBy('producto.id', 'ASC')
      .getMany();
    return this.ordenarPorNombre(items);
  }

  /**
   * Todo cambio directo de cantidad es un AJUSTE: bloquea la fila, escribe el
   * Kardex y la auditoría con el mismo EntityManager. Si falla cualquier paso,
   * la transacción completa se revierte.
   */
  async actualizar(
    productoId: number,
    cantidad: number,
    opciones?: {
      manager?: EntityManager;
      motivo?: string;
      usuario_id?: number;
      usuario_rol?: string;
    },
  ): Promise<InventarioMovimiento> {
    if (opciones?.manager) {
      return this.aplicarAjuste(opciones.manager, productoId, cantidad, opciones);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const movimiento = await this.aplicarAjuste(
        queryRunner.manager,
        productoId,
        cantidad,
        opciones ?? {},
      );
      await queryRunner.commitTransaction();
      return movimiento;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  private async aplicarAjuste(
    manager: EntityManager,
    productoId: number,
    cantidad: number,
    opciones: {
      motivo?: string;
      usuario_id?: number;
      usuario_rol?: string;
    },
  ): Promise<InventarioMovimiento> {
    if (!Number.isInteger(cantidad) || cantidad < 0) {
      throw new BadRequestException('La cantidad debe ser un entero >= 0');
    }

    const repo = manager.getRepository(Inventario);
    let item = await repo
      .createQueryBuilder('inventario')
      .setLock('pessimistic_write')
      .where('inventario.producto_id = :productoId', { productoId })
      .getOne();

    if (!item) {
      item = await repo.save(
        repo.create({ producto_id: productoId, cantidad: 0 }),
      );
    }

    const cantidadAnterior = Number(item.cantidad);
    await repo.update(item.id, { cantidad });

    const movimiento = await manager.getRepository(InventarioMovimiento).save(
      manager.create(InventarioMovimiento, {
        producto_id: productoId,
        tipo: 'AJUSTE',
        // Diferencia con signo: el Kardex también guarda anterior/nueva.
        cantidad: cantidad - cantidadAnterior,
        cantidad_anterior: cantidadAnterior,
        cantidad_nueva: cantidad,
        motivo: opciones.motivo ?? 'Ajuste manual de inventario',
        referencia_tipo: 'manual',
        usuario_id: opciones.usuario_id ?? null,
      }),
    );

    await this.auditService.registrarEnTransaccion(
      {
        accion: 'ajuste_inventario',
        entidad: 'inventario',
        entidad_id: productoId,
        valor_anterior: { cantidad: cantidadAnterior },
        valor_nuevo: { cantidad },
        usuario_id: opciones.usuario_id,
        usuario_rol: opciones.usuario_rol ?? 'inventario',
      },
      manager,
    );

    return movimiento;
  }

  async descontar(productoId: number, cantidad: number, manager?: EntityManager) {
    const repo = this.repo(manager);
    const result = await repo
      .createQueryBuilder()
      .update(Inventario)
      .set({ cantidad: () => `cantidad - :cantidad` })
      .where('producto_id = :productoId AND cantidad >= :cantidad', {
        productoId,
        cantidad,
      })
      .setParameters({ cantidad })
      .execute();
    if (result.affected === 0) {
      const exists = await repo.findOne({
        where: { producto_id: productoId },
      });
      if (!exists) {
        throw new NotFoundException('Inventario no encontrado');
      }
      throw new BadRequestException(
        `Stock insuficiente. Stock disponible: ${Number(exists.cantidad)} unidades.`,
      );
    }
    return repo.findOne({ where: { producto_id: productoId } });
  }

  /**
   * Descuento transaccional con bloqueo pesimista (SELECT ... FOR UPDATE).
   * Debe llamarse con el EntityManager de un QueryRunner dentro de una
   * transacción: el lock evita que dos ventas concurrentes validen el mismo
   * stock y ambas terminen descontando por encima del disponible.
   */
  async descontarConBloqueo(
    productoId: number,
    cantidad: number,
    manager: EntityManager,
  ): Promise<{ cantidadAnterior: number; cantidadNueva: number }> {
    const repo = manager.getRepository(Inventario);
    const item = await repo
      .createQueryBuilder('inventario')
      .setLock('pessimistic_write')
      .where('inventario.producto_id = :productoId', { productoId })
      .getOne();

    if (!item) {
      throw new NotFoundException('Inventario no encontrado');
    }

    const cantidadAnterior = Number(item.cantidad);
    if (cantidadAnterior < cantidad) {
      throw new BadRequestException(
        `Stock insuficiente. Stock disponible: ${cantidadAnterior} unidades.`,
      );
    }

    const cantidadNueva = cantidadAnterior - cantidad;
    await repo
      .createQueryBuilder()
      .update(Inventario)
      .set({ cantidad: () => 'cantidad - :cantidad' })
      .where('producto_id = :productoId', { productoId })
      .setParameters({ productoId, cantidad })
      .execute();

    return { cantidadAnterior, cantidadNueva };
  }

  async devolver(
    productoId: number,
    cantidad: number,
    manager?: EntityManager,
  ): Promise<{ cantidadAnterior: number; cantidadNueva: number }> {
    const repo = this.repo(manager);
    const qb = repo
      .createQueryBuilder('inventario')
      .where('inventario.producto_id = :productoId', { productoId });
    if (manager) qb.setLock('pessimistic_write');
    const item = await qb.getOne();
    if (!item) {
      throw new NotFoundException(
        'Inventario no encontrado para devolver stock',
      );
    }

    const cantidadAnterior = Number(item.cantidad);
    const cantidadNueva = cantidadAnterior + cantidad;
    await repo
      .createQueryBuilder()
      .update(Inventario)
      .set({ cantidad: () => `cantidad + :cantidad` })
      .where('producto_id = :productoId', { productoId })
      .setParameters({ productoId, cantidad })
      .execute();

    return { cantidadAnterior, cantidadNueva };
  }

  async incrementar(
    productoId: number,
    cantidad: number,
    manager?: EntityManager,
  ): Promise<number> {
    const repo = this.repo(manager);
    const result = await repo
      .createQueryBuilder()
      .update(Inventario)
      .set({ cantidad: () => `cantidad + :cantidad` })
      .where('producto_id = :productoId', { productoId })
      .setParameters({ productoId, cantidad })
      .returning('cantidad')
      .execute();
    if (result.raw?.length) return Number(result.raw[0].cantidad);
    const creado = await repo.save(
      repo.create({ producto_id: productoId, cantidad }),
    );
    return Number(creado.cantidad);
  }
}
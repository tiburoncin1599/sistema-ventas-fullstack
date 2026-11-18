import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, LessThanOrEqual, Repository } from 'typeorm';
import { Inventario } from './inventario.entity';

@Injectable()
export class InventarioService {
  constructor(
    @InjectRepository(Inventario)
    private inventarioRepo: Repository<Inventario>,
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

  async alertas() {
    const items = await this.inventarioRepo.find({
      where: { cantidad: LessThanOrEqual(10) },
      relations: ['producto'],
      order: { producto: { nombre: 'ASC', id: 'ASC' } },
    });
    return this.ordenarPorNombre(items);
  }

  async actualizar(productoId: number, cantidad: number) {
    const item = await this.inventarioRepo.findOne({
      where: { producto_id: productoId },
    });
    if (item) {
      return this.inventarioRepo.update(item.id, { cantidad });
    }
    return this.inventarioRepo.save(this.inventarioRepo.create({ producto_id: productoId, cantidad }));
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

  async devolver(productoId: number, cantidad: number, manager?: EntityManager) {
    const repo = this.repo(manager);
    const result = await repo
      .createQueryBuilder()
      .update(Inventario)
      .set({ cantidad: () => `cantidad + :cantidad` })
      .where('producto_id = :productoId', { productoId })
      .setParameters({ cantidad })
      .execute();
    if (result.affected === 0) {
      throw new NotFoundException(
        'Inventario no encontrado para devolver stock',
      );
    }
    return repo.findOne({ where: { producto_id: productoId } });
  }

  async incrementar(productoId: number, cantidad: number, manager?: EntityManager): Promise<number> {
    const repo = this.repo(manager);
    const result = await repo
      .createQueryBuilder()
      .update(Inventario)
      .set({ cantidad: () => `cantidad + :cantidad` })
      .where('producto_id = :productoId', { productoId })
      .setParameters({ cantidad })
      .returning('cantidad')
      .execute();
    if (result.raw?.length) return Number(result.raw[0].cantidad);
    await repo.save(repo.create({ producto_id: productoId, cantidad }));
    return cantidad;
  }
}
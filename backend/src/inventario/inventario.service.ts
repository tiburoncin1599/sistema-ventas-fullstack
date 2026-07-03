import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Inventario } from './inventario.entity';

@Injectable()
export class InventarioService {
  constructor(
    @InjectRepository(Inventario)
    private inventarioRepo: Repository<Inventario>,
  ) {}

  findAll(page = 1, limit = 50) {
    return this.inventarioRepo.find({
      relations: ['producto', 'producto.categoria'],
      skip: (page - 1) * limit,
      take: limit,
    });
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
    const items = await this.inventarioRepo.find({ relations: ['producto'] });
    return items.filter((i) => i.cantidad <= i.cantidad_minima);
  }

  async actualizar(productoId: number, cantidad: number) {
    const item = await this.inventarioRepo.findOne({
      where: { producto_id: productoId },
    });
    if (item) {
      return this.inventarioRepo.update(item.id, { cantidad });
    }
    const nuevo = this.inventarioRepo.create({
      producto_id: productoId,
      cantidad,
    });
    return this.inventarioRepo.save(nuevo);
  }

  async descontar(productoId: number, cantidad: number) {
    const result = await this.inventarioRepo
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
      const exists = await this.inventarioRepo.findOne({
        where: { producto_id: productoId },
      });
      if (!exists) {
        throw new NotFoundException('Inventario no encontrado');
      }
      throw new BadRequestException('Stock insuficiente');
    }
    return this.inventarioRepo.findOne({ where: { producto_id: productoId } });
  }

  async devolver(productoId: number, cantidad: number) {
    const result = await this.inventarioRepo
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
    return this.inventarioRepo.findOne({ where: { producto_id: productoId } });
  }
}

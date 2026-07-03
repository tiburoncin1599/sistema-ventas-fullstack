import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Producto } from './producto.entity';

@Injectable()
export class ProductosService {
  constructor(
    @InjectRepository(Producto)
    private productosRepo: Repository<Producto>,
  ) {}

  findAll(page = 1, limit = 50) {
    return this.productosRepo.find({
      where: { activo: true },
      relations: ['categoria'],
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  findAllInclusoInactivos() {
    return this.productosRepo.find({
      relations: ['categoria'],
    });
  }

  async findOne(id: number) {
    const producto = await this.productosRepo.findOne({
      where: { id },
      relations: ['categoria'],
    });
    if (!producto) throw new NotFoundException('Producto no encontrado');
    return producto;
  }

  crear(data: Partial<Producto>) {
    const producto = this.productosRepo.create(data);
    return this.productosRepo.save(producto);
  }

  async actualizar(id: number, data: Partial<Producto>) {
    await this.findOne(id);
    return this.productosRepo.update(id, data);
  }

  async desactivar(id: number) {
    await this.findOne(id);
    return this.productosRepo.update(id, { activo: false });
  }
}

import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Proveedor } from './proveedor.entity';

@Injectable()
export class ProveedoresService {
  constructor(
    @InjectRepository(Proveedor)
    private proveedoresRepo: Repository<Proveedor>,
  ) {}

  findAll(page = 1, limit = 50) {
    return this.proveedoresRepo.find({
      where: { activo: true },
      order: { nombre: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  findAllInactivos(page = 1, limit = 50) {
    return this.proveedoresRepo.find({
      where: { activo: false },
      order: { nombre: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  async findOne(id: number) {
    const proveedor = await this.proveedoresRepo.findOne({ where: { id } });
    if (!proveedor) throw new NotFoundException('Proveedor no encontrado');
    return proveedor;
  }

  crear(data: Partial<Proveedor>) {
    const proveedor = this.proveedoresRepo.create(data);
    return this.proveedoresRepo.save(proveedor);
  }

  async actualizar(id: number, data: Partial<Proveedor>) {
    await this.findOne(id);
    await this.proveedoresRepo.update(id, data);
    return this.findOne(id);
  }

  async eliminar(id: number) {
    await this.findOne(id);
    await this.proveedoresRepo.update(id, { activo: false });
    return { message: 'Proveedor desactivado correctamente' };
  }
}

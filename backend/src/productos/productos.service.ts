import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import { Producto } from './producto.entity';
import { Inventario } from '../inventario/inventario.entity';

export type ProductoConStock = Producto & { stock: number; disponible: boolean };

@Injectable()
export class ProductosService {
  constructor(
    @InjectRepository(Producto)
    private productosRepo: Repository<Producto>,
    @InjectRepository(Inventario)
    private inventarioRepo: Repository<Inventario>,
  ) {}

  /** Añade al producto únicamente el stock necesario para el catálogo. */
  private async conStock(lista: Producto[]): Promise<ProductoConStock[]> {
    if (lista.length === 0) return [];
    const ids = lista.map((p) => p.id);
    const invs = await this.inventarioRepo.find({
      where: { producto_id: In(ids) },
    });
    const mapa = new Map(invs.map((i) => [Number(i.producto_id), Number(i.cantidad)]));
    return lista.map((p) => {
      const stock = mapa.get(Number(p.id)) ?? 0;
      return { ...p, stock, disponible: stock > 0 };
    });
  }

  async findAll(page = 1, limit = 50) {
    const lista = await this.productosRepo.find({
      where: { activo: true },
      relations: ['categoria'],
      order: { id: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return this.conStock(lista);
  }

  async findAllInclusoInactivos() {
    const lista = await this.productosRepo.find({
      relations: ['categoria'],
    });
    return this.conStock(lista);
  }

  async findOne(id: number) {
    const producto = await this.productosRepo.findOne({
      where: { id },
      relations: ['categoria'],
    });
    if (!producto) throw new NotFoundException('Producto no encontrado');
    const [conStock] = await this.conStock([producto]);
    return conStock;
  }

  /** Evita dos productos con el mismo código: el POS busca por código. */
  private async codigoDisponible(codigo: string, idExcluido?: number) {
    const repetido = await this.productosRepo.findOne({
      where: { codigo, ...(idExcluido ? { id: Not(idExcluido) } : {}) },
    });
    if (repetido) {
      throw new ConflictException(`El código ${codigo} ya está asignado a otro producto`);
    }
  }

  async crear(data: Partial<Producto>) {
    if (data.codigo) await this.codigoDisponible(data.codigo);
    const producto = this.productosRepo.create(data);
    return this.productosRepo.save(producto);
  }

  async actualizar(id: number, data: Partial<Producto>) {
    await this.findOne(id);
    if (data.codigo) await this.codigoDisponible(data.codigo, id);
    return this.productosRepo.update(id, data);
  }

  async desactivar(id: number) {
    await this.findOne(id);
    return this.productosRepo.update(id, { activo: false });
  }
}

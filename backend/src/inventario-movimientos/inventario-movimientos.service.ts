import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { InventarioMovimiento } from './inventario-movimiento.entity';
import { InventarioService } from '../inventario/inventario.service';

@Injectable()
export class InventarioMovimientosService {
  constructor(
    @InjectRepository(InventarioMovimiento)
    private movimientosRepo: Repository<InventarioMovimiento>,
    private inventarioService: InventarioService,
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
    const repo = manager ? manager.getRepository(InventarioMovimiento) : this.movimientosRepo;
    const movimiento = repo.create(params);
    return repo.save(movimiento);
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
    const inventario = await this.inventarioService.findOne(params.producto_id).catch(() => null);
    const cantAnterior = inventario?.cantidad ?? 0;

    // Incremento atómico: evita que dos entradas concurrentes se pisen
    const cantNueva = await this.inventarioService.incrementar(params.producto_id, params.cantidad);

    return this.registrar({
      ...params,
      tipo: 'entrada',
      cantidad_anterior: cantAnterior,
      cantidad_nueva: cantNueva,
      referencia_tipo: 'manual',
    });
  }

  async registrarSalida(params: {
    producto_id: number;
    cantidad: number;
    motivo?: string;
    usuario_id?: number;
  }) {
    const inventario = await this.inventarioService.findOne(params.producto_id);
    const cantAnterior = inventario.cantidad;

    await this.inventarioService.descontar(params.producto_id, params.cantidad);

    return this.registrar({
      ...params,
      tipo: 'salida',
      cantidad_anterior: cantAnterior,
      cantidad_nueva: cantAnterior - params.cantidad,
      referencia_tipo: 'manual',
    });
  }

  async registrarAjuste(params: {
    producto_id: number;
    cantidad: number;
    motivo?: string;
    usuario_id?: number;
  }) {
    const inventario = await this.inventarioService.findOne(params.producto_id);
    const cantAnterior = inventario.cantidad;

    await this.inventarioService.actualizar(params.producto_id, params.cantidad);

    return this.registrar({
      ...params,
      tipo: 'ajuste',
      cantidad_anterior: cantAnterior,
      cantidad_nueva: params.cantidad,
      referencia_tipo: 'manual',
    });
  }

  async kardex(producto_id: number) {
    const movimientos = await this.movimientosRepo.find({
      where: { producto_id },
      relations: ['usuario'],
      order: { creado_en: 'ASC' },
    });

    let saldo = 0;
    return movimientos.map((m) => {
      saldo += m.tipo === 'entrada' || m.tipo === 'devolucion'
        ? m.cantidad
        : -m.cantidad;
      return {
        ...m,
        saldo_actual: saldo,
      };
    });
  }
}

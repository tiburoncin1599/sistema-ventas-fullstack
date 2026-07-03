import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Deuda } from './deuda.entity';

@Injectable()
export class DeudasService {
  constructor(
    @InjectRepository(Deuda)
    private deudasRepo: Repository<Deuda>,
  ) {}

  findAll(page = 1, limit = 50) {
    return this.deudasRepo.find({
      relations: ['usuario'],
      order: { fecha_creacion: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  findAllByDateRange(desde?: Date, hasta?: Date) {
    const where: any = {};
    if (desde || hasta) {
      where.fecha_creacion = {};
      if (desde) where.fecha_creacion['>='] = desde;
      if (hasta) {
        const hastaFin = new Date(hasta);
        hastaFin.setHours(23, 59, 59, 999);
        where.fecha_creacion['<='] = hastaFin;
      }
    }
    return this.deudasRepo.find({
      where,
      relations: ['usuario'],
      order: { fecha_creacion: 'DESC' },
    });
  }

  findByUsuario(usuarioId: number) {
    return this.deudasRepo.find({
      where: { usuario_id: usuarioId },
      relations: ['usuario'],
      order: { fecha_creacion: 'DESC' },
    });
  }

  async findOne(id: number) {
    const deuda = await this.deudasRepo.findOne({
      where: { id },
      relations: ['usuario'],
    });
    if (!deuda) throw new NotFoundException('Deuda no encontrada');
    return deuda;
  }

  async crear(usuarioId: number, monto: number, descripcion?: string) {
    const deuda = this.deudasRepo.create({
      usuario_id: usuarioId,
      monto,
      descripcion: descripcion || '',
      estado: 'pendiente',
      monto_pagado: 0,
    });
    return this.deudasRepo.save(deuda);
  }

  async pagar(id: number, montoPago: number) {
    const deuda = await this.findOne(id);

    if (deuda.estado === 'pagado') {
      throw new BadRequestException('Esta deuda ya está pagada');
    }

    const nuevoPagado = deuda.monto_pagado + montoPago;

    if (nuevoPagado > deuda.monto) {
      throw new BadRequestException(
        'El monto a pagar excede el saldo pendiente',
      );
    }

    const estaPagada = nuevoPagado >= deuda.monto;

    await this.deudasRepo.update(id, {
      monto_pagado: nuevoPagado,
      estado: estaPagada ? 'pagado' : 'parcial',
      fecha_pago: estaPagada ? new Date() : undefined,
    });

    return this.findOne(id);
  }

  async eliminar(id: number) {
    const deuda = await this.findOne(id);
    await this.deudasRepo.delete(id);
    return { message: 'Deuda eliminada correctamente' };
  }

  async resumen() {
    const deudas = await this.findAll();
    const totalPendiente = deudas
      .filter((d) => d.estado !== 'pagado')
      .reduce((sum, d) => sum + (d.monto - d.monto_pagado), 0);
    const totalPagado = deudas
      .filter((d) => d.estado === 'pagado')
      .reduce((sum, d) => sum + d.monto_pagado, 0);
    return {
      total_deudas: deudas.length,
      total_pendiente: totalPendiente,
      total_pagado: totalPagado,
      deudas_pendientes: deudas.filter((d) => d.estado !== 'pagado').length,
      deudas_pagadas: deudas.filter((d) => d.estado === 'pagado').length,
    };
  }
}

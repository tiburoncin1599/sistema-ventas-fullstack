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
    if (!(montoPago > 0)) {
      throw new BadRequestException('El monto a pagar debe ser mayor a 0');
    }

    const deuda = await this.findOne(id);
    if (deuda.estado === 'pagado') {
      throw new BadRequestException('Esta deuda ya está pagada');
    }

    // Incremento atómico: evita que dos pagos simultáneos se pisen
    const result = await this.deudasRepo
      .createQueryBuilder()
      .update(Deuda)
      .set({
        monto_pagado: () => `monto_pagado + :monto`,
        estado: () =>
          `CASE WHEN monto_pagado + :monto >= monto THEN 'pagado' ELSE 'parcial' END`,
        fecha_pago: () =>
          `CASE WHEN monto_pagado + :monto >= monto THEN NOW() ELSE fecha_pago END`,
      })
      .where('id = :id AND estado != :pagada AND monto_pagado + :monto <= monto', {
        id,
        pagada: 'pagado',
      })
      .setParameters({ monto: montoPago })
      .execute();

    if (result.affected === 0) {
      const actual = await this.findOne(id);
      if (actual.estado === 'pagado') {
        throw new BadRequestException('Esta deuda ya está pagada');
      }
      throw new BadRequestException(
        'El monto a pagar excede el saldo pendiente',
      );
    }

    return this.findOne(id);
  }

  async eliminar(id: number) {
    const deuda = await this.findOne(id);
    await this.deudasRepo.delete(id);
    return { message: 'Deuda eliminada correctamente' };
  }

  async resumen() {
    // Agregado en BD: no depende del límite de paginación de findAll()
    const rows: Record<string, unknown>[] = await this.deudasRepo.query(`
      SELECT
        COUNT(*)::int AS total_deudas,
        COALESCE(SUM(CASE WHEN estado != 'pagado' THEN monto - monto_pagado ELSE 0 END), 0) AS total_pendiente,
        COALESCE(SUM(CASE WHEN estado = 'pagado' THEN monto_pagado ELSE 0 END), 0) AS total_pagado,
        COUNT(*) FILTER (WHERE estado != 'pagado')::int AS deudas_pendientes,
        COUNT(*) FILTER (WHERE estado = 'pagado')::int AS deudas_pagadas
      FROM deudas
    `);
    const r = rows[0];
    return {
      total_deudas: Number(r.total_deudas),
      total_pendiente: Number(r.total_pendiente),
      total_pagado: Number(r.total_pagado),
      deudas_pendientes: Number(r.deudas_pendientes),
      deudas_pagadas: Number(r.deudas_pagadas),
    };
  }
}

import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  And,
  FindOptionsWhere,
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import { Deuda } from './deuda.entity';

/** Extremo inclusive del día para filtros `hasta` enviados como fecha. */
const finDelDia = (fecha: Date): Date => {
  const fin = new Date(fecha);
  fin.setHours(23, 59, 59, 999);
  return fin;
};

@Injectable()
export class DeudasService {
  constructor(
    @InjectRepository(Deuda)
    private deudasRepo: Repository<Deuda>,
  ) {}

  /** Un único constructor de filtros para listado, resumen y exportaciones. */
  private whereDe(
    vendedorId?: number,
    desde?: Date,
    hasta?: Date,
  ): FindOptionsWhere<Deuda> {
    const where: FindOptionsWhere<Deuda> = {};
    if (vendedorId) where.vendedor_id = vendedorId;
    if (desde && hasta) {
      where.fecha_creacion = And(
        MoreThanOrEqual(desde),
        LessThanOrEqual(finDelDia(hasta)),
      );
    } else if (desde) {
      where.fecha_creacion = MoreThanOrEqual(desde);
    } else if (hasta) {
      where.fecha_creacion = LessThanOrEqual(finDelDia(hasta));
    }
    return where;
  }

  findAll(
    page = 1,
    limit = 50,
    vendedorId?: number,
    desde?: Date,
    hasta?: Date,
  ) {
    return this.deudasRepo.find({
      where: this.whereDe(vendedorId, desde, hasta),
      relations: ['usuario', 'vendedor'],
      order: { fecha_creacion: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  findAllByDateRange(desde?: Date, hasta?: Date, vendedorId?: number) {
    return this.deudasRepo.find({
      where: this.whereDe(vendedorId, desde, hasta),
      relations: ['usuario', 'vendedor'],
      order: { fecha_creacion: 'DESC' },
    });
  }

  findByUsuario(usuarioId: number, vendedorId?: number) {
    return this.deudasRepo.find({
      where: vendedorId
        ? { usuario_id: usuarioId, vendedor_id: vendedorId }
        : { usuario_id: usuarioId },
      relations: ['usuario'],
      order: { fecha_creacion: 'DESC' },
    });
  }

  async findOne(id: number) {
    const deuda = await this.deudasRepo.findOne({
      where: { id },
      relations: ['usuario', 'vendedor'],
    });
    if (!deuda) throw new NotFoundException('Deuda no encontrada');
    return deuda;
  }

  async crear(
    usuarioId: number,
    monto: number,
    descripcion?: string,
    vendedorId?: number,
  ) {
    if (!(monto > 0)) {
      throw new BadRequestException('El monto de la deuda debe ser mayor a 0');
    }
    const deuda = this.deudasRepo.create({
      usuario_id: usuarioId,
      vendedor_id: vendedorId,
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
    // Las deudas originadas por un pedido se eliminan dentro de la
    // transacción del pedido. Borrarlas sueltas deja el crédito sin respaldo.
    if (deuda.pedido_id != null) {
      throw new BadRequestException(
        'No se puede eliminar una deuda vinculada a un pedido',
      );
    }
    await this.deudasRepo.delete(id);
    return { message: 'Deuda eliminada correctamente' };
  }

  async resumen(vendedorId?: number, desde?: Date, hasta?: Date) {
    const condiciones: string[] = [];
    const params: unknown[] = [];
    if (vendedorId) {
      params.push(vendedorId);
      condiciones.push(`vendedor_id = $${params.length}`);
    }
    if (desde) {
      params.push(desde);
      condiciones.push(`fecha_creacion >= $${params.length}`);
    }
    if (hasta) {
      params.push(finDelDia(hasta));
      condiciones.push(`fecha_creacion <= $${params.length}`);
    }
    const filtro = condiciones.length
      ? ` WHERE ${condiciones.join(' AND ')}`
      : '';

    // Agregado en BD: no depende del límite de paginación de findAll()
    const rows: Record<string, unknown>[] = await this.deudasRepo.query(
      `
      SELECT
        COUNT(*)::int AS total_deudas,
        COALESCE(SUM(CASE WHEN estado != 'pagado' THEN GREATEST(monto - monto_pagado, 0) ELSE 0 END), 0) AS total_pendiente,
        COALESCE(SUM(CASE WHEN estado = 'pagado' THEN monto_pagado ELSE 0 END), 0) AS total_pagado,
        COUNT(*) FILTER (WHERE estado != 'pagado')::int AS deudas_pendientes,
        COUNT(*) FILTER (WHERE estado = 'pagado')::int AS deudas_pagadas
      FROM deudas${filtro}
    `,
      params,
    );
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

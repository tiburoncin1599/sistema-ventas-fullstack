import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Audit } from './audit.entity';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(Audit)
    private auditRepo: Repository<Audit>,
  ) {}

  async registrar(params: {
    accion: string;
    entidad: string;
    entidad_id?: number;
    valor_anterior?: Record<string, unknown>;
    valor_nuevo?: Record<string, unknown>;
    usuario_id?: number;
    usuario_nombre?: string;
    usuario_rol?: string;
    ip?: string;
  }) {
    const entry = this.auditRepo.create(params);
    return this.auditRepo.save(entry);
  }

  /**
   * Registra la auditoría usando el EntityManager de la transacción activa.
   * Así el rastro del usuario ejecutor se hace rollback junto con la venta
   * si cualquiera de los pasos (stock, kardex, deuda) falla.
   */
  async registrarEnTransaccion(
    params: Parameters<AuditService['registrar']>[0],
    manager: EntityManager,
  ) {
    const repo = manager.getRepository(Audit);
    const entry = repo.create(params);
    return repo.save(entry);
  }

  async findAll(page = 1, limit = 50) {
    const [data, total] = await this.auditRepo.findAndCount({
      order: { creado_en: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total };
  }

  async findByEntity(entidad: string, entidad_id: number) {
    return this.auditRepo.find({
      where: { entidad, entidad_id },
      order: { creado_en: 'DESC' },
    });
  }
}

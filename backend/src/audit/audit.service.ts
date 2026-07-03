import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

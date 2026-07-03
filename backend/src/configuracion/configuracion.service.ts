import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Configuracion } from './configuracion.entity';

@Injectable()
export class ConfiguracionService {
  constructor(
    @InjectRepository(Configuracion)
    private configRepo: Repository<Configuracion>,
  ) {}

  async obtener(): Promise<Configuracion> {
    let config = await this.configRepo.findOne({ where: { id: 1 } });
    if (!config) {
      config = this.configRepo.create({ id: 1 });
      config = await this.configRepo.save(config);
    }
    return config;
  }

  async actualizar(data: Partial<Configuracion>): Promise<Configuracion> {
    let config = await this.configRepo.findOne({ where: { id: 1 } });
    if (!config) {
      config = this.configRepo.create({ id: 1, ...data });
    } else {
      Object.assign(config, data);
    }
    return this.configRepo.save(config);
  }
}

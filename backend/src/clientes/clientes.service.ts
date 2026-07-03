import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Usuario } from '../usuarios/usuario.entity';
import * as bcrypt from 'bcryptjs';
import { omitPassword } from '../common/utils';

@Injectable()
export class ClientesService {
  constructor(
    @InjectRepository(Usuario)
    private usuariosRepo: Repository<Usuario>,
  ) {}

  async findAll() {
    const clientes = await this.usuariosRepo.find({
      where: { rol: 'cliente', activo: true },
    });
    return clientes.map(omitPassword);
  }

  async findOne(id: number) {
    const cliente = await this.usuariosRepo.findOne({
      where: { id, rol: 'cliente' },
    });
    if (!cliente) throw new NotFoundException('Cliente no encontrado');
    return omitPassword(cliente);
  }

  async crear(data: {
    nombre: string;
    email?: string;
    telefono?: string;
    carnet?: string;
    ubicacion?: string;
  }) {
    const email = data.email || `cliente_${Date.now()}@tienda.com`;
    const existe = await this.usuariosRepo.findOne({ where: { email } });
    if (existe) throw new BadRequestException('El email ya está registrado');

    const { randomBytes } = await import('crypto');
    const passDefault = randomBytes(6).toString('hex');
    const hash = await bcrypt.hash(passDefault, 10);
    const usuario = this.usuariosRepo.create({
      nombre: data.nombre,
      email,
      telefono: data.telefono || '',
      carnet: data.carnet || '',
      ubicacion: data.ubicacion || '',
      password_hash: hash,
      rol: 'cliente',
    });
    const saved = await this.usuariosRepo.save(usuario);
    return omitPassword(saved);
  }

  async actualizar(id: number, data: Partial<Usuario>) {
    await this.findOne(id);
    await this.usuariosRepo.update(id, data);
    return this.findOne(id);
  }

  async desactivar(id: number) {
    await this.findOne(id);
    await this.usuariosRepo.update(id, { activo: false });
    return { message: 'Cliente desactivado correctamente' };
  }
}

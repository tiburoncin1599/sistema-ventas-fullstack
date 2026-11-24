import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
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
    email: string;
    telefono: string;
    carnet?: string;
    ubicacion: string;
  }) {
    const email = data.email.trim().toLowerCase();
    const existe = await this.usuariosRepo.findOne({
      where: { email: ILike(email) },
    });
    if (existe) {
      throw new BadRequestException('El correo electrónico ya está registrado');
    }

    const { randomBytes } = await import('crypto');
    const passDefault = randomBytes(6).toString('hex');
    const hash = await bcrypt.hash(passDefault, 10);
    const usuario = this.usuariosRepo.create({
      nombre: data.nombre.trim(),
      email,
      telefono: data.telefono.trim(),
      carnet: (data.carnet || '').trim(),
      ubicacion: data.ubicacion.trim(),
      password_hash: hash,
      rol: 'cliente',
    });
    try {
      const saved = await this.usuariosRepo.save(usuario);
      return omitPassword(saved);
    } catch (err) {
      // El índice único de `usuarios.email` también debe negar carreras entre
      // dos altas simultáneas o correos que sólo difieren en mayúsculas.
      if ((err as { code?: string })?.code === '23505') {
        throw new BadRequestException('El correo electrónico ya está registrado');
      }
      throw err;
    }
  }

  async actualizar(id: number, data: Partial<Usuario>) {
    await this.findOne(id);
    if (data.email) {
      const correo = data.email.trim().toLowerCase();
      const existe = await this.usuariosRepo.findOne({
        where: { email: ILike(correo) },
      });
      if (existe && existe.id !== id) {
        throw new BadRequestException('El correo electrónico ya está registrado');
      }
      data.email = correo;
    }
    try {
      await this.usuariosRepo.update(id, data);
    } catch (err) {
      if ((err as { code?: string })?.code === '23505') {
        throw new BadRequestException('El correo electrónico ya está registrado');
      }
      throw err;
    }
    return this.findOne(id);
  }

  async desactivar(id: number) {
    await this.findOne(id);
    await this.usuariosRepo.update(id, { activo: false });
    return { message: 'Cliente desactivado correctamente' };
  }
}

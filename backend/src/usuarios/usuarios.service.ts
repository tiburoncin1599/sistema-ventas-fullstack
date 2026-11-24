import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Usuario } from './usuario.entity';
import { omitPassword } from '../common/utils';

@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(Usuario)
    private usuariosRepo: Repository<Usuario>,
  ) {}

  async findAll(page = 1, limit = 50) {
    const usuarios = await this.usuariosRepo.find({
      skip: (page - 1) * limit,
      take: limit,
    });
    return usuarios.map(omitPassword);
  }

  async findOne(id: number) {
    const usuario = await this.usuariosRepo.findOne({ where: { id } });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');
    return omitPassword(usuario);
  }

  findVendedores() {
    return this.usuariosRepo
      .find({ where: { rol: 'ventas' }, order: { nombre: 'ASC' } })
      .then((lista) => lista.map(omitPassword));
  }

  /** Búsqueda case-insensitive: el correo es único aunque venga en otra capitalización. */
  findByEmail(email: string) {
    return this.usuariosRepo.findOne({
      where: { email: ILike(email.trim()) },
    });
  }

  crear(data: Partial<Usuario>) {
    const usuario = this.usuariosRepo.create(data);
    return this.usuariosRepo.save(usuario);
  }

  actualizar(id: number, data: Partial<Usuario>) {
    return this.usuariosRepo.update(id, data);
  }

  async eliminar(id: number) {
    const usuario = await this.usuariosRepo.findOne({ where: { id } });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');
    return this.usuariosRepo.remove(usuario);
  }
}

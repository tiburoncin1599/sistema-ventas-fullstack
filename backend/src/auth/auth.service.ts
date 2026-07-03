import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsuariosService } from '../usuarios/usuarios.service';
import { RefreshToken } from './refresh-token.entity';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private usuariosService: UsuariosService,
    private jwtService: JwtService,
    @InjectRepository(RefreshToken)
    private refreshTokenRepo: Repository<RefreshToken>,
  ) {}

  private generarAccessToken(usuario: { id: number; rol: string }): string {
    return this.jwtService.sign({ id: usuario.id, rol: usuario.rol });
  }

  private async generarRefreshToken(usuarioId: number): Promise<string> {
    const token = crypto.randomBytes(40).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await this.refreshTokenRepo.save({
      usuario_id: usuarioId,
      token,
      expires_at: expiresAt,
    });

    return token;
  }

  private buildResponse(usuario: any, accessToken: string, refreshToken: string) {
    return {
      token: accessToken,
      refreshToken,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
      },
    };
  }

  async registro(nombre: string, email: string, password: string) {
    const existe = await this.usuariosService.findByEmail(email);
    if (existe) throw new BadRequestException('El email ya está registrado');

    const hash = await bcrypt.hash(password, 10);
    const usuario = await this.usuariosService.crear({
      nombre,
      email,
      password_hash: hash,
    });

    const accessToken = this.generarAccessToken(usuario);
    const refreshToken = await this.generarRefreshToken(usuario.id);

    return this.buildResponse(usuario, accessToken, refreshToken);
  }

  async loginOGoogle(googleId: string, email: string, nombre: string) {
    let usuario = await this.usuariosService.findByEmail(email);
    if (usuario) {
      if (!usuario.google_id) {
        await this.usuariosService.actualizar(usuario.id, {
          google_id: googleId,
        });
      }
    } else {
      usuario = await this.usuariosService.crear({
        nombre,
        email,
        google_id: googleId,
        password_hash: '',
      });
    }

    const accessToken = this.generarAccessToken(usuario);
    const refreshToken = await this.generarRefreshToken(usuario.id);

    return this.buildResponse(usuario, accessToken, refreshToken);
  }

  async login(email: string, password: string) {
    const usuario = await this.usuariosService.findByEmail(email);
    if (!usuario) throw new UnauthorizedException('Credenciales incorrectas');
    if (!usuario.password_hash)
      throw new UnauthorizedException('Credenciales incorrectas');

    const valido = await bcrypt.compare(password, usuario.password_hash);
    if (!valido) throw new UnauthorizedException('Credenciales incorrectas');

    const accessToken = this.generarAccessToken(usuario);
    const refreshToken = await this.generarRefreshToken(usuario.id);

    return this.buildResponse(usuario, accessToken, refreshToken);
  }

  async refresh(refreshTokenStr: string) {
    const record = await this.refreshTokenRepo.findOne({
      where: { token: refreshTokenStr, revocado: false },
      relations: ['usuario'],
    });

    if (!record) throw new UnauthorizedException('Refresh token inválido');

    if (new Date() > record.expires_at) {
      throw new UnauthorizedException('Refresh token expirado');
    }

    const usuario = await this.usuariosService.findOne(record.usuario_id);
    if (!usuario) throw new UnauthorizedException('Usuario no encontrado');

    await this.refreshTokenRepo.update(record.id, { revocado: true });

    const accessToken = this.generarAccessToken(usuario);
    const newRefreshToken = await this.generarRefreshToken(usuario.id);

    return this.buildResponse(usuario, accessToken, newRefreshToken);
  }

  async logout(usuarioId: number) {
    await this.refreshTokenRepo.update(
      { usuario_id: usuarioId, revocado: false },
      { revocado: true },
    );
    return { message: 'Sesión cerrada correctamente' };
  }
}

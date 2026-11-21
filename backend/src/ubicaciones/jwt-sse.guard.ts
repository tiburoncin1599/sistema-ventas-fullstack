import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ROLES_KEY } from '../auth/roles.decorator';
import { normalizarRol } from '../auth/roles.constant';
import { Usuario } from '../usuarios/usuario.entity';
import { Request } from 'express';

@Injectable()
export class JwtSseGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();

    // EventSource no puede enviar headers: se conserva el token por query,
    // pero ahora se valida igual que cualquier otra petición autenticada.
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : (req.query.token as string | undefined);

    if (!token) throw new UnauthorizedException('Token no proporcionado');

    let payload: { id: number; rol: string };
    try {
      payload = this.jwtService.verify<{ id: number; rol: string }>(token);
    } catch {
      throw new UnauthorizedException('Token inválido o expirado');
    }

    // La BD es la fuente de verdad: un usuario dado de baja deja de recibir
    // el stream aunque su JWT no haya expirado todavía.
    const usuario = await this.dataSource.getRepository(Usuario).findOne({
      where: { id: payload.id },
    });
    if (!usuario || !usuario.activo) {
      throw new UnauthorizedException('Usuario inactivo o no encontrado');
    }
    const rol = normalizarRol(usuario.rol) ?? usuario.rol;

    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (
      requiredRoles &&
      !requiredRoles.some((requerido) => normalizarRol(requerido) === rol)
    ) {
      throw new ForbiddenException('No autorizado para esta acción');
    }

    (req as Request & { user?: { id: number; rol: string } }).user = {
      id: usuario.id,
      rol,
    };
    return true;
  }
}

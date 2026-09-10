import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../auth/roles.decorator';
import { Request } from 'express';

@Injectable()
export class JwtSseGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();

    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : (req.query.token as string | undefined);

    if (!token) throw new UnauthorizedException('Token no proporcionado');

    let payload: { id: number; rol: string };
    try {
      payload = this.jwtService.verify(token);
    } catch {
      throw new UnauthorizedException('Token inválido o expirado');
    }

    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (requiredRoles && !requiredRoles.includes(payload.rol)) {
      throw new UnauthorizedException('No autorizado para esta acción');
    }

    (req as Request & { user?: { id: number; rol: string } }).user = {
      id: payload.id,
      rol: payload.rol,
    };
    return true;
  }
}

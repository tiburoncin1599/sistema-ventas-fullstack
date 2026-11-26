import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { normalizarRol } from '../auth/roles.constant';
import { UsuariosService } from '../usuarios/usuarios.service';

export interface UsuarioOpcional {
  id: number;
  rol: string;
}

export interface SolicitudConUsuario {
  headers: { authorization?: string | string[] };
  user?: UsuarioOpcional;
}

/**
 * Lee el JWT sólo si viene en la petición. Un token ausente, vencido,
 * malformado o de un usuario inactivo se trata como acceso anónimo: el
 * endpoint público sigue respondiendo y el service nunca consulta pedidos.
 */
@Injectable()
export class JwtOpcionalGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usuariosService: UsuariosService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<SolicitudConUsuario>();
    const cabecera = req.headers.authorization;
    const crudo = Array.isArray(cabecera) ? cabecera[0] : cabecera;
    const token = crudo?.replace(/^Bearer\s+/i, '').trim();

    if (!token) return true;

    try {
      const payload = await this.jwtService.verifyAsync<{
        id: number;
        rol: string;
      }>(token);
      const id = Number(payload?.id);

      if (Number.isInteger(id) && id > 0) {
        const usuario = await this.usuariosService.findOne(id);
        if (usuario?.activo) {
          req.user = {
            id: usuario.id,
            rol: normalizarRol(usuario.rol) ?? usuario.rol,
          };
        }
      }
    } catch {
      // Token inválido: el asistente responde en modo público.
    }

    return true;
  }
}

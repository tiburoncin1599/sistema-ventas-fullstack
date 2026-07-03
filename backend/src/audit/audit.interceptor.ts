import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { AuditService } from './audit.service';
import { Request } from 'express';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const method = request.method;
    const url = request.route?.path || request.url;
    const user = request.user as { id?: number; nombre?: string; rol?: string } | undefined;

    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return next.handle();
    }

    const entidad = url.split('/')[1];

    return next.handle().pipe(
      tap((responseBody: Record<string, unknown>) => {
        const body = responseBody as Record<string, unknown> | undefined;
        const params = context.switchToHttp().getRequest().params as Record<string, string> | undefined;
        const entidadId =
          (params?.id ? Number(params.id) : undefined) ??
          body?.id ??
          (body?.pedido as Record<string, unknown> | undefined)?.id ??
          (body?.deuda as Record<string, unknown> | undefined)?.id;

        this.auditService.registrar({
          accion: method === 'POST' ? 'crear' : method === 'DELETE' ? 'eliminar' : 'actualizar',
          entidad,
          entidad_id: entidadId ? Number(entidadId) : undefined,
          valor_nuevo: method !== 'DELETE' ? (body as Record<string, unknown>) : undefined,
          usuario_id: user?.id,
          usuario_nombre: user?.nombre,
          usuario_rol: user?.rol,
          ip: request.ip,
        }).catch((err) => {
          console.error('Error al registrar auditoría:', err);
        });
      }),
    );
  }
}

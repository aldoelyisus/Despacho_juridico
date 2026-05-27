import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LogAuditoria } from '../../auditoria/entities/log-auditoria.entity';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    @InjectRepository(LogAuditoria)
    private readonly logRepo: Repository<LogAuditoria>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;

    // Only audit mutating operations
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return next.handle();
    }

    const user = request.user;
    const url = request.url;
    const now = Date.now();

    return next.handle().pipe(
      tap(async () => {
        if (!user) return;
        try {
          const log = this.logRepo.create({
            despachoId: user.despachoId,
            usuarioId: user.id,
            usuarioNombre: `${user.nombre} ${user.apellido}`,
            accion: this.getAction(method),
            modulo: this.getModule(url),
            descripcion: `${method} ${url}`,
            ip: request.ip,
            duracionMs: Date.now() - now,
          });
          await this.logRepo.save(log);
        } catch {}
      }),
    );
  }

  private getAction(method: string): string {
    const map: Record<string, string> = {
      POST: 'CREAR',
      PUT: 'ACTUALIZAR',
      PATCH: 'ACTUALIZAR',
      DELETE: 'ELIMINAR',
    };
    return map[method] || method;
  }

  private getModule(url: string): string {
    const parts = url.split('/').filter(Boolean);
    return parts[1]?.toUpperCase() || 'SISTEMA';
  }
}

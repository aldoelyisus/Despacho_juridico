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
      tap(async (response: any) => {
        if (!user) return;
        try {
          const log = this.logRepo.create({
            despachoId: user.despachoId,
            usuarioId: user.id,
            usuarioNombre: `${user.nombre} ${user.apellido}`,
            accion: this.getAction(method),
            modulo: this.getModule(url),
            descripcion: this.getDescripcion(method, url, response),
            ip: request.ip,
            duracionMs: Date.now() - now,
          });
          await this.logRepo.save(log);
        } catch {}
      }),
    );
  }

  /** Arma una descripción legible a partir del recurso afectado; si no se reconoce ningún campo, cae al formato técnico */
  private getDescripcion(method: string, url: string, response: any): string {
    const detalle = this.describirPago(url, response) ?? this.extraerNombreLegible(response);
    if (detalle) return `${this.getAction(method)} — ${detalle}`;
    return `${method} ${url}`;
  }

  /** Descripción específica para cobros/abonos: número de recibo y montos, mucho más útil que el nombre genérico */
  private describirPago(url: string, response: any): string | null {
    const path = url.split('?')[0];
    if (!path.startsWith('/pagos') || !response?.numero) return null;
    const total = Number(response.montoTotal ?? 0).toFixed(2);
    if (path.includes('/abonos')) {
      const pendiente = Number(response.montoPendiente ?? 0).toFixed(2);
      return `Abono a ${response.numero} — total $${total}, pendiente $${pendiente}`;
    }
    return `Cobro ${response.numero} — $${total}`;
  }

  private extraerNombreLegible(response: any): string | null {
    if (!response || typeof response !== 'object') return null;
    if (response.nombre && response.apellido) return `${response.nombre} ${response.apellido}`;
    if (response.nombre) return response.nombre;
    if (response.titulo) return response.titulo;
    if (response.email) return response.email;
    return null;
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
    const parts = url.split('?')[0].split('/').filter(Boolean);
    // Rutas /root/<modulo>/... reportan el módulo real; el resto son /<modulo>/... directo
    if (parts[0] === 'root' && parts[1]) return parts[1].toUpperCase();
    return parts[0]?.toUpperCase() || 'SISTEMA';
  }
}

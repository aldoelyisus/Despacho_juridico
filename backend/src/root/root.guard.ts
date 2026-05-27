import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class RootGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest();
    if (user?.rol?.nombre?.toLowerCase() === 'root') return true;
    throw new ForbiddenException('Acceso exclusivo para administradores del sistema');
  }
}

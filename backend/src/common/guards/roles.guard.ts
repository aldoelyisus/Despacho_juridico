import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, RolEnum } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<RolEnum[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();
    const userRole = user?.rol?.nombre?.toLowerCase();

    if (!userRole) throw new ForbiddenException('Sin permisos suficientes');
    if (userRole === 'administrador') return true;
    if (requiredRoles.some((r) => r === userRole)) return true;

    throw new ForbiddenException('Sin permisos suficientes para esta acción');
  }
}

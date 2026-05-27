import { SetMetadata } from '@nestjs/common';

export enum RolEnum {
  ADMIN = 'administrador',
  ABOGADO = 'abogado',
  ASISTENTE = 'asistente',
  CONTADOR = 'contador',
}

export const ROLES_KEY = 'roles';
export const Roles = (...roles: RolEnum[]) => SetMetadata(ROLES_KEY, roles);

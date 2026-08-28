import { useAuthStore } from '../stores/authStore';

/** Roles de usuario dentro de un despacho (root queda fuera — tiene su propio panel aparte) */
export type Rol = 'administrador' | 'abogado' | 'asistente' | 'contador';

export type Modulo =
  | 'clientes' | 'expedientes' | 'agenda' | 'pagos'
  | 'usuarios' | 'catalogos' | 'descuentos' | 'auditoria' | 'configuracion';

export type Accion = 'crear' | 'editar' | 'eliminar';

/** Páginas a las que cada rol tiene acceso (además de Dashboard y Perfil, siempre visibles). */
const PAGINAS_POR_ROL: Record<Rol, Modulo[]> = {
  administrador: ['clientes', 'expedientes', 'agenda', 'pagos', 'usuarios', 'catalogos', 'descuentos', 'auditoria', 'configuracion'],
  abogado:       ['clientes', 'expedientes', 'agenda', 'pagos'],
  asistente:     ['clientes', 'expedientes', 'agenda', 'pagos'],
  contador:      ['clientes', 'expedientes', 'agenda', 'pagos', 'descuentos'],
};

/** Acciones de escritura (botones de crear/editar/eliminar) que cada rol puede hacer dentro
 *  de un módulo al que ya tiene acceso de lectura — debe reflejar exactamente lo que el backend
 *  permite (@Roles en cada controller), esto solo evita mostrar botones que de todas formas
 *  el servidor va a rechazar. */
const ACCIONES_POR_ROL: Record<Rol, Partial<Record<Modulo, Accion[]>>> = {
  administrador: {
    clientes: ['crear', 'editar', 'eliminar'],
    expedientes: ['crear', 'editar', 'eliminar'],
    agenda: ['crear', 'editar', 'eliminar'],
    pagos: ['crear', 'editar', 'eliminar'],
    usuarios: ['crear', 'editar', 'eliminar'],
    catalogos: ['crear', 'editar', 'eliminar'],
    descuentos: ['crear', 'editar', 'eliminar'],
    configuracion: ['editar'],
  },
  abogado: {
    clientes: ['crear', 'editar', 'eliminar'],
    expedientes: ['crear', 'editar', 'eliminar'],
    agenda: ['crear', 'editar', 'eliminar'],
  },
  asistente: {
    clientes: ['crear', 'editar'],
    expedientes: ['crear', 'editar'],
    agenda: ['crear', 'editar', 'eliminar'],
  },
  contador: {
    agenda: ['crear', 'editar', 'eliminar'],
    pagos: ['crear', 'editar', 'eliminar'],
  },
};

function rolDe(usuario: any): Rol | null {
  const nombre = usuario?.rol?.nombre?.toLowerCase();
  if (nombre === 'administrador' || nombre === 'abogado' || nombre === 'asistente' || nombre === 'contador') {
    return nombre;
  }
  return null;
}

export function useRol(): Rol | null {
  const usuario = useAuthStore((s) => s.usuario);
  return rolDe(usuario);
}

/** Versiones puras (sin hook) para usarlas junto a un `rol` ya obtenido con useRol() —
 *  necesario al filtrar listas (map/filter no pueden llamar hooks por elemento). */
export function puedeVer(rol: Rol | null, modulo: Modulo): boolean {
  if (!rol) return false;
  return PAGINAS_POR_ROL[rol].includes(modulo);
}

export function puede(rol: Rol | null, modulo: Modulo, accion: Accion): boolean {
  if (!rol) return false;
  return (ACCIONES_POR_ROL[rol][modulo] ?? []).includes(accion);
}

/** ¿El usuario actual puede navegar a este módulo? (controla si se ve el link en el menú y si
 *  se puede entrar a la ruta directamente por URL) */
export function usePuedeVer(modulo: Modulo): boolean {
  const rol = useRol();
  return puedeVer(rol, modulo);
}

/** ¿El usuario actual puede crear/editar/eliminar dentro de este módulo? (controla qué botones
 *  de acción se muestran) */
export function usePuede(modulo: Modulo, accion: Accion): boolean {
  const rol = useRol();
  return puede(rol, modulo, accion);
}

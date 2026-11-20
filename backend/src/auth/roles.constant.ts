export const ROLES = {
  ADMIN: 'admin',
  VENTAS: 'ventas',
  INVENTARIO: 'inventario',
  CLIENTE: 'cliente',
} as const;

export type Rol = (typeof ROLES)[keyof typeof ROLES];

/** Normaliza el rol proveniente de BD/JWT para comparaciones insensibles a mayúsculas. */
export function normalizarRol(rol: unknown): string | undefined {
  return typeof rol === 'string' ? rol.trim().toLowerCase() : undefined;
}

export const ROLES_PERSONAL: Rol[] = [
  ROLES.ADMIN,
  ROLES.VENTAS,
  ROLES.INVENTARIO,
];

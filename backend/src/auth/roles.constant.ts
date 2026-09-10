export const ROLES = {
  ADMIN: 'admin',
  VENTAS: 'ventas',
  INVENTARIO: 'inventario',
  CLIENTE: 'cliente',
} as const;

export type Rol = (typeof ROLES)[keyof typeof ROLES];

export const ROLES_PERSONAL: Rol[] = [
  ROLES.ADMIN,
  ROLES.VENTAS,
  ROLES.INVENTARIO,
];

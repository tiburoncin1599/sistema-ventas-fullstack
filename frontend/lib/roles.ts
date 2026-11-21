/**
 * Única fuente de verdad para la normalización de roles en el frontend.
 *
 * trim + lowercase en todos los casos. En la UI el valor por defecto es
 * `cliente`; el proxy pide explícitamente `undefined` para no inventar un rol
 * cuando no hay sesión/cookie válida.
 */
export function normalizarRol(rol: unknown): string;
export function normalizarRol(rol: unknown, porDefecto: undefined): string | undefined;
export function normalizarRol(
  rol: unknown,
  porDefecto: string | undefined = 'cliente',
): string | undefined {
  return typeof rol === 'string' ? rol.trim().toLowerCase() : porDefecto;
}

/** Comparación de rol ya normalizada (útil para listas de roles permitidos). */
export function esRol(rol: unknown, ...roles: string[]): boolean {
  return roles.includes(normalizarRol(rol));
}

/** Etiqueta lista para mostrar en la UI (p. ej. `ventas` -> `Ventas`). */
export function etiquetaRol(rol: unknown): string {
  const normalizado = normalizarRol(rol);
  return normalizado.charAt(0).toUpperCase() + normalizado.slice(1);
}

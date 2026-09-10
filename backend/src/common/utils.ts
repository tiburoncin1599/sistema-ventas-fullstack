export function omitPassword<T extends object>(
  entity: T,
): Omit<T, 'password_hash'> {
  const { password_hash: _hash, ...rest } = entity as T & {
    password_hash?: unknown;
  };
  void _hash;
  return rest;
}

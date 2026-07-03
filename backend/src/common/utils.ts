export function omitPassword<T extends { password_hash: string }>(
  entity: T,
): Omit<T, 'password_hash'> {
  const { password_hash, ...rest } = entity;
  return rest;
}

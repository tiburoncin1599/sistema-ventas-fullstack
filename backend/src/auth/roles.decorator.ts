import { SetMetadata } from '@nestjs/common';
import type { Rol } from './roles.constant';

export const ROLES_KEY = 'roles';

export const Roles = (...roles: (Rol | string)[]) =>
  SetMetadata(ROLES_KEY, roles);

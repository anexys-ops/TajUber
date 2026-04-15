import { SetMetadata } from "@nestjs/common";
import type { UserTenantRole } from "@taj/database";

export const ROLES_KEY = "roles";

export const Roles = (...roles: UserTenantRole[]) =>
  SetMetadata(ROLES_KEY, roles);

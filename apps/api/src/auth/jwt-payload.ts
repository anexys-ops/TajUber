import type { UserTenantRole } from "@taj/database";

export type AccessTokenPayload = {
  sub: string;
  email: string;
  scope: "platform" | "tenant";
  isPlatformOwner?: boolean;
  tenantId?: string;
  role?: UserTenantRole;
};

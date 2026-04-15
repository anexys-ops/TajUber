import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { UserTenantRole } from "@taj/database";
import type { Request } from "express";
import type { AccessTokenPayload } from "./jwt-payload";
import { PLATFORM_OWNER_KEY } from "./platform-owner.decorator";
import { ROLES_KEY } from "./roles.decorator";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requirePlatform = this.reflector.getAllAndOverride<boolean>(
      PLATFORM_OWNER_KEY,
      [context.getHandler(), context.getClass()],
    );
    const roles = this.reflector.getAllAndOverride<UserTenantRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requirePlatform && (!roles || roles.length === 0)) {
      return true;
    }

    const req = context.switchToHttp().getRequest<Request>();
    const user = req.user as AccessTokenPayload | undefined;
    if (!user) {
      throw new ForbiddenException();
    }

    if (requirePlatform) {
      if (user.scope === "platform" && user.isPlatformOwner) {
        return true;
      }
      throw new ForbiddenException("Réservé à la plateforme");
    }

    if (roles?.length) {
      const tenant = req.tenant;
      if (user.scope === "platform" && user.isPlatformOwner) {
        return true;
      }
      if (user.scope !== "tenant" || !user.role) {
        throw new ForbiddenException();
      }
      if (tenant && user.tenantId !== tenant.id) {
        throw new ForbiddenException("Mauvais restaurant");
      }
      if (!roles.includes(user.role)) {
        throw new ForbiddenException("Rôle insuffisant");
      }
    }

    return true;
  }
}

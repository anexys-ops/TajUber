import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { UserTenantRole } from "@taj/database";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../prisma/prisma.service";
import type { AccessTokenPayload } from "./jwt-payload";

const BCRYPT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async registerCustomer(dto: {
    email: string;
    password: string;
    displayName?: string;
    tenantSlug: string;
  }) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: dto.tenantSlug.trim().toLowerCase() },
    });
    if (!tenant) {
      throw new ConflictException("Restaurant inconnu");
    }

    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException("Email déjà utilisé");
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        displayName: dto.displayName,
        memberships: {
          create: {
            tenantId: tenant.id,
            role: "CUSTOMER",
          },
        },
      },
    });

    return this.issueTenantToken(user.id, user.email, tenant.id, "CUSTOMER");
  }

  async login(dto: {
    email: string;
    password: string;
    tenantSlug?: string;
  }) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      include: { memberships: true },
    });
    if (!user?.passwordHash) {
      throw new UnauthorizedException("Identifiants invalides");
    }

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException("Identifiants invalides");
    }

    if (user.isPlatformOwner) {
      return this.issuePlatformToken(user.id, user.email);
    }

    if (!dto.tenantSlug) {
      throw new UnauthorizedException(
        "Indiquez le slug du restaurant (tenantSlug) pour ce compte",
      );
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: dto.tenantSlug.trim().toLowerCase() },
    });
    if (!tenant) {
      throw new UnauthorizedException("Restaurant inconnu");
    }

    const membership = user.memberships.find((m) => m.tenantId === tenant.id);
    if (!membership) {
      throw new UnauthorizedException("Accès non autorisé pour ce restaurant");
    }

    return this.issueTenantToken(
      user.id,
      user.email,
      tenant.id,
      membership.role,
    );
  }

  issuePlatformToken(userId: string, email: string) {
    const payload: AccessTokenPayload = {
      sub: userId,
      email,
      scope: "platform",
      isPlatformOwner: true,
    };
    return {
      access_token: this.jwt.sign(payload),
      token_type: "Bearer" as const,
      scope: "platform" as const,
    };
  }

  issueTenantToken(
    userId: string,
    email: string,
    tenantId: string,
    role: UserTenantRole,
  ) {
    const payload: AccessTokenPayload = {
      sub: userId,
      email,
      scope: "tenant",
      tenantId,
      role,
    };
    return {
      access_token: this.jwt.sign(payload),
      token_type: "Bearer" as const,
      scope: "tenant" as const,
      tenantId,
      role,
    };
  }

  verifyAccessToken(token: string): AccessTokenPayload {
    return this.jwt.verify<AccessTokenPayload>(token);
  }
}

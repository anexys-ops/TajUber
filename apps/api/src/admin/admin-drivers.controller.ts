import {
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import type { Tenant } from "@taj/database";
import * as bcrypt from "bcrypt";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { CurrentTenant } from "../tenant/current-tenant.decorator";
import { PrismaService } from "../prisma/prisma.service";
import { CreateDriverDto } from "./dto/create-driver.dto";
import { UpdateDriverDto } from "./dto/update-driver.dto";

const BCRYPT_ROUNDS = 10;

@Controller("admin/drivers")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("TENANT_ADMIN")
export class AdminDriversController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@CurrentTenant() tenant: Tenant) {
    const rows = await this.prisma.userTenant.findMany({
      where: { tenantId: tenant.id, role: "DRIVER" },
      orderBy: { createdAt: "asc" },
      include: {
        user: { select: { id: true, email: true, displayName: true } },
      },
    });
    return rows.map((r) => ({
      membershipId: r.id,
      userId: r.userId,
      email: r.user.email,
      displayName: r.user.displayName,
      createdAt: r.createdAt,
    }));
  }

  @Post()
  async create(@CurrentTenant() tenant: Tenant, @Body() dto: CreateDriverDto) {
    const email = dto.email.toLowerCase().trim();
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
      include: { memberships: true },
    });

    if (!existingUser) {
      const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
      const user = await this.prisma.user.create({
        data: {
          email,
          passwordHash,
          displayName: dto.displayName,
          memberships: {
            create: { tenantId: tenant.id, role: "DRIVER" },
          },
        },
      });
      const m = await this.prisma.userTenant.findUniqueOrThrow({
        where: {
          userId_tenantId: { userId: user.id, tenantId: tenant.id },
        },
      });
      return {
        membershipId: m.id,
        userId: user.id,
        email: user.email,
        displayName: user.displayName,
      };
    }

    const sameTenant = existingUser.memberships.find(
      (m) => m.tenantId === tenant.id,
    );
    if (sameTenant) {
      throw new ConflictException(
        sameTenant.role === "DRIVER"
          ? "Ce livreur est déjà enregistré pour ce restaurant"
          : "Cet email est déjà utilisé sur ce restaurant avec un autre rôle",
      );
    }

    const m = await this.prisma.userTenant.create({
      data: {
        userId: existingUser.id,
        tenantId: tenant.id,
        role: "DRIVER",
      },
    });

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    await this.prisma.user.update({
      where: { id: existingUser.id },
      data: {
        passwordHash,
        ...(dto.displayName !== undefined ? { displayName: dto.displayName } : {}),
      },
    });

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: existingUser.id },
    });

    return {
      membershipId: m.id,
      userId: user.id,
      email: user.email,
      displayName: user.displayName,
    };
  }

  @Patch(":membershipId")
  async update(
    @CurrentTenant() tenant: Tenant,
    @Param("membershipId") membershipId: string,
    @Body() dto: UpdateDriverDto,
  ) {
    const m = await this.prisma.userTenant.findFirst({
      where: { id: membershipId, tenantId: tenant.id, role: "DRIVER" },
    });
    if (!m) {
      throw new NotFoundException("Livreur introuvable");
    }

    if (dto.password !== undefined) {
      const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
      await this.prisma.user.update({
        where: { id: m.userId },
        data: { passwordHash },
      });
    }
    if (dto.displayName !== undefined) {
      await this.prisma.user.update({
        where: { id: m.userId },
        data: { displayName: dto.displayName },
      });
    }

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: m.userId },
    });
    return {
      membershipId: m.id,
      userId: user.id,
      email: user.email,
      displayName: user.displayName,
    };
  }

  @Delete(":membershipId")
  async remove(
    @CurrentTenant() tenant: Tenant,
    @Param("membershipId") membershipId: string,
  ) {
    const res = await this.prisma.userTenant.deleteMany({
      where: { id: membershipId, tenantId: tenant.id, role: "DRIVER" },
    });
    if (res.count === 0) {
      throw new NotFoundException();
    }
    return { deleted: true };
  }
}

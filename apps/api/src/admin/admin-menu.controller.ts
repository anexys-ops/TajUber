import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { Prisma } from "@taj/database";
import type { Tenant } from "@taj/database";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { CurrentTenant } from "../tenant/current-tenant.decorator";
import { PrismaService } from "../prisma/prisma.service";
import { CreateMenuItemDto } from "./dto/create-menu-item.dto";
import { UpdateMenuItemDto } from "./dto/update-menu-item.dto";

@Controller("admin/menu-items")
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminMenuController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Roles("TENANT_ADMIN", "STAFF_POS")
  list(@CurrentTenant() tenant: Tenant) {
    return this.prisma.menuItem.findMany({
      where: { tenantId: tenant.id },
      orderBy: { sortOrder: "asc" },
    });
  }

  @Post()
  @Roles("TENANT_ADMIN")
  create(@CurrentTenant() tenant: Tenant, @Body() dto: CreateMenuItemDto) {
    return this.prisma.menuItem.create({
      data: {
        tenantId: tenant.id,
        category: dto.category,
        name: dto.name,
        description: dto.description,
        priceCents: dto.priceCents,
        photoUrl: dto.photoUrl,
        sortOrder: dto.sortOrder ?? 0,
        isAvailable: dto.isAvailable ?? true,
      },
    });
  }

  @Patch(":id")
  @Roles("TENANT_ADMIN")
  async update(
    @CurrentTenant() tenant: Tenant,
    @Param("id") id: string,
    @Body() dto: UpdateMenuItemDto,
  ) {
    const existing = await this.prisma.menuItem.findFirst({
      where: { id, tenantId: tenant.id },
    });
    if (!existing) {
      throw new NotFoundException();
    }
    const data: Prisma.MenuItemUpdateInput = {};
    if (dto.category !== undefined) {
      data.category = dto.category;
    }
    if (dto.name !== undefined) {
      data.name = dto.name;
    }
    if (dto.description !== undefined) {
      data.description = dto.description;
    }
    if (dto.priceCents !== undefined) {
      data.priceCents = dto.priceCents;
    }
    if (dto.photoUrl !== undefined) {
      data.photoUrl = dto.photoUrl;
    }
    if (dto.sortOrder !== undefined) {
      data.sortOrder = dto.sortOrder;
    }
    if (dto.isAvailable !== undefined) {
      data.isAvailable = dto.isAvailable;
    }
    return this.prisma.menuItem.update({
      where: { id },
      data,
    });
  }

  @Delete(":id")
  @Roles("TENANT_ADMIN")
  async remove(@CurrentTenant() tenant: Tenant, @Param("id") id: string) {
    const res = await this.prisma.menuItem.deleteMany({
      where: { id, tenantId: tenant.id },
    });
    if (res.count === 0) {
      throw new NotFoundException();
    }
    return { deleted: true };
  }
}

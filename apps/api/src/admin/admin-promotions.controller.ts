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
import { PrismaService } from "../prisma/prisma.service";
import { CurrentTenant } from "../tenant/current-tenant.decorator";
import { CreatePromotionDto } from "./dto/create-promotion.dto";
import { UpdatePromotionDto } from "./dto/update-promotion.dto";

@Controller("admin/promotions")
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminPromotionsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Roles("TENANT_ADMIN", "STAFF_POS")
  list(@CurrentTenant() tenant: Tenant) {
    return this.prisma.promotion.findMany({
      where: { tenantId: tenant.id },
      orderBy: { createdAt: "desc" },
    });
  }

  @Post()
  @Roles("TENANT_ADMIN")
  create(@CurrentTenant() tenant: Tenant, @Body() dto: CreatePromotionDto) {
    return this.prisma.promotion.create({
      data: {
        tenantId: tenant.id,
        title: dto.title,
        description: dto.description,
        percentOff:
          dto.percentOff !== undefined
            ? new Prisma.Decimal(dto.percentOff)
            : undefined,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
        active: dto.active ?? true,
      },
    });
  }

  @Patch(":id")
  @Roles("TENANT_ADMIN")
  async update(
    @CurrentTenant() tenant: Tenant,
    @Param("id") id: string,
    @Body() dto: UpdatePromotionDto,
  ) {
    const existing = await this.prisma.promotion.findFirst({
      where: { id, tenantId: tenant.id },
    });
    if (!existing) {
      throw new NotFoundException();
    }
    const data: Prisma.PromotionUpdateInput = {};
    if (dto.title !== undefined) {
      data.title = dto.title;
    }
    if (dto.description !== undefined) {
      data.description = dto.description;
    }
    if (dto.percentOff !== undefined) {
      data.percentOff = new Prisma.Decimal(dto.percentOff);
    }
    if (dto.startsAt !== undefined) {
      data.startsAt = dto.startsAt ? new Date(dto.startsAt) : null;
    }
    if (dto.endsAt !== undefined) {
      data.endsAt = dto.endsAt ? new Date(dto.endsAt) : null;
    }
    if (dto.active !== undefined) {
      data.active = dto.active;
    }
    return this.prisma.promotion.update({ where: { id }, data });
  }

  @Delete(":id")
  @Roles("TENANT_ADMIN")
  async remove(@CurrentTenant() tenant: Tenant, @Param("id") id: string) {
    const res = await this.prisma.promotion.deleteMany({
      where: { id, tenantId: tenant.id },
    });
    if (res.count === 0) {
      throw new NotFoundException();
    }
    return { deleted: true };
  }
}

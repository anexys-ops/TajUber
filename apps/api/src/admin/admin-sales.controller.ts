import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import type { Tenant } from "@taj/database";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { CurrentTenant } from "../tenant/current-tenant.decorator";
import { PrismaService } from "../prisma/prisma.service";
import { SalesReportQueryDto } from "./dto/sales-report-query.dto";

const COUNTED_STATUSES = [
  "PAID",
  "IN_KITCHEN",
  "READY",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
] as const;

@Controller("admin/sales-report")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("TENANT_ADMIN", "STAFF_POS")
export class AdminSalesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async report(
    @CurrentTenant() tenant: Tenant,
    @Query() query: SalesReportQueryDto,
  ) {
    const from = new Date(query.from);
    const to = new Date(query.to);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      return { error: "Dates invalides" };
    }

    const whereBase = {
      tenantId: tenant.id,
      createdAt: { gte: from, lte: to },
      status: { in: [...COUNTED_STATUSES] },
    };

    const [aggregate, byMethod] = await Promise.all([
      this.prisma.order.aggregate({
        where: whereBase,
        _sum: { totalCents: true },
        _count: true,
      }),
      this.prisma.order.groupBy({
        by: ["paymentMethod"],
        where: whereBase,
        _sum: { totalCents: true },
        _count: true,
      }),
    ]);

    return {
      from: from.toISOString(),
      to: to.toISOString(),
      orderCount: aggregate._count,
      totalCents: aggregate._sum.totalCents ?? 0,
      byPaymentMethod: byMethod.map((row) => ({
        paymentMethod: row.paymentMethod,
        orderCount: row._count,
        totalCents: row._sum.totalCents ?? 0,
      })),
    };
  }
}

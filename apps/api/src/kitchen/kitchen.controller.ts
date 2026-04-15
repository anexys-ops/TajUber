import { Controller, Get, UseGuards } from "@nestjs/common";
import type { Tenant } from "@taj/database";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { CurrentTenant } from "../tenant/current-tenant.decorator";
import { OrdersService } from "../orders/orders.service";

@Controller("kitchen")
export class KitchenController {
  constructor(private readonly orders: OrdersService) {}

  @Get("orders")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("TENANT_ADMIN", "STAFF_POS", "KITCHEN")
  list(@CurrentTenant() tenant: Tenant) {
    return this.orders.listForKitchen(tenant);
  }
}

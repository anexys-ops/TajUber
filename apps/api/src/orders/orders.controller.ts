import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import type { Tenant } from "@taj/database";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { CurrentTenant } from "../tenant/current-tenant.decorator";
import type { AccessTokenPayload } from "../auth/jwt-payload";
import { CreateOrderDto } from "./dto/create-order.dto";
import { MarkOrderPaidDto } from "./dto/mark-order-paid.dto";
import { UpdateOrderStatusDto } from "./dto/update-order-status.dto";
import { OrdersService } from "./orders.service";

@Controller("orders")
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("TENANT_ADMIN", "STAFF_POS", "KITCHEN", "DRIVER")
  list(@CurrentTenant() tenant: Tenant) {
    return this.orders.listForTenant(tenant);
  }

  @Post()
  create(@CurrentTenant() tenant: Tenant, @Body() dto: CreateOrderDto) {
    return this.orders.createDraft(tenant, dto);
  }

  @Post(":id/mark-paid")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("TENANT_ADMIN", "STAFF_POS")
  markPaid(
    @CurrentTenant() tenant: Tenant,
    @Param("id") id: string,
    @Body() dto: MarkOrderPaidDto,
    @CurrentUser() user: AccessTokenPayload,
  ) {
    return this.orders.markPaid(tenant, id, dto.paymentMethod, user);
  }

  @Post(":id/payment-intent")
  paymentIntent(
    @CurrentTenant() tenant: Tenant,
    @Param("id") id: string,
  ) {
    return this.orders.createPaymentIntent(tenant, id);
  }

  @Patch(":id/status")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    "TENANT_ADMIN",
    "STAFF_POS",
    "KITCHEN",
    "DRIVER",
  )
  async updateStatus(
    @CurrentTenant() tenant: Tenant,
    @Param("id") id: string,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser() user: AccessTokenPayload,
  ) {
    return this.orders.updateStatus(
      tenant,
      id,
      dto.status,
      user,
      "staff",
    );
  }
}

import { Body, Controller, Get, Patch, UseGuards } from "@nestjs/common";
import type { Prisma, Tenant } from "@taj/database";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { CurrentTenant } from "../tenant/current-tenant.decorator";
import { isRestaurantOpenNow } from "../common/opening-hours";
import { PrismaService } from "../prisma/prisma.service";
import { UpdateTenantRestaurantDto } from "./dto/update-tenant-restaurant.dto";

function restaurantPatchData(
  dto: UpdateTenantRestaurantDto,
): Prisma.TenantUpdateInput {
  const entries = Object.entries(dto).filter(([, v]) => v !== undefined);
  return Object.fromEntries(entries) as Prisma.TenantUpdateInput;
}

@Controller("admin/restaurant")
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminRestaurantController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Roles("TENANT_ADMIN", "STAFF_POS")
  async get(@CurrentTenant() tenant: Tenant) {
    const t = await this.prisma.tenant.findUniqueOrThrow({
      where: { id: tenant.id },
    });
    return {
      slug: t.slug,
      name: t.name,
      brandName: t.brandName,
      logoUrl: t.logoUrl,
      primaryColor: t.primaryColor,
      restaurantStreet: t.restaurantStreet,
      restaurantCity: t.restaurantCity,
      restaurantPostalCode: t.restaurantPostalCode,
      restaurantCountry: t.restaurantCountry,
      restaurantPhone: t.restaurantPhone,
      restaurantEmail: t.restaurantEmail,
      restaurantDescription: t.restaurantDescription,
      openingHoursJson: t.openingHoursJson,
      isOpenNow: isRestaurantOpenNow(t.openingHoursJson),
      deliveryEnabled: t.deliveryEnabled,
      pickupEnabled: t.pickupEnabled,
      paymentsStripeEnabled: t.paymentsStripeEnabled,
      paymentsCashEnabled: t.paymentsCashEnabled,
      paymentsQontoEnabled: t.paymentsQontoEnabled,
      paymentsMealVoucherEnabled: t.paymentsMealVoucherEnabled,
      qontoPaymentNote: t.qontoPaymentNote,
      mealVoucherNote: t.mealVoucherNote,
      stripeConnectChargesEnabled: t.stripeConnectChargesEnabled,
      stripeConnectAccountId: t.stripeConnectAccountId,
    };
  }

  @Patch()
  @Roles("TENANT_ADMIN")
  async patch(
    @CurrentTenant() tenant: Tenant,
    @Body() dto: UpdateTenantRestaurantDto,
  ) {
    const data = restaurantPatchData(dto);
    if (Object.keys(data).length === 0) {
      const t = await this.prisma.tenant.findUniqueOrThrow({
        where: { id: tenant.id },
      });
      return {
        ok: true,
        unchanged: true,
        isOpenNow: isRestaurantOpenNow(t.openingHoursJson),
      };
    }
    const t = await this.prisma.tenant.update({
      where: { id: tenant.id },
      data,
    });
    return {
      ok: true,
      isOpenNow: isRestaurantOpenNow(t.openingHoursJson),
    };
  }
}

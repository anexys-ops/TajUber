import { Controller, Get } from "@nestjs/common";
import type { Tenant } from "@taj/database";
import { isRestaurantOpenNow } from "../common/opening-hours";
import { PrismaService } from "../prisma/prisma.service";
import { CurrentTenant } from "../tenant/current-tenant.decorator";

@Controller("catalog")
export class PublicController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("menu-items")
  menuItems(@CurrentTenant() tenant: Tenant) {
    return this.prisma.menuItem.findMany({
      where: { tenantId: tenant.id, isAvailable: true },
      orderBy: { sortOrder: "asc" },
    });
  }

  @Get("promotions")
  promotions(@CurrentTenant() tenant: Tenant) {
    return this.prisma.promotion.findMany({
      where: { tenantId: tenant.id, active: true },
    });
  }

  /** Infos publiques restaurant + statut ouvert (horaires) pour app / site. */
  @Get("restaurant")
  restaurant(@CurrentTenant() tenant: Tenant) {
    const isOpen = isRestaurantOpenNow(tenant.openingHoursJson);
    const deliveryOk = tenant.deliveryEnabled && isOpen;
    const pickupOk = tenant.pickupEnabled && isOpen;
    return {
      slug: tenant.slug,
      name: tenant.name,
      brandName: tenant.brandName,
      logoUrl: tenant.logoUrl,
      primaryColor: tenant.primaryColor,
      description: tenant.restaurantDescription,
      street: tenant.restaurantStreet,
      city: tenant.restaurantCity,
      postalCode: tenant.restaurantPostalCode,
      country: tenant.restaurantCountry,
      phone: tenant.restaurantPhone,
      email: tenant.restaurantEmail,
      openingHoursJson: tenant.openingHoursJson,
      isOpenNow: isOpen,
      deliveryAvailable: deliveryOk,
      pickupAvailable: pickupOk,
    };
  }
}

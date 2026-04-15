import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RequirePlatformOwner } from "../auth/platform-owner.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { StripeService } from "../stripe/stripe.service";
import { BillingCheckoutDto } from "./dto/billing-checkout.dto";
import { ConnectOnboardingDto } from "./dto/connect-onboarding.dto";
import { TenantsService } from "./tenants.service";
import { CreateTenantDto } from "./dto/create-tenant.dto";

/**
 * Routes plateforme (pas d’en-tête tenant).
 */
@Controller("platform/tenants")
@UseGuards(JwtAuthGuard, RolesGuard)
@RequirePlatformOwner()
export class TenantsController {
  constructor(
    private readonly tenants: TenantsService,
    private readonly stripe: StripeService,
  ) {}

  @Get()
  list() {
    return this.tenants.list();
  }

  @Post()
  create(@Body() dto: CreateTenantDto) {
    return this.tenants.create(dto);
  }

  /** Lien d’onboarding Stripe Connect pour un restaurant */
  @Post(":id/stripe-connect/link")
  async connectLink(
    @Param("id") id: string,
    @Body() dto: ConnectOnboardingDto,
  ) {
    const tenant = await this.tenants.findById(id);
    if (!tenant) {
      throw new NotFoundException("Restaurant introuvable");
    }
    return this.stripe.createConnectAccountLink(
      tenant,
      dto.refreshUrl,
      dto.returnUrl,
    );
  }

  /** Abonnement mensuel plateforme (Stripe Billing, prix créé dans le Dashboard Stripe). */
  @Post(":id/billing/checkout")
  async billingCheckout(
    @Param("id") id: string,
    @Body() dto: BillingCheckoutDto,
  ) {
    const tenant = await this.tenants.findById(id);
    if (!tenant) {
      throw new NotFoundException("Restaurant introuvable");
    }
    return this.stripe.createBillingCheckoutSession({
      tenant,
      stripePriceId: dto.stripePriceId,
      successUrl: dto.successUrl,
      cancelUrl: dto.cancelUrl,
      customerEmail: dto.customerEmail,
    });
  }
}

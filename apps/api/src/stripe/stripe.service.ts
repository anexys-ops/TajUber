import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Tenant } from "@taj/database";
import Stripe from "stripe";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private readonly stripe: Stripe | null;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const key = this.config.get<string>("STRIPE_SECRET_KEY");
    this.stripe = key ? new Stripe(key) : null;
  }

  getClient(): Stripe {
    if (!this.stripe) {
      throw new Error("STRIPE_SECRET_KEY manquant");
    }
    return this.stripe;
  }

  /**
   * Compte connecté Express : le restaurant encaisse, la plateforme prélève une commission (application_fee).
   */
  async createConnectAccountLink(
    tenant: Tenant,
    refreshUrl: string,
    returnUrl: string,
  ): Promise<{ url: string }> {
    const stripe = this.getClient();
    let accountId = tenant.stripeConnectAccountId;

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        country: "FR",
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: { tenantId: tenant.id, slug: tenant.slug },
      });
      accountId = account.id;
      await this.prisma.tenant.update({
        where: { id: tenant.id },
        data: { stripeConnectAccountId: accountId },
      });
    } else {
      await stripe.accounts.update(accountId, {
        metadata: { tenantId: tenant.id, slug: tenant.slug },
      });
    }

    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: "account_onboarding",
    });

    return { url: link.url };
  }

  /**
   * PaymentIntent sur le compte plateforme avec transfert vers le connecté + application_fee (commission).
   */
  async createPaymentIntentForOrder(params: {
    tenant: Tenant;
    amountCents: number;
    currency: string;
    orderId: string;
    customerEmail?: string;
  }): Promise<Stripe.PaymentIntent> {
    const stripe = this.getClient();
    const { tenant, amountCents, currency, orderId } = params;

    if (!tenant.stripeConnectAccountId) {
      throw new Error("Restaurant sans compte Stripe Connect");
    }
    if (!tenant.stripeConnectChargesEnabled) {
      throw new Error(
        "Paiements non activés pour ce restaurant (onboarding incomplet)",
      );
    }

    const feePercent = Number(tenant.platformFeePercent);
    const applicationFeeAmount = Math.round(amountCents * feePercent);

    return stripe.paymentIntents.create(
      {
        amount: amountCents,
        currency,
        application_fee_amount: applicationFeeAmount,
        transfer_data: {
          destination: tenant.stripeConnectAccountId,
        },
        metadata: {
          tenantId: tenant.id,
          orderId,
        },
        receipt_email: params.customerEmail,
        automatic_payment_methods: { enabled: true },
      },
      {
        idempotencyKey: `order-${orderId}-pi`,
      },
    );
  }

  /**
   * Abonnement plateforme : Checkout Session sur le compte plateforme (le restaurant paie l’abo + vous encaissez la commission sur les ventes séparément).
   */
  async createBillingCheckoutSession(params: {
    tenant: Tenant;
    stripePriceId: string;
    successUrl: string;
    cancelUrl: string;
    customerEmail?: string;
  }): Promise<{ url: string | null }> {
    const stripe = this.getClient();
    const { tenant, stripePriceId, successUrl, cancelUrl, customerEmail } =
      params;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      success_url: successUrl,
      cancel_url: cancelUrl,
      line_items: [{ price: stripePriceId, quantity: 1 }],
      customer_email: customerEmail,
      metadata: { tenantId: tenant.id, slug: tenant.slug },
      subscription_data: {
        metadata: { tenantId: tenant.id, slug: tenant.slug },
      },
    });

    return { url: session.url };
  }

  logEventPreview(type: string) {
    this.logger.log(`Webhook Stripe reçu : ${type}`);
  }
}

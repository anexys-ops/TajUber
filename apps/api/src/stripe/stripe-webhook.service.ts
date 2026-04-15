import { Injectable, Logger } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { Prisma } from "@taj/database";
import Stripe from "stripe";
import { PrismaService } from "../prisma/prisma.service";
import { StripeService } from "./stripe.service";

@Injectable()
export class StripeWebhookService {
  private readonly logger = new Logger(StripeWebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeService: StripeService,
    private readonly events: EventEmitter2,
  ) {}

  async processEvent(event: Stripe.Event): Promise<{ duplicate: boolean }> {
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.stripeWebhookEvent.create({
          data: { id: event.id, type: event.type },
        });

        switch (event.type) {
          case "account.updated": {
            const account = event.data.object as Stripe.Account;
            const tenantId = account.metadata?.tenantId;
            const data = {
              stripeConnectAccountId: account.id,
              stripeConnectChargesEnabled: account.charges_enabled ?? false,
              stripeConnectPayoutsEnabled: account.payouts_enabled ?? false,
              stripeConnectDetailsSubmitted: account.details_submitted ?? false,
            };
            if (tenantId) {
              await tx.tenant.update({
                where: { id: tenantId },
                data,
              });
            } else {
              await tx.tenant.updateMany({
                where: { stripeConnectAccountId: account.id },
                data,
              });
            }
            break;
          }
          case "checkout.session.completed": {
            const session = event.data.object as Stripe.Checkout.Session;
            if (session.mode === "subscription" && session.metadata?.tenantId) {
              await tx.tenant.update({
                where: { id: session.metadata.tenantId },
                data: {
                  subscriptionStatus: "ACTIVE",
                  stripeBillingCustomerId:
                    typeof session.customer === "string"
                      ? session.customer
                      : session.customer?.id,
                  stripeSubscriptionId:
                    typeof session.subscription === "string"
                      ? session.subscription
                      : session.subscription?.id,
                },
              });
            }
            break;
          }
          case "payment_intent.succeeded": {
            const pi = event.data.object as Stripe.PaymentIntent;
            const orderId = pi.metadata?.orderId;
            if (!orderId) {
              break;
            }
            const order = await tx.order.findFirst({
              where: { id: orderId, stripePaymentIntentId: pi.id },
            });
            if (!order) {
              break;
            }
            await tx.order.update({
              where: { id: order.id },
              data: {
                status: "PAID",
                paymentMethod: "STRIPE",
                stripeChargeId:
                  typeof pi.latest_charge === "string"
                    ? pi.latest_charge
                    : pi.latest_charge?.id,
                platformFeeCents: pi.application_fee_amount ?? undefined,
              },
            });
            await tx.orderEvent.create({
              data: {
                tenantId: order.tenantId,
                orderId: order.id,
                status: "PAID",
                source: "webhook",
              },
            });
            break;
          }
          default:
            break;
        }
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2002"
      ) {
        this.logger.verbose(`Webhook Stripe idempotent : ${event.id}`);
        return { duplicate: true };
      }
      throw e;
    }

    this.stripeService.logEventPreview(event.type);

    if (event.type === "payment_intent.succeeded") {
      const pi = event.data.object as Stripe.PaymentIntent;
      const orderId = pi.metadata?.orderId;
      if (orderId) {
        const order = await this.prisma.order.findUnique({
          where: { id: orderId },
          select: { tenantId: true },
        });
        if (order) {
          this.events.emit("order.paid", { tenantId: order.tenantId, orderId });
          this.events.emit("order.updated", {
            tenantId: order.tenantId,
            orderId,
          });
        }
      }
    }

    return { duplicate: false };
  }
}

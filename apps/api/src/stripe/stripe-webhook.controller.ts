import {
  BadRequestException,
  Controller,
  Headers,
  Post,
  Req,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { RawBodyRequest } from "@nestjs/common";
import type { Request } from "express";
import Stripe from "stripe";
import { StripeService } from "./stripe.service";
import { StripeWebhookService } from "./stripe-webhook.service";

@Controller("stripe")
export class StripeWebhookController {
  constructor(
    private readonly config: ConfigService,
    private readonly stripeService: StripeService,
    private readonly webhookService: StripeWebhookService,
  ) {}

  @Post("webhook")
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers("stripe-signature") signature: string | undefined,
  ) {
    const secret = this.config.get<string>("STRIPE_WEBHOOK_SECRET");
    if (!secret) {
      throw new BadRequestException("STRIPE_WEBHOOK_SECRET manquant");
    }

    const raw = req.body;
    if (!Buffer.isBuffer(raw)) {
      throw new BadRequestException("Corps brut requis pour la signature Stripe");
    }

    let event: Stripe.Event;
    try {
      event = this.stripeService
        .getClient()
        .webhooks.constructEvent(raw, signature ?? "", secret);
    } catch {
      throw new BadRequestException("Signature webhook invalide");
    }

    await this.webhookService.processEvent(event);
    return { received: true };
  }
}

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import type {
  OrderPaymentMethod,
  OrderStatus,
  Tenant,
  UserTenantRole,
} from "@taj/database";
import type { AccessTokenPayload } from "../auth/jwt-payload";
import { PrismaService } from "../prisma/prisma.service";
import { StripeService } from "../stripe/stripe.service";
import { canTransition } from "./order-transitions";
import type { CreateOrderDto } from "./dto/create-order.dto";

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stripe: StripeService,
    private readonly events: EventEmitter2,
  ) {}

  async createDraft(tenant: Tenant, dto: CreateOrderDto) {
    const menuItems = await this.prisma.menuItem.findMany({
      where: {
        tenantId: tenant.id,
        id: { in: dto.items.map((i) => i.menuItemId) },
        isAvailable: true,
      },
    });

    if (menuItems.length !== dto.items.length) {
      throw new BadRequestException("Un ou plusieurs articles sont invalides");
    }

    const byId = new Map(menuItems.map((m) => [m.id, m]));
    let totalCents = 0;
    const lines = dto.items.map((line) => {
      const m = byId.get(line.menuItemId)!;
      const sub = m.priceCents * line.quantity;
      totalCents += sub;
      return {
        menuItemId: m.id,
        name: m.name,
        quantity: line.quantity,
        unitCents: m.priceCents,
      };
    });

    const order = await this.prisma.order.create({
      data: {
        tenantId: tenant.id,
        status: "PENDING_PAYMENT",
        customerName: dto.customerName,
        customerPhone: dto.customerPhone,
        fulfillmentType: dto.fulfillmentType ?? "PICKUP",
        deliveryAddress: dto.deliveryAddress,
        deliveryInstructions: dto.deliveryInstructions,
        deliveryCity: dto.deliveryCity,
        deliveryPostalCode: dto.deliveryPostalCode,
        orderSource: dto.orderSource?.trim() || "pos",
        totalCents,
        currency: "eur",
        items: { create: lines },
      },
      include: { items: true },
    });

    await this.prisma.orderEvent.create({
      data: {
        tenantId: tenant.id,
        orderId: order.id,
        status: "PENDING_PAYMENT",
        source: "pos",
      },
    });

    this.events.emit("order.updated", { tenantId: tenant.id, orderId: order.id });

    return order;
  }

  async createPaymentIntent(tenant: Tenant, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, tenantId: tenant.id },
      include: { items: true },
    });
    if (!order) {
      throw new NotFoundException("Commande introuvable");
    }
    if (order.status !== "PENDING_PAYMENT" && order.status !== "DRAFT") {
      throw new BadRequestException("Commande déjà payée ou non payable");
    }

    const pi = await this.stripe.createPaymentIntentForOrder({
      tenant,
      amountCents: order.totalCents,
      currency: order.currency,
      orderId: order.id,
      customerEmail: undefined,
    });

    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        stripePaymentIntentId: pi.id,
        status: "PENDING_PAYMENT",
      },
    });

    return {
      clientSecret: pi.client_secret,
      paymentIntentId: pi.id,
      orderId: order.id,
    };
  }

  listForTenant(tenant: Tenant) {
    return this.prisma.order.findMany({
      where: { tenantId: tenant.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { items: true, events: { orderBy: { createdAt: "desc" }, take: 10 } },
    });
  }

  listForKitchen(tenant: Tenant) {
    return this.prisma.order.findMany({
      where: {
        tenantId: tenant.id,
        status: { in: ["PAID", "IN_KITCHEN", "READY"] },
      },
      orderBy: { createdAt: "asc" },
      take: 100,
      include: { items: true },
    });
  }

  async markPaid(
    tenant: Tenant,
    orderId: string,
    paymentMethod: OrderPaymentMethod,
    actor: AccessTokenPayload,
  ) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, tenantId: tenant.id },
    });
    if (!order) {
      throw new NotFoundException("Commande introuvable");
    }
    if (order.status !== "PENDING_PAYMENT") {
      throw new BadRequestException(
        "Seules les commandes en attente de paiement peuvent être encaissées ainsi",
      );
    }
    await this.updateStatus(tenant, orderId, "PAID", actor, "pos");
    return this.prisma.order.update({
      where: { id: orderId },
      data: { paymentMethod },
      include: { items: true, events: { orderBy: { createdAt: "desc" }, take: 10 } },
    });
  }

  async updateStatus(
    tenant: Tenant,
    orderId: string,
    next: OrderStatus,
    actor: AccessTokenPayload,
    source: string,
  ) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, tenantId: tenant.id },
    });
    if (!order) {
      throw new NotFoundException("Commande introuvable");
    }

    const role =
      actor.scope === "tenant" ? actor.role : undefined;
    const isPlatform =
      actor.scope === "platform" && actor.isPlatformOwner === true;

    if (
      !canTransition(order.status, next, role, isPlatform)
    ) {
      throw new ForbiddenException("Transition non autorisée");
    }

    await this.prisma.order.update({
      where: { id: order.id },
      data: { status: next },
    });

    await this.prisma.orderEvent.create({
      data: {
        tenantId: tenant.id,
        orderId: order.id,
        status: next,
        source,
      },
    });

    this.events.emit("order.updated", { tenantId: tenant.id, orderId: order.id });

    return this.prisma.order.findFirst({
      where: { id: order.id },
      include: { items: true, events: { orderBy: { createdAt: "desc" }, take: 10 } },
    });
  }
}

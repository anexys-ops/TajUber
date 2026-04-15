import { Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { PrismaService } from "../prisma/prisma.service";
import { RealtimeGateway } from "./realtime.gateway";

export type OrderUpdatedEvent = { tenantId: string; orderId: string };
export type OrderPaidEvent = { tenantId: string; orderId: string };

@Injectable()
export class RealtimeEventsListener {
  constructor(
    private readonly gateway: RealtimeGateway,
    private readonly prisma: PrismaService,
  ) {}

  @OnEvent("order.updated")
  async onOrderUpdated(evt: OrderUpdatedEvent) {
    const order = await this.prisma.order.findFirst({
      where: { id: evt.orderId, tenantId: evt.tenantId },
      include: { items: true, events: { orderBy: { createdAt: "desc" }, take: 5 } },
    });
    if (order) {
      this.gateway.emitOrderUpdated(evt.tenantId, order);
    }
  }

  @OnEvent("order.paid")
  async onOrderPaid(evt: OrderPaidEvent) {
    const order = await this.prisma.order.findFirst({
      where: { id: evt.orderId, tenantId: evt.tenantId },
      include: { items: true },
    });
    if (order) {
      this.gateway.emitPrintJob(evt.tenantId, {
        type: "ticket",
        order,
      });
    }
  }
}

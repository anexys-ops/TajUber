import { Logger } from "@nestjs/common";
import {
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import type { Server, Socket } from "socket.io";
import { AuthService } from "../auth/auth.service";
import type { AccessTokenPayload } from "../auth/jwt-payload";
import { PrismaService } from "../prisma/prisma.service";

@WebSocketGateway({
  namespace: "/realtime",
  cors: { origin: true, credentials: true },
})
export class RealtimeGateway implements OnGatewayConnection {
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly auth: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket) {
    const token =
      (client.handshake.auth?.token as string | undefined) ||
      (client.handshake.query?.token as string | undefined);
    const tenantSlug = client.handshake.query?.tenantSlug as string | undefined;
    const printAgentSecret = process.env.PRINT_AGENT_SECRET;
    const isPrintAgent =
      printAgentSecret &&
      (client.handshake.auth?.printSecret === printAgentSecret ||
        client.handshake.query?.printSecret === printAgentSecret);

    if (!tenantSlug) {
      client.disconnect(true);
      return;
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: tenantSlug.trim().toLowerCase() },
    });
    if (!tenant) {
      client.disconnect(true);
      return;
    }

    if (isPrintAgent) {
      client.join(`tenant:${tenant.id}:print`);
      this.logger.log(`Print agent connecté — ${tenant.slug}`);
      return;
    }

    if (!token) {
      client.disconnect(true);
      return;
    }

    let payload: AccessTokenPayload;
    try {
      payload = this.auth.verifyAccessToken(token);
    } catch {
      client.disconnect(true);
      return;
    }

    if (payload.scope === "tenant" && payload.tenantId !== tenant.id) {
      client.disconnect(true);
      return;
    }

    client.join(`tenant:${tenant.id}`);
    this.logger.log(`Client WS — ${tenant.slug} (${payload.role ?? "platform"})`);
  }

  emitOrderUpdated(tenantId: string, order: unknown) {
    this.server.to(`tenant:${tenantId}`).emit("orderUpdated", order);
  }

  emitPrintJob(tenantId: string, payload: unknown) {
    this.server.to(`tenant:${tenantId}:print`).emit("printJob", payload);
  }
}

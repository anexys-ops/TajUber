import {
  BadRequestException,
  Injectable,
  NestMiddleware,
  NotFoundException,
} from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";
import { PrismaService } from "../prisma/prisma.service";
import { TENANT_SLUG_HEADER } from "./tenant.constants";

/** Chemins Nest (sans préfixe `/api`). Derrière nginx, `originalUrl` peut être `/api/health` : on aligne. */
const SKIP_PREFIXES = [
  "/health",
  "/stripe/webhook",
  "/platform",
  "/auth",
  "/uploads",
];

function normalizeRequestPath(req: Request): string {
  const raw = (req.originalUrl.split("?")[0] ?? req.path).split("#")[0] ?? "/";
  let path = raw.replace(/\/+$/, "") || "/";
  if (path === "/api" || path.startsWith("/api/")) {
    path = path === "/api" ? "/" : path.slice(4) || "/";
  }
  return path;
}

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private readonly prisma: PrismaService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const path = normalizeRequestPath(req);

    if (SKIP_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))) {
      return next();
    }

    const slug = req.header(TENANT_SLUG_HEADER)?.trim();
    if (!slug) {
      throw new BadRequestException(
        `En-tête requis : ${TENANT_SLUG_HEADER} (slug du restaurant)`,
      );
    }

    const tenant = await this.prisma.tenant.findUnique({ where: { slug } });
    if (!tenant) {
      throw new NotFoundException(`Restaurant inconnu : ${slug}`);
    }

    req.tenant = tenant;
    next();
  }
}

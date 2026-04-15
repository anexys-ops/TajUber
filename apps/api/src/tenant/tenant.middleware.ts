import {
  BadRequestException,
  Injectable,
  NestMiddleware,
  NotFoundException,
} from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";
import { PrismaService } from "../prisma/prisma.service";
import { TENANT_SLUG_HEADER } from "./tenant.constants";

const SKIP_PREFIXES = [
  "/health",
  "/stripe/webhook",
  "/platform",
  "/auth",
  "/uploads",
];

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private readonly prisma: PrismaService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const path = req.originalUrl.split("?")[0] ?? req.path;

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

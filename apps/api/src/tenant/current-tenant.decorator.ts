import {
  createParamDecorator,
  ExecutionContext,
  InternalServerErrorException,
} from "@nestjs/common";
import type { Tenant } from "@taj/database";
import type { Request } from "express";

export const CurrentTenant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): Tenant => {
    const req = ctx.switchToHttp().getRequest<Request>();
    if (!req.tenant) {
      throw new InternalServerErrorException("Contexte tenant manquant");
    }
    return req.tenant;
  },
);

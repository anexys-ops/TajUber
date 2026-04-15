import type { Tenant } from "@taj/database";

declare global {
  namespace Express {
    interface Request {
      tenant?: Tenant;
    }
  }
}

export {};

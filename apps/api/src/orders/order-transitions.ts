import type { OrderStatus, UserTenantRole } from "@taj/database";

const transitions: Record<OrderStatus, OrderStatus[]> = {
  DRAFT: ["PENDING_PAYMENT", "CANCELED"],
  PENDING_PAYMENT: ["PAID", "CANCELED"],
  PAID: ["IN_KITCHEN", "CANCELED"],
  IN_KITCHEN: ["READY", "CANCELED"],
  READY: ["OUT_FOR_DELIVERY", "DELIVERED", "CANCELED"],
  OUT_FOR_DELIVERY: ["DELIVERED", "CANCELED"],
  DELIVERED: [],
  CANCELED: [],
};

const roleMatrix: Partial<
  Record<OrderStatus, Partial<Record<OrderStatus, UserTenantRole[]>>>
> = {
  PENDING_PAYMENT: {
    PAID: ["TENANT_ADMIN", "STAFF_POS"],
  },
  PAID: {
    IN_KITCHEN: ["TENANT_ADMIN", "STAFF_POS", "KITCHEN"],
  },
  IN_KITCHEN: {
    READY: ["TENANT_ADMIN", "KITCHEN"],
  },
  READY: {
    OUT_FOR_DELIVERY: ["TENANT_ADMIN", "STAFF_POS", "DRIVER"],
    DELIVERED: ["TENANT_ADMIN", "STAFF_POS"],
  },
  OUT_FOR_DELIVERY: {
    DELIVERED: ["TENANT_ADMIN", "DRIVER"],
  },
};

export function canTransition(
  from: OrderStatus,
  to: OrderStatus,
  role: UserTenantRole | undefined,
  isPlatformOwner: boolean,
): boolean {
  const next = transitions[from];
  if (!next?.includes(to)) {
    return false;
  }
  if (isPlatformOwner) {
    return true;
  }
  if (to === "CANCELED") {
    return (
      role === "TENANT_ADMIN" ||
      role === "STAFF_POS" ||
      role === "KITCHEN"
    );
  }
  if (!role) {
    return false;
  }
  const allowed = roleMatrix[from]?.[to];
  if (!allowed) {
    return role === "TENANT_ADMIN";
  }
  return allowed.includes(role);
}

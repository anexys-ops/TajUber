/** Contrats partagés front / mobile — alignés sur l’API Nest */

export type OrderStatus =
  | "DRAFT"
  | "PENDING_PAYMENT"
  | "PAID"
  | "IN_KITCHEN"
  | "READY"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELED";

export type UserTenantRole =
  | "PLATFORM_OWNER"
  | "TENANT_ADMIN"
  | "STAFF_POS"
  | "KITCHEN"
  | "DRIVER"
  | "CUSTOMER";

export const TENANT_SLUG_HEADER = "x-tenant-slug";

export type MenuItemDto = {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  priceCents: number;
  photoUrl: string | null;
  isAvailable: boolean;
  sortOrder: number;
};

export type OrderItemDto = {
  id: string;
  orderId: string;
  menuItemId: string | null;
  name: string;
  quantity: number;
  unitCents: number;
};

export type OrderDto = {
  id: string;
  tenantId: string;
  status: OrderStatus;
  customerName: string | null;
  customerPhone: string | null;
  totalCents: number;
  currency: string;
  items?: OrderItemDto[];
};

export type JwtPayload = {
  sub: string;
  email: string;
  scope: "platform" | "tenant";
  tenantId?: string;
  role?: UserTenantRole;
};

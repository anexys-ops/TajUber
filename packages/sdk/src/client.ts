import { TENANT_SLUG_HEADER, type MenuItemDto, type OrderDto } from "./types";

export type TajClientOptions = {
  baseUrl: string;
  tenantSlug?: string;
  getAccessToken?: () => string | null | Promise<string | null>;
};

export class TajApiClient {
  constructor(private readonly opts: TajClientOptions) {}

  private async headers(init?: HeadersInit): Promise<Headers> {
    const h = new Headers(init);
    if (this.opts.tenantSlug) {
      h.set(TENANT_SLUG_HEADER, this.opts.tenantSlug);
    }
    const token = await this.opts.getAccessToken?.();
    if (token) {
      h.set("Authorization", `Bearer ${token}`);
    }
    return h;
  }

  private async request<T>(
    path: string,
    init?: RequestInit,
  ): Promise<T> {
    const url = `${this.opts.baseUrl.replace(/\/$/, "")}${path}`;
    const res = await fetch(url, {
      ...init,
      headers: await this.headers(init?.headers as HeadersInit),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`API ${res.status}: ${text}`);
    }
    return (await res.json()) as T;
  }

  health() {
    return this.request<{ ok: boolean }>("/health");
  }

  catalogMenuItems() {
    return this.request<MenuItemDto[]>("/catalog/menu-items");
  }

  ordersList() {
    return this.request<OrderDto[]>("/orders");
  }
}

import { enqueue, OfflineQueuedError } from "@/lib/offline-queue";
import type { AppSettings, Bootstrap, Call, Customer, Order } from "@/types/crm";

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `http_${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

function canQueue(url: string) {
  return !url.startsWith("/api/account/");
}

async function send<T>(url: string, init: RequestInit, body?: unknown): Promise<T> {
  const offline = typeof navigator !== "undefined" && navigator.onLine === false;
  if (offline) {
    if (!canQueue(url)) throw new Error("offline");
    await enqueue({ method: init.method || "POST", url, body });
    throw new OfflineQueuedError();
  }
  try {
    const res = await fetch(url, {
      ...init,
      headers: body ? { "Content-Type": "application/json", ...(init.headers || {}) } : init.headers,
      body: body ? JSON.stringify(body) : init.body,
    });
    return json<T>(res);
  } catch (error) {
    if (error instanceof Error && (error.message.startsWith("http_") || error.message === "offline")) {
      throw error;
    }
    if (!canQueue(url)) throw error;
    await enqueue({ method: init.method || "POST", url, body });
    throw new OfflineQueuedError();
  }
}

export const crmClient = {
  bootstrap: () => fetch("/api/bootstrap").then((r) => json<Bootstrap>(r)),

  getCustomer: (uuid: string) => fetch(`/api/customers/${uuid}`).then((r) => json<Customer>(r)),

  listCalls: (cursor?: string) =>
    fetch(cursor ? `/api/calls?cursor=${encodeURIComponent(cursor)}` : "/api/calls").then((r) =>
      json<{ calls: Call[]; nextCursor: string | null }>(r),
    ),

  saveSettings: (patch: Partial<AppSettings>) =>
    send<AppSettings>("/api/settings", { method: "PATCH" }, patch),

  createCustomer: (payload: Partial<Customer>) =>
    send<Customer>("/api/customers", { method: "POST" }, payload),

  updateCustomer: (uuid: string, payload: Partial<Customer>) => {
    const { orders: _orders, ...rest } = payload;
    return send<Customer>(`/api/customers/${uuid}`, { method: "PATCH" }, rest);
  },

  deleteCustomer: (uuid: string) =>
    send<void>(`/api/customers/${uuid}`, { method: "DELETE" }),

  saveOrder: (customerId: string, order: Order) =>
    isUuidLike(order.id)
      ? send<Order>(`/api/orders/${order.id}`, { method: "PATCH" }, { ...order, customerId })
      : send<Order>(`/api/customers/${customerId}/orders`, { method: "POST" }, order),

  deleteOrder: (uuid: string) =>
    send<void>(`/api/orders/${uuid}`, { method: "DELETE" }),

  createCall: (payload: Partial<Call> & { customerId: string; summary: string }) =>
    send<Call>("/api/calls", { method: "POST" }, payload),

  updateCall: (uuid: string, payload: Partial<Call>) =>
    send<Call>(`/api/calls/${uuid}`, { method: "PATCH" }, payload),

  deleteCall: (uuid: string) =>
    send<void>(`/api/calls/${uuid}`, { method: "DELETE" }),

  addNote: (uuid: string, text: string, by?: string) =>
    send<Call>(`/api/calls/${uuid}/notes`, { method: "POST" }, { text, by }),

  changePassword: (current: string, next: string) =>
    send<{ ok: boolean }>("/api/account/password", { method: "POST" }, { current, next }),

  inviteUser: (payload: { email: string; name: string; password: string }) =>
    send<{ uuid: string; email: string; name: string }>("/api/account/users", { method: "POST" }, payload),

  applyOutreach: (uuid: string, payload: { action: "send" | "confirmed" | "declined" | "noreply" | "done"; visitAt?: number }) =>
    send<{ customer: Customer; calls: Call[] }>(`/api/customers/${uuid}/outreach`, { method: "POST" }, payload),
};

function isUuidLike(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

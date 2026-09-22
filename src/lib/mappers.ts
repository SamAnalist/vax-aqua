import type { Call, Customer, Order, Outreach } from "@/types/crm";
import { toMs } from "@/lib/dates";
import type {
  Call as DbCall,
  CallNote as DbNote,
  Customer as DbCustomer,
  Order as DbOrder,
  OrderLine as DbLine,
  Region,
} from "@prisma/client";

type DbCustomerFull = DbCustomer & {
  region: Region;
  orders: (DbOrder & { lines: DbLine[] })[];
  _count?: { orders: number };
};

type DbCallFull = DbCall & {
  notes: DbNote[];
  customer: { uuid: string };
};

export function toClientCustomer(c: DbCustomerFull): Customer {
  let outreach: Outreach | null = null;
  if (c.outreachStatus && c.outreachSentAt) {
    outreach = {
      sentAt: toMs(c.outreachSentAt),
      status: c.outreachStatus as Outreach["status"],
      visitAt: toMs(c.outreachVisitAt),
      confirmedAt: c.outreachConfirmedAt ? toMs(c.outreachConfirmedAt) : undefined,
    };
  }

  return {
    id: c.uuid,
    regionId: c.region.slug,
    name: c.name,
    type: c.type,
    place: c.place,
    contactName: c.contactName,
    role: c.role,
    phone: c.phone,
    phone2: c.phone2,
    email: c.email,
    address: c.address,
    products: c.products,
    annualVol: c.annualVol,
    tier: c.tier,
    status: c.status,
    since: c.since,
    terms: c.terms,
    channel: c.channel || "direct",
    openQuote: c.openQuote,
    openQuoteAt: toMs(c.openQuoteAt),
    outreach,
    lastVisitAt: toMs(c.lastVisitAt),
    seminar: {
      state: c.seminarState,
      topics: c.seminarTopics,
      seats: c.seminarSeats,
      note: c.seminarNote,
      at: toMs(c.seminarAt),
    },
    orders: c.orders
      .map(toClientOrder)
      .sort((a, b) => b.at - a.at),
    orderCount: c._count?.orders ?? c.orders.length,
    memo: c.memo,
  };
}

export function toClientOrder(o: DbOrder & { lines: DbLine[] }): Order {
  return {
    id: o.uuid,
    num: o.num,
    at: toMs(o.at),
    status: o.status,
    due: toMs(o.due),
    updatedAt: toMs(o.updatedAt),
    note: o.note,
    lines: o.lines.map((l) => ({
      id: l.uuid,
      item: l.item,
      spec: l.spec,
      qty: l.qty,
      unit: l.unit,
      price: l.price,
    })),
  };
}

export function toClientCall(k: DbCallFull): Call {
  return {
    id: k.uuid,
    customerId: k.customer.uuid,
    at: toMs(k.at),
    kind: k.kind,
    outcome: k.outcome,
    summary: k.summary,
    minutes: k.minutes,
    nextAction: k.nextAction,
    nextAt: toMs(k.nextAt),
    nextDone: k.nextDone,
    notes: k.notes.map((n) => ({
      id: n.uuid,
      text: n.text,
      at: toMs(n.at),
      by: n.by,
    })),
  };
}

export const customerInclude = {
  region: true,
  orders: { include: { lines: true }, orderBy: { at: "desc" as const } },
};

export const customerListInclude = {
  region: true,
  _count: { select: { orders: true } },
  orders: { include: { lines: true }, orderBy: { at: "desc" as const }, take: 8 },
};

export const callInclude = {
  notes: { orderBy: { at: "asc" as const } },
  customer: { select: { uuid: true } },
};

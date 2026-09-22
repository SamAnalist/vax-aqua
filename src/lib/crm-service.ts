import bcrypt from "bcryptjs";
import { writeAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { isUuid, toDate } from "@/lib/dates";
import { AuthError, ConflictError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { callInclude, customerInclude, customerListInclude, toClientCall, toClientCustomer, toClientOrder } from "@/lib/mappers";
import { queueKeyFor } from "@/lib/queue-key";
import type { AppSettings, Call, Customer, Order } from "@/types/crm";
import type { User } from "@prisma/client";

const DEFAULT_TPL = `היי {קשר}, מדבר {אני} מ{חברה}.
עברו {ימים} יום מאז ששוחחנו ואני מתכנן סבב באזור {יישוב}.
אפשר לקפוץ אליך ב{יום}, {תאריך}, בסביבות {שעה}?
תאשר לי ואגיע עם דוגמאות של {מוצר}.`;

function orgScope(user: User) {
  return { organizationId: user.organizationId };
}

async function findOwnedCustomer(user: User, uuid: string) {
  if (!isUuid(uuid)) throw new NotFoundError("customer");
  const customer = await prisma.customer.findFirst({
    where: { uuid, ...orgScope(user) },
    include: customerInclude,
  });
  if (!customer) throw new NotFoundError("customer");
  return customer;
}

async function findOwnedCall(user: User, uuid: string) {
  if (!isUuid(uuid)) throw new NotFoundError("call");
  const call = await prisma.call.findFirst({
    where: { uuid, customer: orgScope(user) },
    include: callInclude,
  });
  if (!call) throw new NotFoundError("call");
  return call;
}

const BOOTSTRAP_CALLS = 400;

export async function loadBootstrap(user: User & { settings: { silenceDays: number; outreachTpl: string; visitHour: number } | null }) {
  const scope = orgScope(user);
  const [customers, calls, callsTotal] = await Promise.all([
    prisma.customer.findMany({
      where: scope,
      include: customerListInclude,
      orderBy: { name: "asc" },
    }),
    prisma.call.findMany({
      where: { customer: scope },
      include: callInclude,
      orderBy: [{ at: "desc" }, { id: "desc" }],
      take: BOOTSTRAP_CALLS,
    }),
    prisma.call.count({ where: { customer: scope } }),
  ]);

  return {
    user: {
      uuid: user.uuid,
      email: user.email,
      name: user.name,
      companyName: user.companyName,
      role: user.role,
    },
    settings: {
      silenceDays: user.settings?.silenceDays ?? 14,
      userName: user.name,
      companyName: user.companyName,
      outreachTpl: user.settings?.outreachTpl || DEFAULT_TPL,
      visitHour: user.settings?.visitHour ?? 10,
    },
    customers: customers.map(toClientCustomer),
    calls: calls.map(toClientCall),
    callsTruncated: callsTotal > calls.length,
    callsTotal,
    queueKey: queueKeyFor(user.uuid),
  };
}

export async function getCustomer(user: User, uuid: string) {
  return toClientCustomer(await findOwnedCustomer(user, uuid));
}

export async function listCalls(user: User, cursor?: string, take = 200) {
  const scope = { customer: orgScope(user) };
  let cursorFilter: { at: Date; id: number } | null = null;
  if (cursor && isUuid(cursor)) {
    const mark = await prisma.call.findFirst({
      where: { uuid: cursor, ...scope },
      select: { at: true, id: true },
    });
    if (mark) cursorFilter = mark;
  }

  const rows = await prisma.call.findMany({
    where: cursorFilter
      ? {
          ...scope,
          OR: [
            { at: { lt: cursorFilter.at } },
            { at: cursorFilter.at, id: { lt: cursorFilter.id } },
          ],
        }
      : scope,
    include: callInclude,
    orderBy: [{ at: "desc" }, { id: "desc" }],
    take: take + 1,
  });
  const extra = rows.length > take;
  const page = extra ? rows.slice(0, take) : rows;
  return {
    calls: page.map(toClientCall),
    nextCursor: extra ? page[page.length - 1].uuid : null,
  };
}

export async function updateSettings(user: User, patch: Partial<AppSettings>) {
  const settings = await prisma.settings.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      silenceDays: patch.silenceDays ?? 14,
      outreachTpl: patch.outreachTpl ?? DEFAULT_TPL,
      visitHour: patch.visitHour ?? 10,
    },
    update: {
      ...(patch.silenceDays != null ? { silenceDays: patch.silenceDays } : {}),
      ...(patch.outreachTpl != null ? { outreachTpl: patch.outreachTpl } : {}),
      ...(patch.visitHour != null ? { visitHour: patch.visitHour } : {}),
    },
  });

  const nextUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      ...(patch.userName != null ? { name: patch.userName } : {}),
      ...(patch.companyName != null ? { companyName: patch.companyName } : {}),
    },
  });

  return {
    silenceDays: settings.silenceDays,
    userName: nextUser.name,
    companyName: nextUser.companyName,
    outreachTpl: settings.outreachTpl || DEFAULT_TPL,
    visitHour: settings.visitHour,
  };
}

async function resolveRegion(regionSlug: string) {
  const region = await prisma.region.findUnique({ where: { slug: regionSlug } });
  if (!region) throw new NotFoundError("region");
  return region;
}

function customerScalars(input: Partial<Customer>, regionId?: number) {
  return {
    ...(regionId != null ? { regionId } : {}),
    ...(input.name != null ? { name: input.name } : {}),
    ...(input.type != null ? { type: input.type } : {}),
    ...(input.place != null ? { place: input.place } : {}),
    ...(input.contactName != null ? { contactName: input.contactName } : {}),
    ...(input.role != null ? { role: input.role } : {}),
    ...(input.phone != null ? { phone: input.phone } : {}),
    ...(input.phone2 != null ? { phone2: input.phone2 } : {}),
    ...(input.email != null ? { email: input.email } : {}),
    ...(input.address != null ? { address: input.address } : {}),
    ...(input.products != null ? { products: input.products } : {}),
    ...(input.annualVol != null ? { annualVol: Number(input.annualVol) || 0 } : {}),
    ...(input.tier != null ? { tier: input.tier } : {}),
    ...(input.status != null ? { status: input.status } : {}),
    ...(input.since != null ? { since: Number(input.since) || 0 } : {}),
    ...(input.terms != null ? { terms: input.terms } : {}),
    ...(input.channel != null ? { channel: input.channel } : {}),
    ...(input.openQuote != null ? { openQuote: Number(input.openQuote) || 0 } : {}),
    ...(input.openQuoteAt != null ? { openQuoteAt: toDate(input.openQuoteAt) } : {}),
    ...(input.lastVisitAt != null ? { lastVisitAt: toDate(input.lastVisitAt) } : {}),
    ...(input.memo != null ? { memo: input.memo } : {}),
    ...(input.outreach === null
      ? {
          outreachStatus: null,
          outreachSentAt: null,
          outreachVisitAt: null,
          outreachConfirmedAt: null,
        }
      : input.outreach
        ? {
            outreachStatus: input.outreach.status,
            outreachSentAt: toDate(input.outreach.sentAt),
            outreachVisitAt: toDate(input.outreach.visitAt),
            outreachConfirmedAt: toDate(input.outreach.confirmedAt),
          }
        : {}),
    ...(input.seminar
      ? {
          seminarState: input.seminar.state,
          seminarTopics: input.seminar.topics || [],
          seminarSeats: Number(input.seminar.seats) || 0,
          seminarNote: input.seminar.note || "",
          seminarAt: toDate(input.seminar.at),
        }
      : {}),
  };
}

function orderLines(order: Order) {
  return (order.lines || []).map((l) => {
    const qty = Number(l.qty);
    const price = Number(l.price);
    if (!Number.isFinite(qty) || !Number.isFinite(price) || qty < 0 || price < 0) {
      throw new Error("invalid_order_line");
    }
    return {
      uuid: isUuid(l.id) ? l.id : undefined,
      item: l.item,
      spec: l.spec || "",
      qty: Math.min(Math.trunc(qty), 2_000_000_000),
      unit: l.unit || "יח׳",
      price: Math.min(Math.trunc(price), 2_000_000_000),
    };
  });
}

export async function createCustomer(user: User, input: Partial<Customer>) {
  const region = await resolveRegion(input.regionId || "arava");
  const created = await prisma.customer.create({
    data: {
      userId: user.id,
      organizationId: user.organizationId,
      regionId: region.id,
      name: (input.name || "").trim(),
      type: input.type || "משק חקלאי",
      place: input.place || region.name,
      contactName: input.contactName || "—",
      role: input.role || "מנהל מים",
      phone: input.phone || "",
      phone2: input.phone2 || "",
      email: input.email || "",
      address: input.address || input.place || region.name,
      products: input.products || [],
      annualVol: Number(input.annualVol) || 0,
      tier: input.tier || "C",
      status: input.status || "lead",
      since: Number(input.since) || new Date().getFullYear(),
      terms: input.terms || "שוטף+30",
      channel: input.channel || "direct",
      memo: input.memo || "",
    },
    include: customerInclude,
  });
  await writeAudit(user.id, "create", "customer", created.uuid, { name: created.name });
  return toClientCustomer(created);
}

export async function updateCustomer(user: User, uuid: string, input: Partial<Customer>) {
  const current = await findOwnedCustomer(user, uuid);
  const region = input.regionId ? await resolveRegion(input.regionId) : current.region;
  await prisma.$transaction(async (tx) => {
    await tx.customer.update({
      where: { id: current.id },
      data: customerScalars(input, region.id),
    });
  });
  await writeAudit(user.id, "update", "customer", uuid);
  const next = await findOwnedCustomer(user, uuid);
  return toClientCustomer(next);
}

export async function deleteCustomer(user: User, uuid: string) {
  const current = await findOwnedCustomer(user, uuid);
  await prisma.customer.delete({ where: { id: current.id } });
  await writeAudit(user.id, "delete", "customer", uuid, { name: current.name });
}

export async function upsertOrder(user: User, customerUuid: string, order: Order) {
  const customer = await findOwnedCustomer(user, customerUuid);
  const lines = orderLines(order);

  const saved = await prisma.$transaction(async (tx) => {
    if (isUuid(order.id)) {
      const existing = await tx.order.findFirst({
        where: { uuid: order.id, customerId: customer.id },
      });
      if (!existing) throw new NotFoundError("order");
      if (order.updatedAt && existing.updatedAt.getTime() !== order.updatedAt) {
        throw new ConflictError("order_conflict");
      }
      const keep = lines.map((l) => l.uuid).filter((id): id is string => Boolean(id));
      await tx.orderLine.deleteMany({
        where: keep.length
          ? { orderId: existing.id, uuid: { notIn: keep } }
          : { orderId: existing.id },
      });
      for (const line of lines) {
        const fields = { item: line.item, spec: line.spec, qty: line.qty, unit: line.unit, price: line.price };
        if (line.uuid) {
          const hit = await tx.orderLine.findFirst({
            where: { orderId: existing.id, uuid: line.uuid },
          });
          if (hit) {
            await tx.orderLine.update({ where: { id: hit.id }, data: fields });
            continue;
          }
        }
        await tx.orderLine.create({
          data: { orderId: existing.id, ...fields, ...(line.uuid ? { uuid: line.uuid } : {}) },
        });
      }
      return tx.order.update({
        where: { id: existing.id },
        data: {
          num: order.num,
          at: toDate(order.at) || new Date(),
          status: order.status,
          due: toDate(order.due),
          note: order.note || "",
        },
        include: { lines: true },
      });
    }
    return tx.order.create({
      data: {
        customerId: customer.id,
        num: order.num,
        at: toDate(order.at) || new Date(),
        status: order.status,
        due: toDate(order.due),
        note: order.note || "",
        lines: { create: lines.map(({ uuid: _uuid, ...rest }) => rest) },
      },
      include: { lines: true },
    });
  });
  await writeAudit(user.id, isUuid(order.id) ? "update" : "create", "order", saved.uuid, {
    customerUuid,
    num: saved.num,
  });
  return toClientOrder(saved);
}

export async function deleteOrder(user: User, uuid: string) {
  if (!isUuid(uuid)) throw new NotFoundError("order");
  const existing = await prisma.order.findFirst({
    where: { uuid, customer: orgScope(user) },
  });
  if (!existing) throw new NotFoundError("order");
  await prisma.order.delete({ where: { id: existing.id } });
  await writeAudit(user.id, "delete", "order", uuid);
}

export async function changePassword(user: User, current: string, next: string) {
  const ok = await bcrypt.compare(current, user.passwordHash);
  if (!ok) throw new AuthError("invalid_password");
  const passwordHash = await bcrypt.hash(next, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, tokenVersion: { increment: 1 } },
  });
  await writeAudit(user.id, "update", "password", user.uuid);
}

export async function inviteUser(actor: User, input: { email: string; name: string; password: string }) {
  if (actor.role !== "admin") throw new ForbiddenError();
  const exists = await prisma.user.findUnique({ where: { email: input.email } });
  if (exists) throw new ConflictError("email_taken");
  const passwordHash = await bcrypt.hash(input.password, 12);
  const actorSettings = await prisma.settings.findUnique({ where: { userId: actor.id } });
  const created = await prisma.user.create({
    data: {
      email: input.email,
      name: input.name,
      passwordHash,
      companyName: actor.companyName,
      role: "member",
      organizationId: actor.organizationId,
      settings: {
        create: {
          silenceDays: actorSettings?.silenceDays ?? 14,
          visitHour: actorSettings?.visitHour ?? 10,
          outreachTpl: actorSettings?.outreachTpl ?? "",
        },
      },
    },
  });
  await writeAudit(actor.id, "create", "user", created.uuid, { email: created.email });
  return { uuid: created.uuid, email: created.email, name: created.name };
}

export async function createCall(user: User, input: Partial<Call> & { customerId: string }) {
  const customer = await findOwnedCustomer(user, input.customerId);
  const created = await prisma.call.create({
    data: {
      customerId: customer.id,
      at: toDate(input.at) || new Date(),
      kind: input.kind || "phone",
      outcome: input.outcome || "follow",
      summary: (input.summary || "").trim(),
      minutes: Number(input.minutes) || 0,
      nextAction: input.nextAction || "",
      nextAt: input.nextAction ? toDate(input.nextAt) : null,
      nextDone: Boolean(input.nextDone),
    },
    include: callInclude,
  });
  await writeAudit(user.id, "create", "call", created.uuid, { customerId: input.customerId });
  return toClientCall(created);
}

export async function updateCall(user: User, uuid: string, input: Partial<Call>) {
  const current = await findOwnedCall(user, uuid);
  const updated = await prisma.call.update({
    where: { id: current.id },
    data: {
      ...(input.at != null ? { at: toDate(input.at) || current.at } : {}),
      ...(input.kind != null ? { kind: input.kind } : {}),
      ...(input.outcome != null ? { outcome: input.outcome } : {}),
      ...(input.summary != null ? { summary: input.summary } : {}),
      ...(input.minutes != null ? { minutes: Number(input.minutes) || 0 } : {}),
      ...(input.nextAction != null ? { nextAction: input.nextAction } : {}),
      ...(input.nextAt != null ? { nextAt: toDate(input.nextAt) } : {}),
      ...(input.nextDone != null ? { nextDone: input.nextDone } : {}),
    },
    include: callInclude,
  });
  await writeAudit(user.id, "update", "call", uuid);
  return toClientCall(updated);
}

export async function deleteCall(user: User, uuid: string) {
  const current = await findOwnedCall(user, uuid);
  await prisma.call.delete({ where: { id: current.id } });
  await writeAudit(user.id, "delete", "call", uuid);
}

export async function addCallNote(user: User, uuid: string, text: string, by: string) {
  const current = await findOwnedCall(user, uuid);
  await prisma.callNote.create({
    data: {
      callId: current.id,
      text: text.trim(),
      by: by || user.name,
    },
  });
  const next = await findOwnedCall(user, uuid);
  return toClientCall(next);
}

export async function applyOutreach(
  user: User,
  uuid: string,
  input: { action: "send" | "confirmed" | "declined" | "noreply" | "done"; visitAt?: number },
) {
  const customer = await findOwnedCustomer(user, uuid);
  const now = new Date();
  const visitAt = input.action === "send" ? toDate(input.visitAt) : customer.outreachVisitAt;

  await prisma.$transaction(async (tx) => {
    if (input.action === "send") {
      await tx.customer.update({
        where: { id: customer.id },
        data: {
          outreachStatus: "sent",
          outreachSentAt: now,
          outreachVisitAt: visitAt,
          outreachConfirmedAt: null,
        },
      });
      await tx.call.create({
        data: {
          customerId: customer.id,
          at: now,
          kind: "wa",
          outcome: "follow",
          summary: `נשלחה בקשת אישור לביקור ב־${visitAt ? visitAt.toLocaleDateString("he-IL") : ""}`,
          minutes: 1,
          nextAction: "לוודא שהלקוח אישר את הביקור",
          nextAt: visitAt,
          nextDone: false,
        },
      });
      return;
    }

    if (input.action === "done") {
      await tx.customer.update({
        where: { id: customer.id },
        data: {
          outreachStatus: null,
          outreachSentAt: null,
          outreachVisitAt: null,
          outreachConfirmedAt: null,
        },
      });
      return;
    }

    if (input.action === "noreply") {
      await tx.customer.update({
        where: { id: customer.id },
        data: { outreachStatus: "noreply" },
      });
      return;
    }

    await tx.customer.update({
      where: { id: customer.id },
      data: {
        outreachStatus: input.action,
        outreachConfirmedAt: input.action === "confirmed" ? now : customer.outreachConfirmedAt,
      },
    });

    if (customer.outreachVisitAt) {
      await tx.call.updateMany({
        where: {
          customerId: customer.id,
          nextDone: false,
          nextAction: { not: "" },
          nextAt: customer.outreachVisitAt,
        },
        data: { nextDone: true },
      });
    }

    await tx.call.create({
      data: {
        customerId: customer.id,
        at: now,
        kind: "wa",
        outcome: input.action === "confirmed" ? "follow" : "cold",
        summary:
          input.action === "confirmed"
            ? `אישר ביקור ל־${customer.outreachVisitAt ? customer.outreachVisitAt.toLocaleDateString("he-IL") : ""}`
            : "לא זמין לביקור במועד שהוצע",
        minutes: 1,
        nextAction: input.action === "confirmed" ? "ביקור בשטח" : "",
        nextAt: input.action === "confirmed" ? customer.outreachVisitAt : null,
        nextDone: false,
      },
    });
  });

  await writeAudit(user.id, "update", "outreach", uuid, { action: input.action });
  const [next, calls] = await Promise.all([
    findOwnedCustomer(user, uuid),
    prisma.call.findMany({
      where: { customerId: customer.id },
      include: callInclude,
      orderBy: { at: "desc" },
      take: 200,
    }),
  ]);
  return { customer: toClientCustomer(next), calls: calls.map(toClientCall) };
}

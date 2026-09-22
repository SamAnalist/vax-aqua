import { z } from "zod";

export const CALL_KINDS = ["phone", "wa", "visit", "meet", "mail"] as const;
export const OUTCOMES = ["order", "quote", "follow", "noans", "service", "cold"] as const;
export const STATUSES = ["active", "warm", "dormant", "lead"] as const;
export const TIERS = ["A", "B", "C"] as const;
export const ORDER_STATUSES = ["draft", "sent", "approved", "delivered", "cancelled"] as const;
export const SEMINAR_STATES = ["none", "interested", "maybe", "declined", "registered"] as const;
export const PAY_CHANNELS = ["direct", "mashbir", "amir", "tzinrot", "mendel", "garin"] as const;

export const passwordSchema = z
  .string()
  .min(12, "password_too_short")
  .max(128)
  .regex(/[A-Za-z]/, "password_needs_letter")
  .regex(/[0-9]/, "password_needs_number");

export const emailSchema = z.string().trim().toLowerCase().email().max(120);

export const customerCreateSchema = z.object({
  regionId: z.string().min(1).max(40),
  name: z.string().trim().min(1).max(160),
  type: z.string().max(80).optional(),
  place: z.string().max(120).optional(),
  contactName: z.string().max(120).optional(),
  role: z.string().max(80).optional(),
  phone: z.string().max(40).optional(),
  email: z.union([emailSchema, z.literal("")]).optional(),
  status: z.enum(STATUSES).optional(),
  channel: z.enum(PAY_CHANNELS).optional(),
});

export const outreachSchema = z.object({
  sentAt: z.number(),
  status: z.enum(["sent", "confirmed", "declined", "noreply"]),
  visitAt: z.number(),
  confirmedAt: z.number().optional(),
}).nullable();

export const seminarSchema = z.object({
  state: z.enum(SEMINAR_STATES),
  topics: z.array(z.string().max(80)).max(12),
  seats: z.number().int().min(0).max(99),
  note: z.string().max(1000),
  at: z.number(),
});

export const customerPatchSchema = z.object({
  regionId: z.string().min(1).max(40).optional(),
  name: z.string().trim().min(1).max(160).optional(),
  type: z.string().max(80).optional(),
  place: z.string().max(120).optional(),
  contactName: z.string().max(120).optional(),
  role: z.string().max(80).optional(),
  phone: z.string().max(40).optional(),
  phone2: z.string().max(40).optional(),
  email: z.union([emailSchema, z.literal("")]).optional(),
  address: z.string().max(200).optional(),
  products: z.array(z.string().max(80)).max(30).optional(),
  annualVol: z.number().int().min(0).max(1_000_000_000).optional(),
  tier: z.enum(TIERS).optional(),
  status: z.enum(STATUSES).optional(),
  since: z.number().int().min(0).max(2100).optional(),
  terms: z.string().max(80).optional(),
  channel: z.enum(PAY_CHANNELS).optional(),
  openQuote: z.number().int().min(0).max(1_000_000_000).optional(),
  openQuoteAt: z.number().optional(),
  lastVisitAt: z.number().optional(),
  memo: z.string().max(4000).optional(),
  outreach: outreachSchema.optional(),
  seminar: seminarSchema.optional(),
});

const moneyInt = z.coerce.number().int().min(0).max(2_000_000_000);

export const orderLineSchema = z.object({
  id: z.string().max(80),
  item: z.string().min(1).max(80),
  spec: z.string().max(120).optional(),
  qty: moneyInt,
  unit: z.string().max(20),
  price: moneyInt,
});

export const outreachActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("send"), visitAt: z.number() }),
  z.object({ action: z.enum(["confirmed", "declined", "noreply", "done"]) }),
]);

export const orderSchema = z.object({
  id: z.string().max(80).optional(),
  num: z.string().min(1).max(40),
  at: z.number(),
  status: z.enum(ORDER_STATUSES),
  due: z.number(),
  updatedAt: z.number().optional(),
  note: z.string().max(1000).optional(),
  lines: z.array(orderLineSchema).min(1).max(40),
});

export const callCreateSchema = z.object({
  customerId: z.string().uuid(),
  at: z.number().optional(),
  kind: z.enum(CALL_KINDS).optional(),
  outcome: z.enum(OUTCOMES).optional(),
  summary: z.string().trim().min(1).max(4000),
  minutes: z.union([z.number(), z.string()]).optional(),
  nextAction: z.string().max(240).optional(),
  nextAt: z.number().optional(),
  nextDone: z.boolean().optional(),
});

export const callPatchSchema = z.object({
  nextDone: z.boolean().optional(),
  nextAction: z.string().max(240).optional(),
  nextAt: z.number().optional(),
  summary: z.string().min(1).max(4000).optional(),
  outcome: z.enum(OUTCOMES).optional(),
  kind: z.enum(CALL_KINDS).optional(),
  minutes: z.number().int().min(0).max(24 * 60).optional(),
  at: z.number().optional(),
});

export const noteSchema = z.object({
  text: z.string().trim().min(1).max(2000),
  by: z.string().max(80).optional(),
});

export const settingsSchema = z.object({
  silenceDays: z.number().int().min(1).max(365).optional(),
  userName: z.string().min(1).max(80).optional(),
  companyName: z.string().min(1).max(120).optional(),
  outreachTpl: z.string().max(2000).optional(),
  visitHour: z.number().int().min(6).max(20).optional(),
});

export const passwordChangeSchema = z.object({
  current: z.string().min(1).max(128),
  next: passwordSchema,
});

export const inviteUserSchema = z.object({
  email: emailSchema,
  name: z.string().trim().min(1).max(80),
  password: passwordSchema,
});

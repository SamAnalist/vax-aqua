import { describe, expect, it } from "vitest";
import { customerPatchSchema, orderLineSchema, passwordSchema } from "./validation";

describe("passwordSchema", () => {
  it("rejects short or letter-only secrets", () => {
    expect(passwordSchema.safeParse("short1A").success).toBe(false);
    expect(passwordSchema.safeParse("abcdefghijkl").success).toBe(false);
    expect(passwordSchema.safeParse("123456789012").success).toBe(false);
  });

  it("accepts a long mixed password", () => {
    expect(passwordSchema.safeParse("FieldCrm2026!x").success).toBe(true);
  });
});

describe("customerPatchSchema", () => {
  it("rejects orders so a profile save cannot wipe them", () => {
    const parsed = customerPatchSchema.safeParse({
      memo: "ok",
      orders: [{ id: "x", num: "1", at: 1, status: "draft", due: 1, lines: [] }],
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect("orders" in parsed.data).toBe(false);
  });

  it("rejects invalid status and email", () => {
    expect(customerPatchSchema.safeParse({ status: "nope" }).success).toBe(false);
    expect(customerPatchSchema.safeParse({ email: "not-mail" }).success).toBe(false);
  });

  it("accepts a purchase channel and rejects unknown ones", () => {
    expect(customerPatchSchema.safeParse({ channel: "mashbir" }).success).toBe(true);
    expect(customerPatchSchema.safeParse({ channel: "unknown" }).success).toBe(false);
  });
});

describe("orderLineSchema", () => {
  it("rejects overflow prices and negative qty", () => {
    expect(orderLineSchema.safeParse({
      id: "l1", item: "pipe", qty: 1e18, unit: "m", price: 10,
    }).success).toBe(false);
    expect(orderLineSchema.safeParse({
      id: "l1", item: "pipe", qty: -1, unit: "m", price: 10,
    }).success).toBe(false);
  });

  it("accepts integer money values", () => {
    expect(orderLineSchema.safeParse({
      id: "l1", item: "pipe", qty: "4", unit: "m", price: 120,
    }).success).toBe(true);
  });
});

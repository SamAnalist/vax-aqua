import { describe, expect, it } from "vitest";
import { isUuid, toDate, toMs } from "./dates";

describe("isUuid", () => {
  it("accepts v4 uuids and rejects local ids", () => {
    expect(isUuid("e2535fce-a9d3-4604-9bb0-c7e57b38daab")).toBe(true);
    expect(isUuid("o_abc1234")).toBe(false);
    expect(isUuid("")).toBe(false);
  });
});

describe("toDate / toMs", () => {
  it("round-trips a timestamp", () => {
    const ms = Date.UTC(2026, 8, 6, 9, 0, 0);
    expect(toMs(toDate(ms))).toBe(ms);
  });

  it("treats 0 as empty", () => {
    expect(toDate(0)).toBeNull();
    expect(toMs(null)).toBe(0);
  });
});

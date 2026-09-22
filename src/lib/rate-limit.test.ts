import { describe, expect, it } from "vitest";
import { createRateLimiter } from "./rate-limit";

describe("createRateLimiter", () => {
  it("allows up to max hits in the window", () => {
    const limiter = createRateLimiter(60_000, 3);
    expect(limiter.check("a", 1000).ok).toBe(true);
    expect(limiter.check("a", 2000).ok).toBe(true);
    expect(limiter.check("a", 3000).ok).toBe(true);
    const blocked = limiter.check("a", 4000);
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });

  it("resets after the window", () => {
    const limiter = createRateLimiter(1000, 1);
    expect(limiter.check("b", 0).ok).toBe(true);
    expect(limiter.check("b", 500).ok).toBe(false);
    expect(limiter.check("b", 1001).ok).toBe(true);
  });

  it("isolates keys", () => {
    const limiter = createRateLimiter(1000, 1);
    expect(limiter.check("one", 0).ok).toBe(true);
    expect(limiter.check("two", 0).ok).toBe(true);
  });

  it("peek does not consume a slot", () => {
    const limiter = createRateLimiter(1000, 1);
    expect(limiter.peek("p", 0).ok).toBe(true);
    expect(limiter.check("p", 0).ok).toBe(true);
    expect(limiter.peek("p", 10).ok).toBe(false);
  });
});

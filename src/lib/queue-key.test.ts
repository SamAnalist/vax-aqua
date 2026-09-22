import { describe, expect, it } from "vitest";
import { queueKeyFor } from "./queue-key";

describe("queueKeyFor", () => {
  it("is stable for the same user and secret", () => {
    process.env.AUTH_SECRET = "test-secret-value";
    expect(queueKeyFor("e0db4b18-dd17-4b9a-94f2-c4a6f49748b3")).toBe(
      queueKeyFor("e0db4b18-dd17-4b9a-94f2-c4a6f49748b3"),
    );
  });

  it("differs per user", () => {
    process.env.AUTH_SECRET = "test-secret-value";
    expect(queueKeyFor("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa")).not.toBe(
      queueKeyFor("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"),
    );
  });
});

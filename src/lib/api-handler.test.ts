import { describe, expect, it } from "vitest";
import { fail } from "./api-handler";
import { AuthError, ForbiddenError } from "./errors";

describe("fail", () => {
  it("returns 400 for a wrong current password", async () => {
    const res = fail(new AuthError("invalid_password"));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: "invalid_password" });
  });

  it("returns 403 for forbidden actions", async () => {
    const res = fail(new ForbiddenError());
    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toEqual({ error: "forbidden" });
  });

  it("returns 401 for a generic auth failure", async () => {
    const res = fail(new AuthError());
    expect(res.status).toBe(401);
  });
});

import { describe, expect, it } from "vitest";
import { clientIp } from "./request-ip";

function req(headers: Record<string, string>) {
  return new Request("https://example.com", { headers });
}

describe("clientIp", () => {
  it("prefers x-real-ip over a spoofed forwarded chain", () => {
    expect(
      clientIp(
        req({
          "x-forwarded-for": "1.2.3.4, 10.0.0.8",
          "x-real-ip": "203.0.113.9",
        }),
      ),
    ).toBe("203.0.113.9");
  });

  it("uses the last forwarded hop when x-real-ip is absent", () => {
    expect(clientIp(req({ "x-forwarded-for": "1.2.3.4, 10.0.0.8" }))).toBe("10.0.0.8");
  });
});

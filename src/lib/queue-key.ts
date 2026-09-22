import { createHmac } from "crypto";

export function queueKeyFor(userUuid: string) {
  return createHmac("sha256", process.env.AUTH_SECRET || "dev-only-queue-key")
    .update(userUuid)
    .digest("base64");
}

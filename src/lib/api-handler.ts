import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { ZodError, type ZodType } from "zod";
import {
  AuthError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  PayloadTooLargeError,
  RateLimitError,
} from "@/lib/errors";

const MAX_JSON_BYTES = 80_000;

export async function readJson(request: Request): Promise<unknown> {
  const declared = Number(request.headers.get("content-length") || 0);
  if (declared > MAX_JSON_BYTES) throw new PayloadTooLargeError();
  const text = await request.text();
  if (text.length > MAX_JSON_BYTES) throw new PayloadTooLargeError();
  if (!text) return {};
  return JSON.parse(text);
}

export async function parseBody<T>(request: Request, schema: ZodType<T>): Promise<T> {
  return schema.parse(await readJson(request));
}

export function fail(error: unknown) {
  if (error instanceof RateLimitError) {
    return NextResponse.json(
      { error: "too_many_requests", retryAfterSec: error.retryAfterSec },
      { status: 429, headers: { "Retry-After": String(error.retryAfterSec) } },
    );
  }
  if (error instanceof AuthError) {
    if (error.message === "invalid_password") {
      return NextResponse.json({ error: "invalid_password" }, { status: 400 });
    }
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (error instanceof ForbiddenError) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (error instanceof PayloadTooLargeError) {
    return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
  }
  if (error instanceof ConflictError) {
    return NextResponse.json({ error: error.message }, { status: 409 });
  }
  if (error instanceof NotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
  if (error instanceof ZodError) {
    if (process.env.NODE_ENV !== "production") {
      return NextResponse.json({ error: "invalid_payload", details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }
  if (error instanceof SyntaxError) {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return NextResponse.json({ error: "conflict" }, { status: 409 });
  }
  console.error(error);
  return NextResponse.json({ error: "server_error" }, { status: 500 });
}

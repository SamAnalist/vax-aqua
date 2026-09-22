import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export async function writeAudit(
  userId: number,
  action: string,
  entity: string,
  entityUuid?: string | null,
  meta?: Prisma.InputJsonValue,
) {
  await prisma.auditLog.create({
    data: {
      userId,
      action,
      entity,
      entityUuid: entityUuid || null,
      meta: meta ?? undefined,
    },
  });
}

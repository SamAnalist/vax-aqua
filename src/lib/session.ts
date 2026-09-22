import { prisma } from "@/lib/prisma";
import { AuthError } from "@/lib/errors";

export {
  AuthError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  PayloadTooLargeError,
  RateLimitError,
} from "@/lib/errors";

export async function requireUser() {
  const user =
    (await prisma.user.findFirst({
      where: { role: "admin" },
      include: { settings: true },
      orderBy: { id: "asc" },
    })) ||
    (await prisma.user.findFirst({
      include: { settings: true },
      orderBy: { id: "asc" },
    }));
  if (!user) throw new AuthError();
  return user;
}

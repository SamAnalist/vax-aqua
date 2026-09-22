import { fail } from "@/lib/api-handler";
import { ForbiddenError } from "@/lib/errors";

export async function POST() {
  return fail(new ForbiddenError());
}

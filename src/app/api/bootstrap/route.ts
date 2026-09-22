import { loadBootstrap } from "@/lib/crm-service";
import { fail } from "@/lib/api-handler";
import { requireUser } from "@/lib/session";

export async function GET() {
  try {
    const user = await requireUser();
    return Response.json(await loadBootstrap(user));
  } catch (error) {
    return fail(error);
  }
}

import { applyOutreach } from "@/lib/crm-service";
import { fail, parseBody } from "@/lib/api-handler";
import { requireUser } from "@/lib/session";
import { outreachActionSchema } from "@/lib/validation";

export async function POST(
  request: Request,
  context: { params: Promise<{ uuid: string }> },
) {
  try {
    const user = await requireUser();
    const { uuid } = await context.params;
    const body = await parseBody(request, outreachActionSchema);
    return Response.json(await applyOutreach(user, uuid, body));
  } catch (error) {
    return fail(error);
  }
}

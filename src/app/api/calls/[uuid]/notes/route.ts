import { addCallNote } from "@/lib/crm-service";
import { fail, parseBody } from "@/lib/api-handler";
import { requireUser } from "@/lib/session";
import { noteSchema } from "@/lib/validation";

export async function POST(
  request: Request,
  context: { params: Promise<{ uuid: string }> },
) {
  try {
    const user = await requireUser();
    const { uuid } = await context.params;
    const body = await parseBody(request, noteSchema);
    const call = await addCallNote(user, uuid, body.text, user.name);
    return Response.json(call, { status: 201 });
  } catch (error) {
    return fail(error);
  }
}

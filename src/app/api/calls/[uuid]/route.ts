import { deleteCall, updateCall } from "@/lib/crm-service";
import { fail, parseBody } from "@/lib/api-handler";
import { requireUser } from "@/lib/session";
import { callPatchSchema } from "@/lib/validation";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ uuid: string }> },
) {
  try {
    const user = await requireUser();
    const { uuid } = await context.params;
    const body = await parseBody(request, callPatchSchema);
    return Response.json(await updateCall(user, uuid, body));
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ uuid: string }> },
) {
  try {
    const user = await requireUser();
    const { uuid } = await context.params;
    await deleteCall(user, uuid);
    return new Response(null, { status: 204 });
  } catch (error) {
    return fail(error);
  }
}

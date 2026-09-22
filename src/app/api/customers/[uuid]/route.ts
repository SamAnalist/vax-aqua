import { deleteCustomer, getCustomer, updateCustomer } from "@/lib/crm-service";
import { fail, parseBody } from "@/lib/api-handler";
import { requireUser } from "@/lib/session";
import { customerPatchSchema } from "@/lib/validation";

export async function GET(
  _request: Request,
  context: { params: Promise<{ uuid: string }> },
) {
  try {
    const user = await requireUser();
    const { uuid } = await context.params;
    return Response.json(await getCustomer(user, uuid));
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ uuid: string }> },
) {
  try {
    const user = await requireUser();
    const { uuid } = await context.params;
    const body = await parseBody(request, customerPatchSchema);
    return Response.json(await updateCustomer(user, uuid, body));
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
    await deleteCustomer(user, uuid);
    return new Response(null, { status: 204 });
  } catch (error) {
    return fail(error);
  }
}

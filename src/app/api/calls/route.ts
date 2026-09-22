import { createCall, listCalls } from "@/lib/crm-service";
import { fail, parseBody } from "@/lib/api-handler";
import { requireUser } from "@/lib/session";
import { callCreateSchema } from "@/lib/validation";

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const cursor = new URL(request.url).searchParams.get("cursor") || undefined;
    return Response.json(await listCalls(user, cursor));
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await parseBody(request, callCreateSchema);
    const call = await createCall(user, {
      ...body,
      minutes: Number(body.minutes) || 0,
    });
    return Response.json(call, { status: 201 });
  } catch (error) {
    return fail(error);
  }
}

import { updateSettings } from "@/lib/crm-service";
import { fail, parseBody } from "@/lib/api-handler";
import { requireUser } from "@/lib/session";
import { settingsSchema } from "@/lib/validation";

export async function PATCH(request: Request) {
  try {
    const user = await requireUser();
    const body = await parseBody(request, settingsSchema);
    return Response.json(await updateSettings(user, body));
  } catch (error) {
    return fail(error);
  }
}

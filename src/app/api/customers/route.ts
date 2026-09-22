import { createCustomer } from "@/lib/crm-service";
import { fail, parseBody } from "@/lib/api-handler";
import { requireUser } from "@/lib/session";
import { customerCreateSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await parseBody(request, customerCreateSchema);
    const customer = await createCustomer(user, body);
    return Response.json(customer, { status: 201 });
  } catch (error) {
    return fail(error);
  }
}

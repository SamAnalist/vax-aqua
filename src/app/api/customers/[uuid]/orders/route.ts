import { upsertOrder } from "@/lib/crm-service";
import { fail, parseBody } from "@/lib/api-handler";
import { requireUser } from "@/lib/session";
import { orderSchema } from "@/lib/validation";

export async function POST(
  request: Request,
  context: { params: Promise<{ uuid: string }> },
) {
  try {
    const user = await requireUser();
    const { uuid } = await context.params;
    const body = await parseBody(request, orderSchema);
    const order = await upsertOrder(user, uuid, {
      ...body,
      id: body.id || "",
      note: body.note || "",
      lines: body.lines.map((l) => ({
        id: l.id,
        item: l.item,
        spec: l.spec || "",
        qty: Number(l.qty) || 0,
        unit: l.unit,
        price: Number(l.price) || 0,
      })),
    });
    return Response.json(order, { status: 201 });
  } catch (error) {
    return fail(error);
  }
}

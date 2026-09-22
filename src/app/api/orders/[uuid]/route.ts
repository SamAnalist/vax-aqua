import { deleteOrder, upsertOrder } from "@/lib/crm-service";
import { fail, parseBody } from "@/lib/api-handler";
import { requireUser } from "@/lib/session";
import { orderSchema } from "@/lib/validation";
import { z } from "zod";

const patchSchema = orderSchema.extend({
  customerId: z.string().uuid(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ uuid: string }> },
) {
  try {
    const user = await requireUser();
    const { uuid } = await context.params;
    const body = await parseBody(request, patchSchema);
    const order = await upsertOrder(user, body.customerId, {
      ...body,
      id: uuid,
      updatedAt: body.updatedAt,
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
    return Response.json(order);
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
    await deleteOrder(user, uuid);
    return new Response(null, { status: 204 });
  } catch (error) {
    return fail(error);
  }
}

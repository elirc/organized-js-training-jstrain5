import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { fail, ok } from "@/lib/http/envelope";
import { mockCustomers } from "@/lib/mock/customers";

type Params = { params: { id: string } };

const patchSchema = z.object({
  status: z.enum(["active", "suspended", "churned"]).optional(),
  plan: z.enum(["free", "starter", "business", "enterprise"]).optional(),
});

export async function GET(_req: NextRequest, { params }: Params) {
  const customer = mockCustomers.find((item) => item.id === params.id);

  if (!customer) {
    return NextResponse.json(fail("NOT_FOUND", "Customer not found."), { status: 404 });
  }

  return NextResponse.json(ok(customer));
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const customer = mockCustomers.find((item) => item.id === params.id);

  if (!customer) {
    return NextResponse.json(fail("NOT_FOUND", "Customer not found."), { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parseResult = patchSchema.safeParse(body);

  if (!parseResult.success) {
    return NextResponse.json(fail("VALIDATION_ERROR", parseResult.error.message), { status: 400 });
  }

  Object.assign(customer, parseResult.data);
  return NextResponse.json(ok(customer));
}

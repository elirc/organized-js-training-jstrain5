import { NextResponse } from "next/server";
import { fail, ok } from "@/lib/http/envelope";
import { mockCustomers } from "@/lib/mock/customers";

type Params = { params: { id: string } };

export async function GET(_req: Request, { params }: Params) {
  const customer = mockCustomers.find((item) => item.id === params.id);
  if (!customer) {
    return NextResponse.json(fail("NOT_FOUND", "Customer not found."), { status: 404 });
  }

  const usage = [
    { serviceType: "voice", quantity: 12983, totalCost: 381.11 },
    { serviceType: "sms", quantity: 209488, totalCost: 795.04 },
    { serviceType: "video", quantity: 944, totalCost: 520.19 },
  ];

  return NextResponse.json(
    ok({
      customerId: customer.id,
      window: "30d",
      usage,
    }),
  );
}

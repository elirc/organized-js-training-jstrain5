import { NextResponse } from "next/server";
import { fail, ok } from "@/lib/http/envelope";
import { mockCustomers } from "@/lib/mock/customers";

type Params = { params: { id: string } };

export async function GET(_req: Request, { params }: Params) {
  const customer = mockCustomers.find((item) => item.id === params.id);
  if (!customer) {
    return NextResponse.json(fail("NOT_FOUND", "Customer not found."), { status: 404 });
  }

  return NextResponse.json(
    ok({
      customerId: customer.id,
      invoices: [
        { id: "inv_2026_01", amount: 401.22, status: "paid", period: "2026-01" },
        { id: "inv_2025_12", amount: 387.19, status: "paid", period: "2025-12" },
        { id: "inv_2025_11", amount: 419.76, status: "paid", period: "2025-11" },
      ],
    }),
  );
}

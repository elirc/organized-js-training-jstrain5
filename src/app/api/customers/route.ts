import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { fail, ok } from "@/lib/http/envelope";
import { mockCustomers } from "@/lib/mock/customers";

const querySchema = z.object({
  search: z.string().optional(),
  plan: z.enum(["free", "starter", "business", "enterprise"]).optional(),
  status: z.enum(["active", "suspended", "churned"]).optional(),
  region: z.enum(["us-east", "us-west", "eu-west", "ap-south"]).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export async function GET(req: NextRequest) {
  const parseResult = querySchema.safeParse({
    search: req.nextUrl.searchParams.get("search") ?? undefined,
    plan: req.nextUrl.searchParams.get("plan") ?? undefined,
    status: req.nextUrl.searchParams.get("status") ?? undefined,
    region: req.nextUrl.searchParams.get("region") ?? undefined,
    cursor: req.nextUrl.searchParams.get("cursor") ?? undefined,
    limit: req.nextUrl.searchParams.get("limit") ?? undefined,
  });

  if (!parseResult.success) {
    return NextResponse.json(fail("VALIDATION_ERROR", parseResult.error.message), { status: 400 });
  }

  const { search, plan, status, region, cursor, limit } = parseResult.data;

  let rows = mockCustomers.filter((customer) => {
    if (search && !customer.companyName.toLowerCase().includes(search.toLowerCase())) return false;
    if (plan && customer.plan !== plan) return false;
    if (status && customer.status !== status) return false;
    if (region && customer.region !== region) return false;
    return true;
  });

  rows = rows.sort((a, b) => a.id.localeCompare(b.id));

  const startIndex = cursor ? rows.findIndex((item) => item.id === cursor) + 1 : 0;
  const page = rows.slice(startIndex, startIndex + limit);
  const nextCursor = page.length === limit ? page[page.length - 1]?.id : null;

  return NextResponse.json(
    ok({
      items: page,
      pagination: {
        cursor: nextCursor,
        limit,
        hasMore: Boolean(nextCursor),
      },
    }),
  );
}

export async function POST() {
  return NextResponse.json(fail("NOT_IMPLEMENTED", "Customer creation is not implemented yet."), {
    status: 501,
  });
}

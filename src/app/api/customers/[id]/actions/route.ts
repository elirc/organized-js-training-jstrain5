import { NextResponse } from "next/server";
import { z } from "zod";
import { fail, ok } from "@/lib/http/envelope";

const schema = z.object({
  action: z.enum(["customer.suspend", "customer.unsuspend", "customer.plan_change", "customer.credit_issue"]),
  dryRun: z.boolean().default(true),
  typeToConfirm: z.string().optional(),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parseResult = schema.safeParse(body);

  if (!parseResult.success) {
    return NextResponse.json(fail("VALIDATION_ERROR", parseResult.error.message), { status: 400 });
  }

  const { action, dryRun } = parseResult.data;

  return NextResponse.json(
    ok({
      action,
      dryRun,
      accepted: true,
      approvalRequired: action === "customer.plan_change" ? false : false,
      message: dryRun
        ? "Dry-run completed. No production mutations executed."
        : "Operation accepted and queued for execution.",
    }),
  );
}

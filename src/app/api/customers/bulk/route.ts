import { NextResponse } from "next/server";
import { z } from "zod";
import { fail, ok } from "@/lib/http/envelope";

const schema = z.object({
  command: z.string().min(1),
  dryRun: z.boolean().default(true),
  targetIds: z.array(z.string()).min(1).max(1000),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parseResult = schema.safeParse(body);

  if (!parseResult.success) {
    return NextResponse.json(fail("VALIDATION_ERROR", parseResult.error.message), { status: 400 });
  }

  const { command, dryRun, targetIds } = parseResult.data;

  return NextResponse.json(
    ok({
      operationId: `op_${Date.now()}`,
      command,
      dryRun,
      targetCount: targetIds.length,
      status: dryRun ? "simulated" : "queued",
    }),
  );
}

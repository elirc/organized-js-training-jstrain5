import { NextResponse } from "next/server";
import { systemHealthRows } from "@/lib/mock/dashboard";
import { ok } from "@/lib/http/envelope";

export async function GET() {
  return NextResponse.json(ok(systemHealthRows));
}

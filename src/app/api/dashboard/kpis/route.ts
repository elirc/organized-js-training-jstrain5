import { NextResponse } from "next/server";
import { dashboardKpis } from "@/lib/mock/dashboard";
import { ok } from "@/lib/http/envelope";

export async function GET() {
  return NextResponse.json(ok(dashboardKpis));
}

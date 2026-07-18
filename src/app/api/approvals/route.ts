import { NextResponse } from "next/server";
import { fail } from "@/lib/http/envelope";

export async function GET() {
  return NextResponse.json(fail("NOT_IMPLEMENTED", "Endpoint scaffolded but not implemented yet."), {
    status: 501,
  });
}

export async function POST() {
  return NextResponse.json(fail("NOT_IMPLEMENTED", "Endpoint scaffolded but not implemented yet."), {
    status: 501,
  });
}

export async function PATCH() {
  return NextResponse.json(fail("NOT_IMPLEMENTED", "Endpoint scaffolded but not implemented yet."), {
    status: 501,
  });
}

export async function PUT() {
  return NextResponse.json(fail("NOT_IMPLEMENTED", "Endpoint scaffolded but not implemented yet."), {
    status: 501,
  });
}

export async function DELETE() {
  return NextResponse.json(fail("NOT_IMPLEMENTED", "Endpoint scaffolded but not implemented yet."), {
    status: 501,
  });
}
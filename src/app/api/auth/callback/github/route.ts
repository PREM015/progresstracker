import { NextRequest, NextResponse } from "next/server";

// TODO: Implement route.ts
export async function GET(req: NextRequest) {
  return NextResponse.json({ message: "Not implemented" }, { status: 501 });
}

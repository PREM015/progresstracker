import { NextResponse } from "next/server";

// Example GET handler
export async function GET(req: Request) {
  return NextResponse.json({ message: "Achievements API works!" });
}

// Example POST handler (optional)
export async function POST(req: Request) {
  const data = await req.json();
  return NextResponse.json({ received: data });
}

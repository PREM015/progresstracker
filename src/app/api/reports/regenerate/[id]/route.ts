import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiResponse, apiError } from "@/lib/apiResponse";

// TODO: Implement this route


export async function GET() {
  return new Response(JSON.stringify({ message: 'Not implemented' }), { status: 501, headers: { 'Content-Type': 'application/json' } });
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}

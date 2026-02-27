import { NextRequest, NextResponse } from "next/server";

/**
 * Alias route: /api/integrations
 * Redirects to: /api/platforms
 */

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const queryString = searchParams.toString();
  const redirectUrl = `/api/platforms${queryString ? `?${queryString}` : ""}`;
  
  return NextResponse.redirect(new URL(redirectUrl, request.url));
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const queryString = searchParams.toString();
  const redirectUrl = `/api/platforms${queryString ? `?${queryString}` : ""}`;
  
  return NextResponse.redirect(new URL(redirectUrl, request.url), { status: 308 });
}

export async function PUT(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const queryString = searchParams.toString();
  const redirectUrl = `/api/platforms${queryString ? `?${queryString}` : ""}`;
  
  return NextResponse.redirect(new URL(redirectUrl, request.url), { status: 308 });
}

export async function PATCH(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const queryString = searchParams.toString();
  const redirectUrl = `/api/platforms${queryString ? `?${queryString}` : ""}`;
  
  return NextResponse.redirect(new URL(redirectUrl, request.url), { status: 308 });
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const queryString = searchParams.toString();
  const redirectUrl = `/api/platforms${queryString ? `?${queryString}` : ""}`;
  
  return NextResponse.redirect(new URL(redirectUrl, request.url), { status: 308 });
}

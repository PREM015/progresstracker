// src/app/api/api-keys/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { getServerSession } from "next-auth";

async function getUserFromSession(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.email) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, email: true, name: true },
  });

  return user;
}

// GET /api/api-keys/[id] - Get single API key details
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromSession(req);
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const apiKey = await prisma.apiKey.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      },
      select: {
        id: true,
        name: true,
        description: true,
        keyPrefix: true,
        scopes: true,
        rateLimit: true,
        rateLimitWindow: true,
        allowedIps: true,
        allowedOrigins: true,
        isActive: true,
        expiresAt: true,
        lastUsedAt: true,
        lastUsedIp: true,
        usageCount: true,
        usageCountDaily: true,
        usageResetAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!apiKey) {
      return NextResponse.json(
        { error: "API key not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(apiKey);
  } catch (error) {
    logger.error("Error fetching API key", { id: params.id }, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/api-keys/[id] - Update API key
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromSession(req);
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      name,
      description,
      scopes,
      rateLimit,
      rateLimitWindow,
      allowedIps,
      allowedOrigins,
      isActive,
      expiresAt,
    } = body;

    const apiKey = await prisma.apiKey.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      },
    });

    if (!apiKey) {
      return NextResponse.json(
        { error: "API key not found" },
        { status: 404 }
      );
    }

    // Validate scopes if provided
    if (scopes) {
      const validScopes = ["read", "write", "delete", "admin"];
      const invalidScopes = scopes.filter((scope: string) => !validScopes.includes(scope));
      if (invalidScopes.length > 0) {
        return NextResponse.json(
          { error: `Invalid scopes: ${invalidScopes.join(", ")}` },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.apiKey.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(scopes !== undefined && { scopes }),
        ...(rateLimit !== undefined && { rateLimit }),
        ...(rateLimitWindow !== undefined && { rateLimitWindow }),
        ...(allowedIps !== undefined && { allowedIps }),
        ...(allowedOrigins !== undefined && { allowedOrigins }),
        ...(isActive !== undefined && { isActive }),
        ...(expiresAt !== undefined && {
          expiresAt: expiresAt ? new Date(expiresAt) : null,
        }),
      },
    });

    logger.info("API key updated", {
      userId: user.id,
      keyId: params.id,
      changes: Object.keys(body),
    });

    return NextResponse.json(updated);
  } catch (error) {
    logger.error("Error updating API key", { id: params.id }, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/api-keys/[id] - Delete API key
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromSession(req);
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const apiKey = await prisma.apiKey.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      },
    });

    if (!apiKey) {
      return NextResponse.json(
        { error: "API key not found" },
        { status: 404 }
      );
    }

    await prisma.apiKey.delete({
      where: { id: params.id },
    });

    logger.info("API key deleted", {
      userId: user.id,
      keyId: params.id,
      keyPrefix: apiKey.keyPrefix,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Error deleting API key", { id: params.id }, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
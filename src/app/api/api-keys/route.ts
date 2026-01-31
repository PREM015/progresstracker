// src/app/api/api-keys/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";

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

// GET /api/api-keys - List user's API keys
export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromSession(req);
    if (!user) {
      logger.warn("Unauthorized API keys access attempt");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const apiKeys = await prisma.apiKey.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
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
        createdAt: true,
        updatedAt: true,
      },
    });

    logger.info("API keys fetched", {
      userId: user.id,
      count: apiKeys.length,
    });

    return NextResponse.json({
      apiKeys,
      total: apiKeys.length,
    });
  } catch (error) {
    logger.error("Error fetching API keys", {}, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/api-keys - Create new API key
export async function POST(req: NextRequest) {
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
      scopes = ["read"],
      rateLimit = 100,
      rateLimitWindow = 60,
      allowedIps = [],
      allowedOrigins = [],
      expiresAt,
    } = body;

    // Validation
    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    // Validate scopes
    const validScopes = ["read", "write", "delete", "admin"];
    const invalidScopes = scopes.filter((scope: string) => !validScopes.includes(scope));
    if (invalidScopes.length > 0) {
      return NextResponse.json(
        { error: `Invalid scopes: ${invalidScopes.join(", ")}` },
        { status: 400 }
      );
    }

    // Check API key limit (e.g., max 10 keys per user)
    const existingKeysCount = await prisma.apiKey.count({
      where: { userId: user.id },
    });

    if (existingKeysCount >= 10) {
      return NextResponse.json(
        { error: "Maximum API key limit reached (10 keys per user)" },
        { status: 400 }
      );
    }

    // Generate API key
    const apiKey = `pk_${nanoid(32)}`; // Public key format
    const keyPrefix = apiKey.substring(0, 12); // First 12 chars for display
    const hashedKey = await bcrypt.hash(apiKey, 10);

    // Create API key
    const newApiKey = await prisma.apiKey.create({
      data: {
        userId: user.id,
        name,
        description,
        keyHash: hashedKey,
        keyPrefix,
        scopes,
        rateLimit,
        rateLimitWindow,
        allowedIps,
        allowedOrigins,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        isActive: true,
      },
    });

    logger.info("API key created", {
      userId: user.id,
      keyId: newApiKey.id,
      keyPrefix,
    });

    // Return the full key only once (it won't be shown again)
    return NextResponse.json(
      {
        apiKey: {
          id: newApiKey.id,
          name: newApiKey.name,
          description: newApiKey.description,
          keyPrefix: newApiKey.keyPrefix,
          scopes: newApiKey.scopes,
          rateLimit: newApiKey.rateLimit,
          rateLimitWindow: newApiKey.rateLimitWindow,
          allowedIps: newApiKey.allowedIps,
          allowedOrigins: newApiKey.allowedOrigins,
          expiresAt: newApiKey.expiresAt,
          createdAt: newApiKey.createdAt,
        },
        key: apiKey, // ONLY shown once!
        warning: "Save this key now. You won't be able to see it again!",
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error("Error creating API key", {}, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
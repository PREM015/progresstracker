// src/app/api/support-tickets/templates/route.ts
// =============================================================================
// CANNED RESPONSES / TEMPLATES API (Admin Only)
// Methods: GET, POST, PUT, DELETE, OPTIONS
// =============================================================================
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 30;

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-ID',
};

const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'private, max-age=300',
};

// Note: You'd need to add a SupportTemplate model to your Prisma schema
// For now, we'll use SystemSettings as a workaround

// =============================================================================
// VALIDATION
// =============================================================================

const createTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(5000),
  category: z.string().max(50).optional(),
  tags: z.array(z.string().max(30)).max(10).optional(),
  isActive: z.boolean().default(true),
  variables: z.array(z.string()).optional(), // e.g., ["{{userName}}", "{{ticketNumber}}"]
});

const updateTemplateSchema = createTemplateSchema.partial();

// =============================================================================
// HELPERS
// =============================================================================

function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 11)}`;
}

function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

function addHeaders(response: NextResponse, requestId: string, rateLimitResult?: { limit: number; remaining: number }): NextResponse {
  Object.entries({ ...SECURITY_HEADERS, ...CORS_HEADERS }).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  response.headers.set('X-Request-ID', requestId);
  if (rateLimitResult) {
    response.headers.set('X-RateLimit-Limit', String(rateLimitResult.limit));
    response.headers.set('X-RateLimit-Remaining', String(rateLimitResult.remaining));
  }
  return response;
}

async function validateAdminSession(request: NextRequest, requestId: string) {
  const ip = getClientIp(request);
  const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, `support-templates:${ip}`);

  if (!rateLimitResult.success) {
    return { error: apiResponse.rateLimited(60, requestId), session: null, rateLimitResult };
  }

  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { error: apiResponse.unauthorized('Authentication required', requestId), session: null, rateLimitResult };
  }

  const isAdmin = Boolean(session.user.isAdmin || session.user.role === 'admin');

  if (!isAdmin) {
    return { error: apiResponse.forbidden('Admin access required', requestId), session: null, rateLimitResult };
  }

  return { error: null, session, rateLimitResult };
}

// Template storage key
const TEMPLATES_KEY = 'support_templates';

async function getTemplates(): Promise<any[]> {
  const setting = await prisma.systemSettings.findUnique({
    where: { key: TEMPLATES_KEY },
  });
  return (setting?.value as any[]) || [];
}

async function saveTemplates(templates: any[]): Promise<void> {
  await prisma.systemSettings.upsert({
    where: { key: TEMPLATES_KEY },
    create: {
      key: TEMPLATES_KEY,
      value: templates as Prisma.InputJsonValue,
      category: 'support',
      description: 'Canned response templates for support tickets',
    },
    update: {
      value: templates as Prisma.InputJsonValue,
      updatedAt: new Date(),
    },
  });
}

// =============================================================================
// OPTIONS
// =============================================================================

export async function OPTIONS(): Promise<NextResponse> {
  const requestId = generateRequestId();
  return addHeaders(new NextResponse(null, { status: 204 }), requestId);
}

// =============================================================================
// GET - List Templates
// =============================================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();

  try {
    const { error, rateLimitResult } = await validateAdminSession(request, requestId);

    if (error) {
      return addHeaders(error, requestId, rateLimitResult);
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const activeOnly = searchParams.get('activeOnly') === 'true';

    let templates = await getTemplates();

    // Filter
    if (category) {
      templates = templates.filter((t) => t.category === category);
    }
    if (activeOnly) {
      templates = templates.filter((t) => t.isActive);
    }

    // Get unique categories
    const allTemplates = await getTemplates();
    const categories = [...new Set(allTemplates.map((t) => t.category).filter(Boolean))];

    const response = apiResponse.success(
      {
        templates,
        count: templates.length,
        categories,
      },
      { meta: { requestId } }
    );

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('GET templates failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to fetch templates', requestId), requestId);
  }
}

// =============================================================================
// POST - Create Template
// =============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();

  try {
    const { error, session, rateLimitResult } = await validateAdminSession(request, requestId);

    if (error) {
      return addHeaders(error, requestId, rateLimitResult);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return addHeaders(
        apiResponse.validationError('Invalid JSON body', undefined, requestId),
        requestId,
        rateLimitResult
      );
    }

    const validation = createTemplateSchema.safeParse(body);

    if (!validation.success) {
      return addHeaders(
        apiResponse.validationError('Validation failed', validation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const templates = await getTemplates();

    // Check for duplicate name
    if (templates.some((t) => t.name.toLowerCase() === validation.data.name.toLowerCase())) {
      return addHeaders(
        apiResponse.validationError('Template with this name already exists', undefined, requestId),
        requestId,
        rateLimitResult
      );
    }

    const newTemplate = {
      id: `tpl_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`,
      ...validation.data,
      createdBy: session!.user.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      usageCount: 0,
    };

    templates.push(newTemplate);
    await saveTemplates(templates);

    logger.info('Template created', {
      templateId: newTemplate.id,
      name: newTemplate.name,
      createdBy: session!.user.id,
      requestId,
    });

    const response = apiResponse.created(newTemplate, { requestId });
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('POST template failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to create template', requestId), requestId);
  }
}

// =============================================================================
// PUT - Update Template
// =============================================================================

export async function PUT(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();

  try {
    const { error, session, rateLimitResult } = await validateAdminSession(request, requestId);

    if (error) {
      return addHeaders(error, requestId, rateLimitResult);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return addHeaders(
        apiResponse.validationError('Invalid JSON body', undefined, requestId),
        requestId,
        rateLimitResult
      );
    }

    const { id, ...updateData } = body as { id: string } & Record<string, unknown>;

    if (!id) {
      return addHeaders(
        apiResponse.validationError('Template ID is required', undefined, requestId),
        requestId,
        rateLimitResult
      );
    }

    const validation = updateTemplateSchema.safeParse(updateData);

    if (!validation.success) {
      return addHeaders(
        apiResponse.validationError('Validation failed', validation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const templates = await getTemplates();
    const templateIndex = templates.findIndex((t) => t.id === id);

    if (templateIndex === -1) {
      return addHeaders(apiResponse.notFound('Template', requestId), requestId, rateLimitResult);
    }

    // Check for duplicate name if name is being changed
    if (
      validation.data.name &&
      validation.data.name.toLowerCase() !== templates[templateIndex].name.toLowerCase() &&
      templates.some((t) => t.id !== id && t.name.toLowerCase() === validation.data.name!.toLowerCase())
    ) {
      return addHeaders(
        apiResponse.validationError('Template with this name already exists', undefined, requestId),
        requestId,
        rateLimitResult
      );
    }

    templates[templateIndex] = {
      ...templates[templateIndex],
      ...validation.data,
      updatedBy: session!.user.id,
      updatedAt: new Date().toISOString(),
    };

    await saveTemplates(templates);

    logger.info('Template updated', {
      templateId: id,
      updatedBy: session!.user.id,
      requestId,
    });

    const response = apiResponse.success(templates[templateIndex], {
      meta: { requestId },
      message: 'Template updated successfully',
    });

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('PUT template failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to update template', requestId), requestId);
  }
}

// =============================================================================
// DELETE - Delete Template
// =============================================================================

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();

  try {
    const { error, session, rateLimitResult } = await validateAdminSession(request, requestId);

    if (error) {
      return addHeaders(error, requestId, rateLimitResult);
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return addHeaders(
        apiResponse.validationError('Template ID is required', undefined, requestId),
        requestId,
        rateLimitResult
      );
    }

    const templates = await getTemplates();
    const templateIndex = templates.findIndex((t) => t.id === id);

    if (templateIndex === -1) {
      return addHeaders(apiResponse.notFound('Template', requestId), requestId, rateLimitResult);
    }

    const deletedTemplate = templates[templateIndex];
    templates.splice(templateIndex, 1);
    await saveTemplates(templates);

    logger.info('Template deleted', {
      templateId: id,
      name: deletedTemplate.name,
      deletedBy: session!.user.id,
      requestId,
    });

    const response = apiResponse.success(
      { message: 'Template deleted successfully', id, name: deletedTemplate.name },
      { meta: { requestId } }
    );

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('DELETE template failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to delete template', requestId), requestId);
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
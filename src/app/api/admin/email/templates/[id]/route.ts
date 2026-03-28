// src/app/api/admin/email/templates/[id]/route.ts
// GET/PUT/DELETE: individual email template

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';

interface Props { params: Promise<{ id: string }> }

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }) };
  if (!session.user.isAdmin && session.user.role !== 'admin') return { error: NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 }) };
  return { error: null };
}

export async function GET(_request: NextRequest, { params }: Props): Promise<NextResponse> {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { id } = await params;
    const template = await prisma.emailTemplate.findUnique({ where: { id } });
    if (!template) return NextResponse.json({ success: false, error: 'Template not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: template });
  } catch (err) {
    logger.error('GET admin email template failed', {}, err);
    return NextResponse.json({ success: false, error: 'Failed to fetch template' }, { status: 500 });
  }
}

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  subject: z.string().min(1).max(500).optional(),
  htmlContent: z.string().optional(),
  textContent: z.string().optional(),
  variables: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

export async function PUT(request: NextRequest, { params }: Props): Promise<NextResponse> {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ success: false, error: 'Invalid data', issues: parsed.error.errors }, { status: 400 });

    const template = await prisma.emailTemplate.update({
      where: { id },
      data: { ...parsed.data, updatedAt: new Date() },
    });

    return NextResponse.json({ success: true, data: template });
  } catch (err) {
    logger.error('PUT admin email template failed', {}, err);
    return NextResponse.json({ success: false, error: 'Update failed' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Props): Promise<NextResponse> {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { id } = await params;
    await prisma.emailTemplate.delete({ where: { id } });
    return NextResponse.json({ success: true, message: 'Template deleted' });
  } catch (err) {
    logger.error('DELETE admin email template failed', {}, err);
    return NextResponse.json({ success: false, error: 'Delete failed' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';

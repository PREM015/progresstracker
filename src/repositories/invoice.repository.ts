// src/repositories/invoice.repository.ts
// Invoice data access

import { prisma } from '@/lib/prisma';

export class InvoiceRepository {
  static async findByUserId(userId: string, options?: { status?: string; skip?: number; take?: number }) {
    return prisma.invoice.findMany({
      where: {
        userId,
        ...(options?.status ? { status: options.status as never } : {}),
      },
      orderBy: { createdAt: 'desc' },
      skip: options?.skip,
      take: options?.take ?? 20,
    });
  }

  static async findById(id: string) {
    return prisma.invoice.findUnique({ where: { id } });
  }

  static async findByStripeInvoiceId(stripeInvoiceId: string) {
    return prisma.invoice.findFirst({ where: { stripeInvoiceId } });
  }

  static async create(data: {
    userId: string;
    stripeInvoiceId?: string;
    subscriptionId?: string;
    amount?: number;
    total?: number;
    subtotal?: number;
    invoiceDate?: Date;
    amountDue: number;
    currency: string;
    status: string;
    dueDate?: Date;
    paidAt?: Date;
    hostedUrl?: string;
    pdfUrl?: string;
    lineItems?: unknown;
  }) {
    const total = data.total ?? data.amount ?? 0;
    return prisma.invoice.create({ 
      data: {
        userId: data.userId,
        stripeInvoiceId: data.stripeInvoiceId,
        subscriptionId: data.subscriptionId,
        total,
        subtotal: data.subtotal ?? total,
        amountDue: data.amountDue,
        currency: data.currency,
        status: data.status,
        dueDate: data.dueDate,
        paidAt: data.paidAt,
        hostedInvoiceUrl: data.hostedUrl,
        invoicePdfUrl: data.pdfUrl,
        lineItems: data.lineItems ? JSON.parse(JSON.stringify(data.lineItems)) : undefined,
        invoiceDate: data.invoiceDate ?? new Date(),
      }
    });
  }

  static async update(id: string, data: Record<string, unknown>) {
    return prisma.invoice.update({ where: { id }, data });
  }

  static async updateByStripeId(stripeInvoiceId: string, data: Record<string, unknown>) {
    return prisma.invoice.updateMany({ where: { stripeInvoiceId }, data });
  }
}

export default InvoiceRepository;

'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileText, Loader2 } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { format } from 'date-fns';

interface InvoicesListProps {
  className?: string;
}

export default function InvoicesList({ className }: InvoicesListProps) {
  const { invoices, isLoadingInvoices } = useSubscription();

  if (isLoadingInvoices) {
    return (
      <Card className={className}>
        <CardContent className="pt-6 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
        </CardContent>
      </Card>
    );
  }

  if (!invoices || invoices.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-zinc-500 text-sm">No invoices found.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Invoices</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {invoices.map((invoice) => (
            <div
              key={invoice.id}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${invoice.status === 'paid' ? 'bg-green-100 text-green-600' : 'bg-zinc-100 text-zinc-500'}`}>
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {format(new Date(invoice.invoiceDate), 'MMM d, yyyy')}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {invoice.invoiceNumber} • {new Intl.NumberFormat('en-US', { style: 'currency', currency: invoice.currency }).format(invoice.total / 100)}
                  </p>
                </div>
              </div>

              {invoice.invoicePdfUrl && (
                <Button variant="ghost" size="sm" asChild>
                  <a href={invoice.invoicePdfUrl} target="_blank" rel="noopener noreferrer">
                    <Download className="w-4 h-4 mr-2" />
                    PDF
                  </a>
                </Button>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

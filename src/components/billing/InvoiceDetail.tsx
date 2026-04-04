'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Download, Printer, CheckCircle, XCircle, Clock } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

export function InvoiceDetail({ invoiceId }: { invoiceId: string }) {
  const { data: invoice, isLoading } = useQuery({
    queryKey: ['invoice', invoiceId],
    queryFn: async () => {
      const res = await fetch(`/api/stripe/invoices/${invoiceId}`);
      if (!res.ok) throw new Error('Failed to fetch invoice');
      return res.json();
    }
  });

  if (isLoading) {
    return <div>Loading invoice...</div>;
  }

  if (!invoice) {
    return <div>Invoice not found</div>;
  }

  const statusConfig: Record<string, any> = {
    paid: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100', label: 'Paid' },
    open: { icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-100', label: 'Pending' },
    void: { icon: XCircle, color: 'text-gray-600', bg: 'bg-gray-100', label: 'Void' },
    uncollectible: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-100', label: 'Failed' }
  };

  const status = statusConfig[invoice.status] || statusConfig.open;

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>Invoice #{invoice.number}</CardTitle>
            <CardDescription>
              Issued on {formatDate(invoice.created)}
            </CardDescription>
          </div>
          <Badge className={`${status.bg} ${status.color}`}>
            <status.icon className="h-3 w-3 mr-1" />
            {status.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Billing Details */}
        <div className="grid grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold mb-2">Billed To</h3>
            <p className="text-sm text-muted-foreground">
              {invoice.customer_name}<br />
              {invoice.customer_email}<br />
              {invoice.customer_address?.line1}<br />
              {invoice.customer_address?.city}, {invoice.customer_address?.state} {invoice.customer_address?.postal_code}
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Payment Details</h3>
            <p className="text-sm text-muted-foreground">
              Payment Method: {invoice.payment_method?.type || 'N/A'}<br />
              Due Date: {formatDate(invoice.due_date)}<br />
              {invoice.paid_at && `Paid On: ${formatDate(invoice.paid_at)}`}
            </p>
          </div>
        </div>

        <Separator />

        {/* Line Items */}
        <div>
          <h3 className="font-semibold mb-4">Items</h3>
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Description</th>
                <th className="text-right py-2">Quantity</th>
                <th className="text-right py-2">Unit Price</th>
                <th className="text-right py-2">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.lines.data.map((line: any) => (
                <tr key={line.id} className="border-b">
                  <td className="py-3">
                    <div className="font-medium">{line.description}</div>
                    <div className="text-sm text-muted-foreground">
                      {line.period?.start && `${formatDate(line.period.start)} - ${formatDate(line.period.end)}`}
                    </div>
                  </td>
                  <td className="text-right">{line.quantity}</td>
                  <td className="text-right">{formatCurrency(line.price.unit_amount / 100)}</td>
                  <td className="text-right font-medium">{formatCurrency(line.amount / 100)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Separator />

        {/* Totals */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Subtotal</span>
            <span>{formatCurrency(invoice.subtotal / 100)}</span>
          </div>
          
          {invoice.discount && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Discount ({invoice.discount.coupon?.name})</span>
              <span>-{formatCurrency(invoice.discount.amount / 100)}</span>
            </div>
          )}

          {invoice.tax && (
            <div className="flex justify-between text-sm">
              <span>Tax ({invoice.tax_percent}%)</span>
              <span>{formatCurrency(invoice.tax / 100)}</span>
            </div>
          )}

          <Separator />

          <div className="flex justify-between text-lg font-bold">
            <span>Total</span>
            <span>{formatCurrency(invoice.total / 100)}</span>
          </div>

          {invoice.amount_paid > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Amount Paid</span>
              <span>{formatCurrency(invoice.amount_paid / 100)}</span>
            </div>
          )}

          {invoice.amount_due > 0 && (
            <div className="flex justify-between text-sm font-semibold text-destructive">
              <span>Amount Due</span>
              <span>{formatCurrency(invoice.amount_due / 100)}</span>
            </div>
          )}
        </div>

        {/* Refund Info */}
        {invoice.refunds?.data?.length > 0 && (
          <>
            <Separator />
            <div>
              <h3 className="font-semibold mb-2">Refunds</h3>
              {invoice.refunds.data.map((refund: any) => (
                <div key={refund.id} className="flex justify-between text-sm">
                  <span>{formatDate(refund.created)}</span>
                  <span className="text-green-600">
                    +{formatCurrency(refund.amount / 100)}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-4">
          <Button
            onClick={() => window.open(invoice.invoice_pdf, '_blank')}
            variant="outline"
          >
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
          <Button
            onClick={() => window.print()}
            variant="outline"
          >
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>

        {/* Footer */}
        <div className="text-xs text-muted-foreground pt-4">
          <p>Invoice ID: {invoice.id}</p>
          <p>If you have any questions, please contact support@yourapp.com</p>
        </div>
      </CardContent>
    </Card>
  );
}

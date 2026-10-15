import { EmptyState } from '../../components/ui';
import { formatCurrency, formatDate, humanize } from '../../lib/format';
import { ParentChildPage } from './ParentChildPage';

interface InvoiceItem {
  id: string;
  description: string;
  amount: number | string;
}

interface InvoicePayment {
  id: string;
  amount: number | string;
  method: string;
  reference: string | null;
  paidAt: string;
}

interface ChildInvoice {
  id: string;
  invoiceNo: string;
  issueDate: string;
  dueDate: string;
  status: string;
  subtotal: number | string;
  discount: number | string;
  total: number | string;
  amountPaid: number | string;
  balance: number | string;
  items: InvoiceItem[];
  payments: InvoicePayment[];
}

const STATUS_CLASS: Record<string, string> = {
  DRAFT: 'badge badge--default',
  ISSUED: 'badge badge--info',
  PARTIALLY_PAID: 'badge badge--warning',
  PAID: 'badge badge--success',
  OVERDUE: 'badge badge--danger',
  CANCELLED: 'badge badge--default',
};

function InvoiceCard({ invoice }: { invoice: ChildInvoice }) {
  return (
    <div className="panel">
      <div className="panel__header">
        <h3 className="panel__title">{invoice.invoiceNo}</h3>
        <span className={STATUS_CLASS[invoice.status] ?? 'badge badge--default'}>
          {humanize(invoice.status)}
        </span>
      </div>
      <p className="muted">
        Issued {formatDate(invoice.issueDate)} · Due {formatDate(invoice.dueDate)}
      </p>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.length === 0 ? (
              <tr>
                <td colSpan={2} className="muted">
                  No line items.
                </td>
              </tr>
            ) : (
              invoice.items.map((item) => (
                <tr key={item.id}>
                  <td>{item.description}</td>
                  <td>{formatCurrency(item.amount)}</td>
                </tr>
              ))
            )}
            <tr>
              <td>
                <strong>Total</strong>
              </td>
              <td>
                <strong>{formatCurrency(invoice.total)}</strong>
              </td>
            </tr>
            <tr>
              <td>Paid</td>
              <td>{formatCurrency(invoice.amountPaid)}</td>
            </tr>
            <tr>
              <td>
                <strong>Balance</strong>
              </td>
              <td>
                <strong>{formatCurrency(invoice.balance)}</strong>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {invoice.payments.length > 0 ? (
        <>
          <h4 className="panel__subtitle">Payments</h4>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Method</th>
                  <th>Reference</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.payments.map((payment) => (
                  <tr key={payment.id}>
                    <td>{formatDate(payment.paidAt)}</td>
                    <td>{humanize(payment.method)}</td>
                    <td>{payment.reference ?? '—'}</td>
                    <td>{formatCurrency(payment.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}

export function ParentInvoicesPage() {
  return (
    <ParentChildPage<ChildInvoice[]>
      title="Recent Invoices"
      subtitle="Your child's fee invoices and payments"
      endpoint={(studentId) => `/parents/me/children/${studentId}/invoices`}
      emptyMessage="No invoices have been issued."
      isEmpty={(data) => data.length === 0}
      render={(data) =>
        data.length === 0 ? (
          <EmptyState message="No invoices have been issued." />
        ) : (
          <div className="dashboard">
            {data.map((invoice) => (
              <InvoiceCard key={invoice.id} invoice={invoice} />
            ))}
          </div>
        )
      }
    />
  );
}

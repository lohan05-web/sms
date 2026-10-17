import { Text, View } from 'react-native';

import { ParentChildShell } from '../../components/ParentChildShell';
import { formatCurrency, formatDate, humanize } from '../../lib/format';

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
  total: number | string;
  amountPaid: number | string;
  balance: number | string;
  items: InvoiceItem[];
  payments: InvoicePayment[];
}

export function ParentInvoicesScreen() {
  return (
    <ParentChildShell<ChildInvoice[]>
      title="Recent Invoices"
      subtitle="Your child's fee invoices and payments"
      endpoint={(studentId) => `/parents/me/children/${studentId}/invoices`}
      emptyMessage="No invoices have been issued."
      isEmpty={(data) => data.length === 0}
      render={(data) => (
        <View style={styles.grid}>
          {data.map((invoice, index) => (
            <InvoiceCard key={invoice.id ?? index} invoice={invoice} />
          ))}
        </View>
      )}
    />
  );
}

function InvoiceCard({ invoice }: { invoice: ChildInvoice }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{invoice.invoiceNo}</Text>
        <Text style={styles.status}>{humanize(invoice.status)}</Text>
      </View>
      <Text style={styles.muted}>
        Issued {formatDate(invoice.issueDate)} · Due {formatDate(invoice.dueDate)}
      </Text>

      {invoice.items.map((item) => (
        <Row key={item.id} label={item.description} value={formatCurrency(item.amount)} />
      ))}
      <Row label="Total" value={formatCurrency(invoice.total)} strong />
      <Row label="Paid" value={formatCurrency(invoice.amountPaid)} />
      <Row label="Balance" value={formatCurrency(invoice.balance)} strong />

      {invoice.payments.length > 0 ? (
        <View style={styles.payments}>
          <Text style={styles.subtitle}>Payments</Text>
          {invoice.payments.map((payment) => (
            <Row
              key={payment.id}
              label={`${formatDate(payment.paidAt)} · ${humanize(payment.method)}`}
              value={formatCurrency(payment.amount)}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function Row({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, strong ? styles.rowStrong : null]}>{label}</Text>
      <Text style={[styles.rowValue, strong ? styles.rowStrong : null]}>{value}</Text>
    </View>
  );
}

const styles = {
  grid: {
    gap: 12,
  },
  card: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    gap: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    flexShrink: 1,
  },
  status: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 2,
  },
  payments: {
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  rowLabel: {
    fontSize: 13,
    color: '#64748b',
    flexShrink: 1,
  },
  rowValue: {
    fontSize: 13,
    color: '#334155',
  },
  rowStrong: {
    fontWeight: '700',
    color: '#0f172a',
  },
  muted: {
    fontSize: 13,
    color: '#64748b',
  },
} as const;

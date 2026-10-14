import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Permission, createPaymentSchema } from '@smartschool/shared';
import { PaymentMethod } from '@prisma/client';
import { Field } from '../components/fields';
import { PageHeader } from '../components/ui';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { initialFromFields, useForm, type FieldDef } from '../lib/form';
import { humanize } from '../lib/format';
import { useLookups } from '../lib/options';
import { can } from '../lib/permissions';
import { ForbiddenPage } from './ForbiddenPage';

const METHOD_OPTIONS = Object.values(PaymentMethod).map((value) => ({
  value,
  label: humanize(value),
}));

const FIELDS: FieldDef[] = [
  { name: 'invoiceId', label: 'Invoice', type: 'select', required: true, lookup: 'invoices' },
  { name: 'amount', label: 'Amount', type: 'number', required: true, min: 0.01, step: '0.01' },
  {
    name: 'method',
    label: 'Method',
    type: 'select',
    options: METHOD_OPTIONS,
    defaultValue: 'CASH',
  },
  { name: 'transactionRef', label: 'Transaction ref', type: 'text' },
  { name: 'notes', label: 'Notes', type: 'textarea' },
];

export function PaymentCreatePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const form = useForm(createPaymentSchema, initialFromFields(FIELDS));
  const [submitting, setSubmitting] = useState(false);
  const { options } = useLookups(['invoices']);

  if (!user || !can(user.role, Permission.PAYMENT_MANAGE)) return <ForbiddenPage />;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    form.setFormError(null);
    const data = form.validate();
    if (!data) return;
    setSubmitting(true);
    try {
      await api.post('/payments', data);
      navigate('/resource/payments');
    } catch (error) {
      form.setFormError(error instanceof Error ? error.message : 'Failed to record payment.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page">
      <PageHeader title="Record Payment" subtitle="Apply a payment against an invoice" />
      <form className="form form--wide panel" onSubmit={handleSubmit} noValidate>
        {form.formError ? (
          <div className="alert alert--error" role="alert">
            {form.formError}
          </div>
        ) : null}
        {FIELDS.map((field) => (
          <Field
            key={field.name}
            field={field}
            value={form.values[field.name]}
            error={form.errors[field.name]}
            options={options}
            onChange={form.setValue}
          />
        ))}
        <div className="form__actions">
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => navigate('/resource/payments')}
            disabled={submitting}
          >
            Cancel
          </button>
          <button type="submit" className="btn btn--primary" disabled={submitting}>
            {submitting ? 'Saving…' : 'Record payment'}
          </button>
        </div>
      </form>
    </div>
  );
}

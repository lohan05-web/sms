import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Permission } from '@smartschool/shared';
import { Field } from '../components/fields';
import { PageHeader } from '../components/ui';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useLookups } from '../lib/options';
import { can } from '../lib/permissions';
import { ForbiddenPage } from './ForbiddenPage';

interface ItemRow {
  id: number;
  description: string;
  amount: string;
}

let nextItemId = 1;

function newItem(): ItemRow {
  return { id: nextItemId++, description: '', amount: '' };
}

export function InvoiceCreatePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [studentId, setStudentId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [discount, setDiscount] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<ItemRow[]>([newItem()]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { options } = useLookups(['students']);

  if (!user || !can(user.role, Permission.INVOICE_MANAGE)) return <ForbiddenPage />;

  const updateItem = (id: number, patch: Partial<ItemRow>) =>
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));

  const addItem = () => setItems((prev) => [...prev, newItem()]);

  const removeItem = (id: number) =>
    setItems((prev) => (prev.length > 1 ? prev.filter((item) => item.id !== id) : prev));

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const validItems = items.filter(
      (item) => item.description.trim() !== '' && Number(item.amount) > 0,
    );
    if (!studentId) {
      setError('Please select a student.');
      return;
    }
    if (!dueDate) {
      setError('Please choose a due date.');
      return;
    }
    if (validItems.length === 0) {
      setError('Add at least one fee item with a description and amount.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/invoices', {
        studentId,
        dueDate: new Date(`${dueDate}T00:00:00.000Z`).toISOString(),
        discount: discount ? Number(discount) : undefined,
        notes: notes.trim() || undefined,
        items: validItems.map((item) => ({
          description: item.description.trim(),
          amount: Number(item.amount),
        })),
      });
      navigate('/resource/invoices');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create invoice.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page">
      <PageHeader title="New Invoice" subtitle="Issue an invoice with one or more fee items" />
      <form className="form form--wide panel" onSubmit={handleSubmit} noValidate>
        {error ? (
          <div className="alert alert--error" role="alert">
            {error}
          </div>
        ) : null}

        <Field
          field={{
            name: 'studentId',
            label: 'Student',
            type: 'select',
            required: true,
            lookup: 'students',
          }}
          value={studentId}
          options={options}
          onChange={(_name, value) => setStudentId(String(value ?? ''))}
        />
        <Field
          field={{ name: 'dueDate', label: 'Due date', type: 'date', required: true }}
          value={dueDate}
          options={options}
          onChange={(_name, value) => setDueDate(String(value ?? ''))}
        />
        <Field
          field={{ name: 'discount', label: 'Discount', type: 'number', min: 0, step: '0.01' }}
          value={discount}
          options={options}
          onChange={(_name, value) => setDiscount(String(value ?? ''))}
        />

        <div className="field">
          <span className="field__label">Fee items</span>
          <div className="items">
            {items.map((item) => (
              <div className="items__row" key={item.id}>
                <input
                  className="field__input"
                  placeholder="Description"
                  value={item.description}
                  onChange={(event) => updateItem(item.id, { description: event.target.value })}
                />
                <input
                  className="field__input"
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="Amount"
                  value={item.amount}
                  onChange={(event) => updateItem(item.id, { amount: event.target.value })}
                />
                <button
                  type="button"
                  className="btn btn--danger btn--sm"
                  onClick={() => removeItem(item.id)}
                  disabled={items.length === 1}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
          <button type="button" className="btn btn--ghost btn--sm" onClick={addItem}>
            Add item
          </button>
        </div>

        <Field
          field={{ name: 'notes', label: 'Notes', type: 'textarea' }}
          value={notes}
          options={options}
          onChange={(_name, value) => setNotes(String(value ?? ''))}
        />

        <div className="form__actions">
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => navigate('/resource/invoices')}
            disabled={submitting}
          >
            Cancel
          </button>
          <button type="submit" className="btn btn--primary" disabled={submitting}>
            {submitting ? 'Saving…' : 'Create invoice'}
          </button>
        </div>
      </form>
    </div>
  );
}

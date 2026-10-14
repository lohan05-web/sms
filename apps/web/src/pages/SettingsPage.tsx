import { Permission, updateSchoolSchema, type Role } from '@smartschool/shared';
import { useMemo, useState, type FormEvent } from 'react';
import { Field } from '../components/fields';
import { EmptyState, ErrorState, PageHeader, Spinner } from '../components/ui';
import { ApiError, api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { formatCurrency } from '../lib/format';
import { useForm, type FieldDef, type FormValues } from '../lib/form';
import { can } from '../lib/permissions';
import { useSettings, type SchoolSettings } from '../lib/settings';
import { ForbiddenPage } from './ForbiddenPage';

const CURRENCY_PREVIEW_AMOUNT = 1234.5;

const fields: FieldDef[] = [
  { name: 'name', label: 'School name', type: 'text', required: true },
  {
    name: 'code',
    label: 'School code',
    type: 'text',
    required: true,
    help: 'Short unique identifier, for example DEMO',
  },
  { name: 'email', label: 'Email', type: 'email' },
  { name: 'phone', label: 'Phone', type: 'text' },
  { name: 'address', label: 'Address', type: 'textarea', placeholder: 'Street, city, country' },
  { name: 'logoUrl', label: 'Logo URL', type: 'text', placeholder: 'https://…' },
  {
    name: 'timezone',
    label: 'Timezone',
    type: 'text',
    help: 'IANA time zone, for example Africa/Lagos',
  },
  {
    name: 'currency',
    label: 'Currency',
    type: 'text',
    required: true,
    help: 'ISO 4217 code, for example USD, EUR or NGN',
  },
  { name: 'isActive', label: 'Active', type: 'checkbox' },
];

function settingsToValues(settings: SchoolSettings): FormValues {
  return {
    name: settings.name,
    code: settings.code,
    email: settings.email ?? '',
    phone: settings.phone ?? '',
    address: settings.address ?? '',
    logoUrl: settings.logoUrl ?? '',
    timezone: settings.timezone,
    currency: settings.currency,
    isActive: settings.isActive,
  };
}

export function SettingsPage() {
  const { user } = useAuth();
  if (!user || !can(user.role, Permission.SCHOOL_READ)) return <ForbiddenPage />;
  return <SettingsView role={user.role} />;
}

function SettingsView({ role }: { role: Role }) {
  const { settings, loading, error, reload, applySettings } = useSettings();

  return (
    <div className="page">
      <PageHeader
        title="Settings"
        subtitle="Currency, timezone and contact details for your school"
      />
      {loading ? (
        <Spinner label="Loading settings…" />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !settings ? (
        <EmptyState message="No school settings are available for your account." />
      ) : (
        <SettingsForm
          key={settings.id}
          settings={settings}
          canEdit={can(role, Permission.SCHOOL_UPDATE)}
          onSaved={applySettings}
        />
      )}
    </div>
  );
}

function SettingsForm({
  settings,
  canEdit,
  onSaved,
}: {
  settings: SchoolSettings;
  canEdit: boolean;
  onSaved: (settings: SchoolSettings) => void;
}) {
  const initialValues = useMemo(() => settingsToValues(settings), [settings]);
  const form = useForm(updateSchoolSchema, initialValues);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const currency = String(form.values.currency ?? settings.currency);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    form.setFormError(null);
    setSuccess(null);
    const data = form.validate();
    if (!data) return;
    setSubmitting(true);
    try {
      const updated = await api.patch<SchoolSettings>(`/schools/${settings.id}`, data);
      onSaved(updated);
      setSuccess('School settings saved.');
    } catch (err) {
      form.setFormError(err instanceof ApiError ? err.message : 'Unable to save settings.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!canEdit) {
    return (
      <section className="panel">
        <div className="alert alert--error">
          You can view these settings but do not have permission to change them.
        </div>
        <dl className="details">
          <div className="details__row">
            <dt>School name</dt>
            <dd>{settings.name}</dd>
          </div>
          <div className="details__row">
            <dt>School code</dt>
            <dd>{settings.code}</dd>
          </div>
          <div className="details__row">
            <dt>Currency</dt>
            <dd>{settings.currency}</dd>
          </div>
          <div className="details__row">
            <dt>Timezone</dt>
            <dd>{settings.timezone}</dd>
          </div>
          <div className="details__row">
            <dt>Email</dt>
            <dd>{settings.email ?? '—'}</dd>
          </div>
          <div className="details__row">
            <dt>Phone</dt>
            <dd>{settings.phone ?? '—'}</dd>
          </div>
          <div className="details__row">
            <dt>Address</dt>
            <dd>{settings.address ?? '—'}</dd>
          </div>
        </dl>
      </section>
    );
  }

  return (
    <section className="panel">
      {success ? (
        <div className="alert alert--success" role="status">
          {success}
        </div>
      ) : null}
      <form className="form form--wide" onSubmit={handleSubmit} noValidate>
        {form.formError ? (
          <div className="alert alert--error" role="alert">
            {form.formError}
          </div>
        ) : null}
        {fields.map((field) => (
          <Field
            key={field.name}
            field={field}
            value={form.values[field.name]}
            error={form.errors[field.name]}
            options={{}}
            onChange={form.setValue}
          />
        ))}
        <p className="panel__meta">
          Amounts across the app are shown as {formatCurrency(CURRENCY_PREVIEW_AMOUNT, currency)}.
        </p>
        <div className="form__actions">
          <button type="submit" className="btn btn--primary" disabled={submitting}>
            {submitting ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </section>
  );
}

import { useState, type FormEvent } from 'react';
import { useForm, type FieldDef, type FormValues, type ParseableSchema } from '../lib/form';
import { useLookups, type LookupKind } from '../lib/options';
import { Field } from './fields';
import { Modal } from './Modal';

export interface FormDialogProps {
  title: string;
  fields: FieldDef[];
  schema: ParseableSchema;
  initialValues: FormValues;
  submitLabel?: string;
  onClose: () => void;
  onSubmit: (values: FormValues) => Promise<void>;
}

export function FormDialog({
  title,
  fields,
  schema,
  initialValues,
  submitLabel = 'Save',
  onClose,
  onSubmit,
}: FormDialogProps) {
  const form = useForm(schema, initialValues);
  const [submitting, setSubmitting] = useState(false);

  const lookupKinds = Array.from(
    new Set(
      fields.map((field) => field.lookup).filter((kind): kind is LookupKind => kind !== undefined),
    ),
  );
  const { options } = useLookups(lookupKinds);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    form.setFormError(null);
    const data = form.validate();
    if (!data) return;
    setSubmitting(true);
    try {
      await onSubmit(data);
    } catch (error) {
      form.setFormError(error instanceof Error ? error.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title={title} onClose={onClose}>
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
            options={options}
            onChange={form.setValue}
          />
        ))}
        <div className="form__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" className="btn btn--primary" disabled={submitting}>
            {submitting ? 'Saving…' : submitLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}

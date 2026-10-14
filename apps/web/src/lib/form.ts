import { useCallback, useState } from 'react';
import type { LookupKind, Option } from './options';

export type FieldType =
  | 'text'
  | 'email'
  | 'password'
  | 'number'
  | 'date'
  | 'textarea'
  | 'select'
  | 'multiselect'
  | 'checkbox';

export interface FieldDef {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: Option[];
  lookup?: LookupKind;
  placeholder?: string;
  help?: string;
  step?: string;
  min?: number;
  max?: number;
  defaultValue?: string | number | boolean;
  hideOnEdit?: boolean;
  hideOnCreate?: boolean;
  /** Resolve the field's current value from a row for edit forms (arrays etc.). */
  toValue?: (row: Record<string, unknown>) => unknown;
}

export type FormValues = Record<string, unknown>;

export interface ParseIssue {
  path: (string | number)[];
  message: string;
}

export interface ParseableSchema {
  safeParse: (
    value: unknown,
  ) => { success: true; data: unknown } | { success: false; error: { issues: ParseIssue[] } };
}

export function valueAt(row: Record<string, unknown> | undefined, dotted: string): unknown {
  if (!row) return undefined;
  return dotted
    .split('.')
    .reduce<unknown>(
      (acc, part) =>
        acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[part] : undefined,
      row,
    );
}

/** Remove empty values so that optional fields are omitted and required ones fail validation. */
export function cleanValues(values: FormValues): FormValues {
  const out: FormValues = {};
  for (const [key, value] of Object.entries(values)) {
    if (value === '' || value === undefined || value === null) continue;
    out[key] = value;
  }
  return out;
}

export function initialFromFields(fields: readonly FieldDef[]): FormValues {
  const values: FormValues = {};
  for (const field of fields) {
    if (field.defaultValue !== undefined) values[field.name] = field.defaultValue;
    else if (field.type === 'checkbox') values[field.name] = false;
    else if (field.type === 'multiselect') values[field.name] = [];
    else values[field.name] = '';
  }
  return values;
}

export function rowToValues(
  fields: readonly FieldDef[],
  row: Record<string, unknown> | undefined,
): FormValues {
  const values: FormValues = {};
  for (const field of fields) {
    const raw = field.toValue ? field.toValue(row ?? {}) : valueAt(row, field.name);
    if (field.type === 'checkbox') {
      values[field.name] = raw === true;
    } else if (field.type === 'multiselect') {
      values[field.name] = Array.isArray(raw) ? raw : [];
    } else if (field.type === 'date') {
      values[field.name] = typeof raw === 'string' ? raw.slice(0, 10) : '';
    } else if (raw === null || raw === undefined || typeof raw === 'object') {
      values[field.name] = '';
    } else {
      values[field.name] = raw;
    }
  }
  return values;
}

/** A minimal schema that only enforces the required fields of a form. */
export function requiredSchema(fields: readonly FieldDef[]): ParseableSchema {
  return {
    safeParse(value: unknown) {
      const data = (value ?? {}) as FormValues;
      const issues: ParseIssue[] = [];
      for (const field of fields) {
        if (!field.required) continue;
        const current = data[field.name];
        if (current === undefined || current === null || current === '') {
          issues.push({ path: [field.name], message: `${field.label} is required` });
        }
      }
      if (issues.length > 0) return { success: false, error: { issues } };
      return { success: true, data };
    },
  };
}

export interface FormState {
  values: FormValues;
  errors: Record<string, string>;
  formError: string | null;
  setFormError: (message: string | null) => void;
  setValue: (name: string, value: unknown) => void;
  validate: () => FormValues | null;
}

export function useForm(schema: ParseableSchema, initial: FormValues): FormState {
  const [values, setValues] = useState<FormValues>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const setValue = useCallback((name: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => {
      if (!(name in prev)) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }, []);

  const validate = useCallback((): FormValues | null => {
    const result = schema.safeParse(cleanValues(values));
    if (result.success) {
      setErrors({});
      setFormError(null);
      return result.data as FormValues;
    }
    const mapped: Record<string, string> = {};
    let root: string | null = null;
    for (const issue of result.error.issues) {
      if (issue.path.length === 0) {
        root ??= issue.message;
        continue;
      }
      const key = issue.path.join('.');
      if (!mapped[key]) mapped[key] = issue.message;
    }
    setErrors(mapped);
    setFormError(root);
    return null;
  }, [schema, values]);

  return { values, errors, formError, setFormError, setValue, validate };
}

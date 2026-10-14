import type { ReactNode } from 'react';
import type { FieldDef } from '../lib/form';
import type { LookupKind, Option } from '../lib/options';

export type LookupOptions = Partial<Record<LookupKind, Option[]>>;

function asInputValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
}

function optionsFor(field: FieldDef, options: LookupOptions): Option[] {
  if (field.lookup) return options[field.lookup] ?? [];
  return field.options ?? [];
}

export function Field({
  field,
  value,
  error,
  options,
  onChange,
}: {
  field: FieldDef;
  value: unknown;
  error?: string;
  options: LookupOptions;
  onChange: (name: string, value: unknown) => void;
}) {
  const id = `field-${field.name}`;
  const describedBy = error ? `${id}-error` : field.help ? `${id}-help` : undefined;

  if (field.type === 'checkbox') {
    return (
      <div className="field">
        <label className="checkbox">
          <input
            id={id}
            type="checkbox"
            checked={value === true}
            onChange={(event) => onChange(field.name, event.target.checked)}
          />
          {field.label}
        </label>
        {field.help ? <span className="field__help">{field.help}</span> : null}
        {error ? (
          <span className="field__error" id={`${id}-error`}>
            {error}
          </span>
        ) : null}
      </div>
    );
  }

  let control: ReactNode;
  if (field.type === 'textarea') {
    control = (
      <textarea
        id={id}
        className="field__input"
        rows={3}
        placeholder={field.placeholder}
        aria-describedby={describedBy}
        value={asInputValue(value)}
        onChange={(event) => onChange(field.name, event.target.value)}
      />
    );
  } else if (field.type === 'select') {
    const opts = optionsFor(field, options);
    control = (
      <select
        id={id}
        className="field__input"
        aria-describedby={describedBy}
        value={asInputValue(value)}
        onChange={(event) => onChange(field.name, event.target.value)}
      >
        <option value="">— Select —</option>
        {opts.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  } else if (field.type === 'multiselect') {
    const opts = optionsFor(field, options);
    const selected = Array.isArray(value) ? (value as string[]) : [];
    control = (
      <select
        id={id}
        className="field__input"
        multiple
        size={Math.min(Math.max(opts.length, 3), 8)}
        aria-describedby={describedBy}
        value={selected}
        onChange={(event) =>
          onChange(
            field.name,
            Array.from(event.target.selectedOptions, (option) => option.value),
          )
        }
      >
        {opts.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  } else {
    control = (
      <input
        id={id}
        className="field__input"
        type={field.type}
        placeholder={field.placeholder}
        step={field.step}
        min={field.min}
        max={field.max}
        aria-describedby={describedBy}
        value={asInputValue(value)}
        onChange={(event) => onChange(field.name, event.target.value)}
      />
    );
  }

  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {field.label}
        {field.required ? ' *' : ''}
      </label>
      {control}
      {field.help ? <span className="field__help">{field.help}</span> : null}
      {error ? (
        <span className="field__error" id={`${id}-error`}>
          {error}
        </span>
      ) : null}
    </div>
  );
}

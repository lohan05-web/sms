import { createStudentSchema } from '@smartschool/shared';
import { describe, expect, it } from 'vitest';
import {
  cleanValues,
  initialFromFields,
  requiredSchema,
  rowToValues,
  valueAt,
  type FieldDef,
} from './form';

describe('cleanValues', () => {
  it('drops empty strings and nullish values but keeps zero and false', () => {
    expect(cleanValues({ a: '', b: null, c: undefined, d: 0, e: false, f: 'x' })).toEqual({
      d: 0,
      e: false,
      f: 'x',
    });
  });
});

describe('initialFromFields', () => {
  it('uses defaults, checkbox false, and empty strings otherwise', () => {
    const fields: FieldDef[] = [
      { name: 'a', label: 'A', type: 'text' },
      { name: 'b', label: 'B', type: 'checkbox' },
      { name: 'c', label: 'C', type: 'number', defaultValue: 1 },
    ];
    expect(initialFromFields(fields)).toEqual({ a: '', b: false, c: 1 });
  });
});

describe('rowToValues', () => {
  it('maps rows to field values and formats dates', () => {
    const fields: FieldDef[] = [
      { name: 'name', label: 'Name', type: 'text' },
      { name: 'startDate', label: 'Start', type: 'date' },
      { name: 'isCurrent', label: 'Current', type: 'checkbox' },
      { name: 'meta', label: 'Meta', type: 'text' },
    ];
    const row = {
      name: 'X',
      startDate: '2024-05-01T00:00:00.000Z',
      isCurrent: 1,
      meta: { a: 1 },
    };
    expect(rowToValues(fields, row)).toEqual({
      name: 'X',
      startDate: '2024-05-01',
      isCurrent: false,
      meta: '',
    });
  });

  it('handles an undefined row', () => {
    const fields: FieldDef[] = [{ name: 'a', label: 'A', type: 'text' }];
    expect(rowToValues(fields, undefined)).toEqual({ a: '' });
  });
});

describe('valueAt', () => {
  it('reads nested paths', () => {
    expect(valueAt({ a: { b: 2 } }, 'a.b')).toBe(2);
    expect(valueAt(undefined, 'a')).toBeUndefined();
  });
});

describe('requiredSchema', () => {
  const schema = requiredSchema([{ name: 'x', label: 'X', type: 'text', required: true }]);

  it('rejects missing required fields', () => {
    expect(schema.safeParse({}).success).toBe(false);
  });

  it('accepts present required fields', () => {
    expect(schema.safeParse({ x: 'value' }).success).toBe(true);
  });
});

describe('form integration with shared schemas', () => {
  it('rejects a student payload missing required fields', () => {
    const result = createStudentSchema.safeParse(cleanValues({ firstName: 'A', lastName: 'B' }));
    expect(result.success).toBe(false);
  });

  it('accepts a complete student payload', () => {
    const result = createStudentSchema.safeParse(
      cleanValues({
        firstName: 'A',
        lastName: 'B',
        admissionNo: 'S1',
        admissionDate: '2024-01-01',
        dateOfBirth: '2010-01-01',
        gender: 'MALE',
      }),
    );
    expect(result.success).toBe(true);
  });
});

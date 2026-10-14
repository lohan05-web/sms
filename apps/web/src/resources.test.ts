import { describe, expect, it } from 'vitest';
import { RESOURCES, resourceByKey } from './resources';

describe('RESOURCES', () => {
  it('has unique keys', () => {
    const keys = RESOURCES.map((resource) => resource.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('resolves resources by key', () => {
    expect(resourceByKey('students')?.label).toBe('Students');
    expect(resourceByKey('missing')).toBeUndefined();
  });

  it('gives every create/edit spec fields and a schema', () => {
    for (const resource of RESOURCES) {
      for (const spec of [resource.form?.create, resource.form?.edit]) {
        if (!spec) continue;
        expect(spec.fields.length).toBeGreaterThan(0);
        expect(typeof spec.schema.safeParse).toBe('function');
      }
    }
  });

  it('keeps field names unique within each spec', () => {
    for (const resource of RESOURCES) {
      for (const spec of [resource.form?.create, resource.form?.edit]) {
        if (!spec) continue;
        const names = spec.fields.map((field) => field.name);
        expect(new Set(names).size).toBe(names.length);
      }
    }
  });

  it('has a permission whenever a form or create link is offered', () => {
    for (const resource of RESOURCES) {
      if (resource.form?.create || resource.createHref) {
        expect(resource.createPermission ?? resource.permission).toBeTruthy();
      }
      if (resource.form?.edit) {
        expect(resource.updatePermission ?? resource.permission).toBeTruthy();
      }
      if (resource.deletable) {
        expect(resource.deletePermission ?? resource.permission).toBeTruthy();
      }
    }
  });

  it('includes the junction resources', () => {
    expect(resourceByKey('teacher-assignments')).toBeDefined();
    expect(resourceByKey('class-subjects')).toBeDefined();
    expect(resourceByKey('route-stops')).toBeDefined();
  });

  it('lets admins upload a student photo and assign a section', () => {
    const students = resourceByKey('students');
    expect(students?.rowActions?.photo).toBe(true);
    const fieldNames = students?.form?.create?.fields.map((field) => field.name) ?? [];
    expect(fieldNames).toContain('sectionId');
  });
});

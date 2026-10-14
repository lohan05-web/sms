import { beforeEach, describe, expect, it, vi } from 'vitest';

const { list } = vi.hoisted(() => ({ list: vi.fn() }));

vi.mock('./api', () => ({ api: { list } }));

import { clearLookupCache, loadOptions } from './options';

function page(items: Array<{ id: string; name: string }>) {
  return { items, meta: { total: items.length, page: 1, limit: 100, totalPages: 1 } };
}

describe('lookup options cache', () => {
  beforeEach(() => {
    clearLookupCache();
    list.mockReset();
    list.mockResolvedValue(
      page([
        { id: 'sec-1', name: 'A' },
        { id: 'sec-2', name: 'B' },
      ]),
    );
  });

  it('maps section rows to selectable options', async () => {
    await expect(loadOptions('sections')).resolves.toEqual([
      { value: 'sec-1', label: 'A' },
      { value: 'sec-2', label: 'B' },
    ]);
  });

  it('reuses cached results until the cache is cleared', async () => {
    await loadOptions('sections');
    await loadOptions('sections');
    expect(list).toHaveBeenCalledTimes(1);

    clearLookupCache();

    await loadOptions('sections');
    expect(list).toHaveBeenCalledTimes(2);
  });

  it('exposes a newly created section once the cache is cleared', async () => {
    expect(await loadOptions('sections')).toHaveLength(2);

    clearLookupCache();
    list.mockResolvedValue(
      page([
        { id: 'sec-1', name: 'A' },
        { id: 'sec-2', name: 'B' },
        { id: 'sec-3', name: 'C' },
      ]),
    );

    expect(await loadOptions('sections')).toHaveLength(3);
  });
});

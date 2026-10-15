import { useState, type FormEvent, type ReactNode } from 'react';
import { DataTable } from '../DataTable';
import { FormDialog } from '../FormDialog';
import { Pagination } from '../Pagination';
import { ErrorState, SkeletonTable } from '../ui';
import type { ListMeta } from '../../lib/api';
import {
  initialFromFields,
  rowToValues,
  type FieldDef,
  type FormValues,
  type ParseableSchema,
} from '../../lib/form';
import { clearLookupCache } from '../../lib/options';
import { useAsync } from '../../lib/useAsync';
import type { Column, Row } from '../../resources';

const PAGE_LIMIT = 20;

export interface CrudTabProps {
  singular: string;
  plural: string;
  columns: Column[];
  load: (params: Record<string, unknown>) => Promise<{ items: Row[]; meta: ListMeta }>;
  createSpec?: { fields: FieldDef[]; schema: ParseableSchema };
  editSpec?: { fields: FieldDef[]; schema: ParseableSchema };
  canManage: boolean;
  emptyMessage: string;
  onCreate: (values: FormValues) => Promise<unknown>;
  onUpdate: (id: string, values: FormValues) => Promise<unknown>;
  onDelete: (id: string) => Promise<unknown>;
  onChanged: () => void;
  extraActions?: (row: Row) => ReactNode;
}

function rowId(row: Row | undefined): string {
  return row ? String(row.id ?? '') : '';
}

export function CrudTab({
  singular,
  plural,
  columns,
  load,
  createSpec,
  editSpec,
  canManage,
  emptyMessage,
  onCreate,
  onUpdate,
  onDelete,
  onChanged,
  extraActions,
}: CrudTabProps) {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');
  const [dialog, setDialog] = useState<{ mode: 'create' | 'edit'; row?: Row } | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const state = useAsync(
    () => load({ page, limit: PAGE_LIMIT, search: query || undefined }),
    [page, query],
  );

  const canCreate = canManage && Boolean(createSpec);
  const canEdit = canManage && Boolean(editSpec);
  const canDelete = canManage;

  const onSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(1);
    setQuery(searchInput.trim());
  };

  const handleSubmit = async (values: FormValues) => {
    if (!dialog) return;
    const isCreate = dialog.mode === 'create';
    if (isCreate) {
      await onCreate(values);
    } else {
      await onUpdate(rowId(dialog.row), values);
    }
    setDialog(null);
    clearLookupCache();
    setNotice(`${singular} ${isCreate ? 'created' : 'updated'} successfully.`);
    state.reload();
    onChanged();
  };

  const handleDelete = async (row: Row) => {
    const id = rowId(row);
    if (!id) return;
    if (!window.confirm(`Delete this ${singular.toLowerCase()}? This cannot be undone.`)) return;
    setBusy(true);
    try {
      await onDelete(id);
      clearLookupCache();
      setNotice(`${singular} deleted.`);
      state.reload();
      onChanged();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Delete failed');
    } finally {
      setBusy(false);
    }
  };

  const showActions = canEdit || canDelete || Boolean(extraActions);
  const actions = showActions
    ? (row: Row) => (
        <>
          {extraActions ? extraActions(row) : null}
          {canEdit ? (
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => setDialog({ mode: 'edit', row })}
            >
              Edit
            </button>
          ) : null}
          {canDelete ? (
            <button
              type="button"
              className="btn btn--danger btn--sm"
              onClick={() => handleDelete(row)}
              disabled={busy}
            >
              Delete
            </button>
          ) : null}
        </>
      )
    : undefined;

  return (
    <div className="vehicle-tab">
      {notice ? (
        <div className="alert alert--success" role="status">
          {notice}
        </div>
      ) : null}

      <form className="toolbar toolbar--wrap" onSubmit={onSearch}>
        <input
          className="field__input"
          type="search"
          placeholder={`Search ${plural.toLowerCase()}…`}
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
        />
        <button type="submit" className="btn btn--primary">
          Search
        </button>
        <span className="toolbar__spacer" />
        {canCreate ? (
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => setDialog({ mode: 'create' })}
          >
            New {singular}
          </button>
        ) : null}
        <button type="button" className="btn btn--ghost" onClick={state.reload}>
          Refresh
        </button>
      </form>

      {state.loading ? (
        <SkeletonTable rows={6} />
      ) : state.error ? (
        <ErrorState message={state.error} onRetry={state.reload} />
      ) : state.data ? (
        <>
          <DataTable
            columns={columns}
            rows={state.data.items}
            actions={actions}
            emptyMessage={emptyMessage}
          />
          <Pagination
            page={state.data.meta.page}
            totalPages={state.data.meta.totalPages}
            total={state.data.meta.total}
            onChange={setPage}
          />
        </>
      ) : null}

      {dialog && dialog.mode === 'create' && createSpec ? (
        <FormDialog
          key="create"
          title={`New ${singular}`}
          fields={createSpec.fields}
          schema={createSpec.schema}
          initialValues={initialFromFields(createSpec.fields)}
          submitLabel="Create"
          onClose={() => setDialog(null)}
          onSubmit={handleSubmit}
        />
      ) : null}

      {dialog && dialog.mode === 'edit' && editSpec ? (
        <FormDialog
          key={`edit-${rowId(dialog.row)}`}
          title={`Edit ${singular}`}
          fields={editSpec.fields}
          schema={editSpec.schema}
          initialValues={rowToValues(editSpec.fields, dialog.row)}
          submitLabel="Save"
          onClose={() => setDialog(null)}
          onSubmit={handleSubmit}
        />
      ) : null}
    </div>
  );
}

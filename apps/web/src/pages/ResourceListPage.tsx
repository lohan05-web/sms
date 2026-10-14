import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { Role } from '@smartschool/shared';
import { DataTable } from '../components/DataTable';
import { FormDialog } from '../components/FormDialog';
import { Modal } from '../components/Modal';
import { PhotoDialog } from '../components/PhotoDialog';
import { Pagination } from '../components/Pagination';
import { ErrorState, PageHeader, Spinner } from '../components/ui';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { initialFromFields, rowToValues, type FormValues } from '../lib/form';
import { clearLookupCache } from '../lib/options';
import { can } from '../lib/permissions';
import { useSettings } from '../lib/settings';
import { useAsync } from '../lib/useAsync';
import { resourceByKey, type ResourceConfig, type Row } from '../resources';
import { ForbiddenPage } from './ForbiddenPage';
import { NotFoundPage } from './NotFoundPage';

const PAGE_LIMIT = 20;

interface ListResult {
  items: Row[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

interface SecretDialogState {
  title: string;
  name?: string;
  password: string;
}

function recordId(row: Row | undefined): string {
  return row ? String(row.id ?? '') : '';
}

function rowPhoto(row: Row): string | null {
  const value = row.photoUrl ?? (row.user as Row | undefined)?.avatarUrl;
  return typeof value === 'string' && value ? value : null;
}

function personLabel(row: Row): string {
  const candidates = [row.user, row].map((source) =>
    source && typeof source === 'object' ? (source as Row) : undefined,
  );
  for (const source of candidates) {
    const first = typeof source?.firstName === 'string' ? source.firstName : '';
    const last = typeof source?.lastName === 'string' ? source.lastName : '';
    const name = `${first} ${last}`.trim();
    if (name) return name;
  }
  return String(row.employeeNo ?? row.email ?? '');
}

function isActiveRow(row: Row): boolean {
  const user = row.user;
  const value =
    user && typeof user === 'object' ? (user as Row).isActive : (row.isActive as unknown);
  return value !== false;
}

export function ResourceListPage() {
  const { key = '' } = useParams();
  const { user } = useAuth();
  const config = resourceByKey(key);

  if (!config) return <NotFoundPage />;
  if (!user || !can(user.role, config.permission)) return <ForbiddenPage />;

  return <ResourceListView key={key} config={config} role={user.role} />;
}

function ResourceListView({ config, role }: { config: ResourceConfig; role: Role }) {
  const { currency } = useSettings();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');
  const [dialog, setDialog] = useState<{ mode: 'create' | 'edit'; row?: Row } | null>(null);
  const [busy, setBusy] = useState(false);
  const [secret, setSecret] = useState<SecretDialogState | null>(null);
  const [photoTarget, setPhotoTarget] = useState<Row | null>(null);

  const state = useAsync<ListResult>(
    () =>
      api.list<Row>(config.apiPath, {
        page,
        limit: PAGE_LIMIT,
        search: query || undefined,
      }),
    [config.apiPath, page, query],
  );

  const createSpec = config.form?.create;
  const editSpec = config.form?.edit;
  const manage = config.updatePermission ?? config.permission;
  const canCreate = Boolean((createSpec || config.createHref) && can(role, config.createPermission ?? config.permission));
  const canEdit = Boolean(editSpec && can(role, manage));
  const canDelete = Boolean(config.deletable && can(role, config.deletePermission ?? config.permission));
  const canToggleActive = Boolean(config.rowActions?.toggleActive && can(role, manage));
  const canResetPassword = Boolean(config.rowActions?.resetPassword && can(role, manage));
  const canManagePhoto = Boolean(config.rowActions?.photo && can(role, manage));

  const onSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(1);
    setQuery(searchInput.trim());
  };

  const handleSubmit = async (values: FormValues) => {
    if (!dialog) return;
    if (dialog.mode === 'create') {
      const created = await api.post<Row & { initialPassword?: string }>(config.apiPath, values);
      setDialog(null);
      if (created && typeof created.initialPassword === 'string') {
        setSecret({
          title: 'Login created',
          name: personLabel(created),
          password: created.initialPassword,
        });
      }
    } else {
      await api.patch(`${config.apiPath}/${recordId(dialog.row)}`, values);
      setDialog(null);
    }
    clearLookupCache();
    state.reload();
  };

  const handleDelete = async (row: Row) => {
    const id = recordId(row);
    if (!id) return;
    if (!window.confirm(`Delete this ${config.label.replace(/s$/, '')}?`)) return;
    setBusy(true);
    try {
      await api.delete(`${config.apiPath}/${id}`);
      clearLookupCache();
      state.reload();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Delete failed');
    } finally {
      setBusy(false);
    }
  };

  const handleToggleActive = async (row: Row) => {
    const id = recordId(row);
    if (!id) return;
    setBusy(true);
    try {
      await api.patch(`${config.apiPath}/${id}/status`, { isActive: !isActiveRow(row) });
      state.reload();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Update failed');
    } finally {
      setBusy(false);
    }
  };

  const handleResetPassword = async (row: Row) => {
    const id = recordId(row);
    if (!id) return;
    if (!window.confirm('Generate a new password for this account?')) return;
    setBusy(true);
    try {
      const result = await api.post<{ password: string }>(`${config.apiPath}/${id}/reset-password`);
      setSecret({ title: 'Password reset', name: personLabel(row), password: result.password });
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Reset failed');
    } finally {
      setBusy(false);
    }
  };

  const handleSavePhoto = async (photoUrl: string | null) => {
    if (!photoTarget) return;
    await api.patch(`${config.apiPath}/${recordId(photoTarget)}/photo`, { photoUrl });
    setPhotoTarget(null);
    clearLookupCache();
    state.reload();
  };

  const showActions = canEdit || canDelete || canToggleActive || canResetPassword || canManagePhoto;
  const actions = showActions
    ? (row: Row) => (
        <>
          {canEdit ? (
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => setDialog({ mode: 'edit', row })}
            >
              Edit
            </button>
          ) : null}
          {canToggleActive ? (
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => handleToggleActive(row)}
              disabled={busy}
            >
              {isActiveRow(row) ? 'Deactivate' : 'Activate'}
            </button>
          ) : null}
          {canResetPassword ? (
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => handleResetPassword(row)}
              disabled={busy}
            >
              Reset password
            </button>
          ) : null}
          {canManagePhoto ? (
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => setPhotoTarget(row)}
              disabled={busy}
            >
              Photo
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
    <div className="page">
      <PageHeader
        title={config.label}
        subtitle="Live data from the SmartSchool API"
        actions={
          <div className="toolbar toolbar--inline">
            {canCreate ? (
              config.createHref ? (
                <Link to={config.createHref} className="btn btn--primary">
                  New
                </Link>
              ) : (
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={() => setDialog({ mode: 'create' })}
                >
                  New
                </button>
              )
            ) : null}
            <button type="button" className="btn btn--ghost" onClick={state.reload}>
              Refresh
            </button>
          </div>
        }
      />

      {config.searchable ? (
        <form className="toolbar" onSubmit={onSearch}>
          <input
            className="field__input"
            type="search"
            placeholder={`Search ${config.label.toLowerCase()}…`}
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
          <button type="submit" className="btn btn--primary">
            Search
          </button>
        </form>
      ) : null}

      {state.loading ? (
        <Spinner label="Loading…" />
      ) : state.error ? (
        <ErrorState message={state.error} onRetry={state.reload} />
      ) : state.data ? (
        <>
          <DataTable
            key={currency}
            columns={config.columns}
            rows={state.data.items}
            actions={actions}
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
          title={`New ${config.label}`}
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
          key={`edit-${recordId(dialog.row)}`}
          title={`Edit ${config.label}`}
          fields={editSpec.fields}
          schema={editSpec.schema}
          initialValues={rowToValues(editSpec.fields, dialog.row)}
          submitLabel="Save"
          onClose={() => setDialog(null)}
          onSubmit={handleSubmit}
        />
      ) : null}

      {photoTarget ? (
        <PhotoDialog
          title={`${config.label.replace(/s$/, '')} photo`}
          currentUrl={rowPhoto(photoTarget)}
          onClose={() => setPhotoTarget(null)}
          onSave={handleSavePhoto}
        />
      ) : null}

      {secret ? (
        <Modal title={secret.title} onClose={() => setSecret(null)}>
          <div className="form">
            <p>
              Share this password with {secret.name ? <strong>{secret.name}</strong> : 'the user'}.
              It is shown only once.
            </p>
            <div className="toolbar toolbar--inline">
              <input className="field__input" readOnly value={secret.password} />
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => void navigator.clipboard?.writeText(secret.password)}
              >
                Copy
              </button>
            </div>
            <div className="form__actions">
              <button type="button" className="btn btn--primary" onClick={() => setSecret(null)}>
                Done
              </button>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

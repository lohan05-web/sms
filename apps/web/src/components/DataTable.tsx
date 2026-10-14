import type { ReactNode } from 'react';
import type { Column, Row } from '../resources';
import { EmptyState } from './ui';

export function DataTable({
  columns,
  rows,
  emptyMessage = 'No records found.',
  actions,
}: {
  columns: Column[];
  rows: Row[];
  emptyMessage?: string;
  actions?: (row: Row) => ReactNode;
}) {
  if (rows.length === 0) return <EmptyState message={emptyMessage} />;
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.header}>{column.header}</th>
            ))}
            {actions ? <th>Actions</th> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={String(row.id ?? index)}>
              {columns.map((column) => (
                <td key={column.header}>{column.render(row)}</td>
              ))}
              {actions ? <td className="table__actions">{actions(row)}</td> : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

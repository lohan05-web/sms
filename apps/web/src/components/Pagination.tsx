export function Pagination({
  page,
  totalPages,
  total,
  onChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) {
    return <div className="pagination__summary">{total} record(s)</div>;
  }
  return (
    <div className="pagination">
      <button
        type="button"
        className="btn btn--ghost"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
      >
        Previous
      </button>
      <span className="pagination__summary">
        Page {page} of {totalPages} · {total} record(s)
      </span>
      <button
        type="button"
        className="btn btn--ghost"
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
      >
        Next
      </button>
    </div>
  );
}

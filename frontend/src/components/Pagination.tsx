interface PaginationProps {
  pagina: number;
  totalPaginas: number;
  total?: number;
  limite?: number;
  onChange: (pagina: number) => void;
}

/** Paginador con números + elipsis (ventana de 2 páginas alrededor de la actual) y resumen "Mostrando X–Y de Z" */
export default function Pagination({ pagina, totalPaginas, total, limite, onChange }: PaginationProps) {
  if (totalPaginas <= 1) return null;

  const delta = 2;
  const pages: (number | '...')[] = [];
  for (let i = 1; i <= totalPaginas; i++) {
    if (i === 1 || i === totalPaginas || (i >= pagina - delta && i <= pagina + delta)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...');
    }
  }

  const mostrarResumen = total !== undefined && limite !== undefined && total > 0;
  const desde = mostrarResumen ? (pagina - 1) * limite! + 1 : 0;
  const hasta = mostrarResumen ? Math.min(pagina * limite!, total!) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--sp-2)', marginTop: 'var(--sp-3)' }}>
      <div className="pagination">
        <button className="page-btn" disabled={pagina === 1} onClick={() => onChange(pagina - 1)}>‹</button>
        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`ellipsis-${i}`} style={{ padding: '0 4px', color: 'var(--text-muted)', alignSelf: 'center' }}>…</span>
          ) : (
            <button key={p} className={`page-btn ${pagina === p ? 'active' : ''}`} onClick={() => onChange(p as number)}>{p}</button>
          )
        )}
        <button className="page-btn" disabled={pagina === totalPaginas} onClick={() => onChange(pagina + 1)}>›</button>
      </div>
      {mostrarResumen && (
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Mostrando {desde}–{hasta} de {total} resultado{total === 1 ? '' : 's'}
        </span>
      )}
    </div>
  );
}

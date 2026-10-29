// Componente de paginação reutilizável — Fase 4, item 12 (UI).
// Usado em TestCases, Requirements, TestSuites, TestPlan e Executions.

const selectOptions = [20, 50, 100];

const btnStyle = {
  background: "#fff",
  color: "#374151",
  border: "1px solid #d1d5db",
  borderRadius: "6px",
  padding: "6px 12px",
  fontSize: "13px",
  fontWeight: "600",
  boxShadow: "none",
  transform: "none",
};

export default function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = selectOptions,
  loading = false,
  error = false,
  empty = false,
}) {
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "12px",
        marginTop: "16px",
        paddingTop: "16px",
        borderTop: "1px solid #f3f4f6",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#6b7280" }}>
        <span role="status" aria-live="polite">
          {loading ? "Carregando registros..." : error ? "Registros indisponíveis" : total === 0 ? "Nenhum resultado" : empty ? "Nenhum registro nesta página" : `Mostrando ${start}–${end} de ${total}`}
        </span>
        <label style={{ display: "flex", alignItems: "center", gap: "6px", marginLeft: "8px" }}>
          Por página:
          <select
            value={pageSize}
            disabled={loading}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            style={{ padding: "4px 8px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "13px", background: "#fff", color: "#374151" }}
          >
            {pageSizeOptions.filter((opt) => Number.isInteger(opt) && opt > 0 && opt <= 100).map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </label>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <button
          style={btnStyle}
          disabled={loading || error || page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          ← Anterior
        </button>
        <span style={{ fontSize: "13px", color: "#374151", fontWeight: "600" }}>
          {loading || error ? `Página ${page}` : `Página ${page} de ${totalPages}`}
        </span>
        <button
          style={btnStyle}
          disabled={loading || error || page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Próxima →
        </button>
      </div>
    </div>
  );
}

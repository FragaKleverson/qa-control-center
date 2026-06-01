import { useState, useEffect, useRef } from "react";
import { executionsAPI, reportsAPI, testSuitesAPI } from "../services/api";
import "./Pages.css";

const STATUS_COLOR = {
  passed:  { bg: "#dcfce7", color: "#15803d" },
  failed:  { bg: "#fee2e2", color: "#991b1b" },
  running: { bg: "#dbeafe", color: "#0c4a6e" },
  pending: { bg: "#fef3c7", color: "#92400e" },
  blocked: { bg: "#fce7f3", color: "#9d174d" },
  skipped: { bg: "#f3f4f6", color: "#6b7280" },
};

function StatusBadge({ status }) {
  const s = STATUS_COLOR[status] || STATUS_COLOR.skipped;
  return (
    <span style={{ background: s.bg, color: s.color, padding: "3px 9px", borderRadius: "5px", fontSize: "11px", fontWeight: "600" }}>
      {status}
    </span>
  );
}

export default function Reports() {
  // Dados gerais
  const [stats, setStats] = useState({ total: 0, passed: 0, failed: 0, pending: 0 });
  const [suiteStats, setSuiteStats] = useState([]);
  const [recentExecutions, setRecentExecutions] = useState([]);
  const [suites, setSuites] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtros e resultado gerado
  const [filters, setFilters] = useState({ startDate: "", endDate: "", suite_id: "" });
  const [generated, setGenerated] = useState(null);
  const [generating, setGenerating] = useState(false);

  const toastTimerRef = useRef(null);
  const [toast, setToast] = useState({ message: "", type: "" });

  useEffect(() => {
    loadAll();
  }, []);

  function showToast(message, type = "info") {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => setToast({ message: "", type: "" }), 3000);
  }

  async function loadAll() {
    setLoading(true);
    try {
      const [statsData, reportsData, suitesData] = await Promise.all([
        executionsAPI.getStats(),
        reportsAPI.list(),
        testSuitesAPI.list(),
      ]);
      setStats(statsData);
      setRecentExecutions(reportsData.executions || []);
      setSuiteStats(reportsData.suiteStats || []);
      setSuites(suitesData);
    } catch (err) {
      console.error(err);
      showToast("Erro ao carregar relatório", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerate(e) {
    e.preventDefault();
    setGenerating(true);
    setGenerated(null);
    try {
      const payload = {};
      if (filters.startDate) payload.startDate = filters.startDate;
      if (filters.endDate)   payload.endDate   = filters.endDate;
      if (filters.suite_id)  payload.suite_id  = Number(filters.suite_id);
      const data = await reportsAPI.generate(payload);
      setGenerated(data);
    } catch (err) {
      console.error(err);
      showToast("Erro ao gerar relatório", "error");
    } finally {
      setGenerating(false);
    }
  }

  const successRate = stats.total > 0 ? ((stats.passed / stats.total) * 100).toFixed(1) : 0;

  function suiteName(suiteId) {
    return suites.find((s) => s.id === suiteId)?.nome || `Suite #${suiteId}`;
  }

  return (
    <div className="page">
      <h1>📈 Test Reports</h1>
      <p>Análise completa das execuções de teste</p>

      {loading ? (
        <p style={{ color: "#6b7280", textAlign: "center", padding: "40px" }}>Carregando relatório...</p>
      ) : (
        <div className="page-content">

          {/* ── Stats Cards ─────────────────────────────── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px" }}>
            {[
              { label: "Total", value: stats.total, grad: "linear-gradient(135deg,#667eea,#764ba2)" },
              { label: `Passed (${successRate}%)`, value: stats.passed, grad: "linear-gradient(135deg,#10b981,#059669)" },
              { label: "Failed", value: stats.failed, grad: "linear-gradient(135deg,#ef4444,#dc2626)" },
              { label: "Pending", value: stats.pending, grad: "linear-gradient(135deg,#f59e0b,#d97706)" },
            ].map((card) => (
              <div key={card.label} style={{ background: card.grad, color: "#fff", padding: "20px", borderRadius: "10px", textAlign: "center" }}>
                <div style={{ fontSize: "36px", fontWeight: "700" }}>{card.value}</div>
                <div style={{ fontSize: "13px", opacity: 0.9, marginTop: "4px" }}>{card.label}</div>
              </div>
            ))}
          </div>

          {/* ── Barra de sucesso ────────────────────────── */}
          {stats.total > 0 && (
            <div className="card">
              <h2>Taxa de Sucesso</h2>
              <div style={{ background: "#e5e7eb", borderRadius: "8px", height: "28px", overflow: "hidden", marginTop: "12px" }}>
                <div style={{
                  background: "linear-gradient(90deg,#10b981,#059669)",
                  height: "100%",
                  width: `${successRate}%`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#fff", fontWeight: "600", fontSize: "13px",
                  transition: "width 0.6s ease",
                }}>
                  {successRate > 8 && `${successRate}%`}
                </div>
              </div>
              <p style={{ marginTop: "10px", color: "#6b7280", fontSize: "13px" }}>
                {stats.passed} de {stats.total} execuções passaram
              </p>
            </div>
          )}

          {/* ── Por Suite ───────────────────────────────── */}
          {suiteStats.length > 0 && (
            <div className="card">
              <h2>Por Test Suite</h2>
              <div style={{ display: "grid", gap: "10px", marginTop: "14px" }}>
                {suiteStats.map((ss) => {
                  const total = Number(ss.total);
                  const passed = Number(ss.passed);
                  const failed = Number(ss.failed);
                  const rate = total > 0 ? ((passed / total) * 100).toFixed(0) : 0;
                  return (
                    <div key={ss.suite_id} style={{ display: "flex", alignItems: "center", gap: "14px", padding: "12px 14px", background: "#f9fafb", borderRadius: "8px", border: "1px solid #e5e7eb" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: "600", fontSize: "14px", color: "#111827", marginBottom: "6px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {suiteName(ss.suite_id)}
                        </div>
                        <div style={{ background: "#e5e7eb", borderRadius: "4px", height: "8px", overflow: "hidden" }}>
                          <div style={{ background: "#10b981", height: "100%", width: `${rate}%`, transition: "width 0.4s ease" }} />
                        </div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0, fontSize: "12px", color: "#6b7280", lineHeight: "1.6" }}>
                        <div style={{ fontWeight: "700", fontSize: "16px", color: "#111827" }}>{rate}%</div>
                        <div>{passed} ✅ · {failed} ❌ · {total} total</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Gerar Relatório Filtrado ─────────────────── */}
          <div className="card">
            <h2>Gerar Relatório Filtrado</h2>
            <form onSubmit={handleGenerate} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: "12px", marginTop: "16px", alignItems: "end" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "13px", fontWeight: "500", color: "#374151" }}>
                Data início
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters((f) => ({ ...f, startDate: e.target.value }))}
                  style={{ padding: "9px 12px", border: "1.5px solid #d1d5db", borderRadius: "7px", fontSize: "14px" }}
                />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "13px", fontWeight: "500", color: "#374151" }}>
                Data fim
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters((f) => ({ ...f, endDate: e.target.value }))}
                  style={{ padding: "9px 12px", border: "1.5px solid #d1d5db", borderRadius: "7px", fontSize: "14px" }}
                />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "13px", fontWeight: "500", color: "#374151" }}>
                Test Suite
                <select
                  value={filters.suite_id}
                  onChange={(e) => setFilters((f) => ({ ...f, suite_id: e.target.value }))}
                  style={{ padding: "9px 12px", border: "1.5px solid #d1d5db", borderRadius: "7px", fontSize: "14px", background: "#fff" }}
                >
                  <option value="">Todas</option>
                  {suites.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
                </select>
              </label>
              <button type="submit" disabled={generating} style={{ padding: "10px 20px", whiteSpace: "nowrap" }}>
                {generating ? "Gerando…" : "Gerar"}
              </button>
            </form>
          </div>

          {/* ── Resultado Gerado ─────────────────────────── */}
          {generated && (
            <div className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "16px" }}>
                <h2 style={{ margin: 0 }}>Resultado do Relatório</h2>
                <button onClick={() => setGenerated(null)} style={{ background: "#6b7280", padding: "6px 14px", fontSize: "12px" }}>Limpar</button>
              </div>

              {/* Summary */}
              <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginBottom: "20px" }}>
                {[
                  { label: "Total", value: generated.summary.total, color: "#667eea" },
                  { label: "Passed", value: generated.summary.passed, color: "#10b981" },
                  { label: "Failed", value: generated.summary.failed, color: "#ef4444" },
                  { label: "Pending", value: generated.summary.pending, color: "#f59e0b" },
                  { label: "Taxa", value: `${generated.summary.successRate}%`, color: "#8b5cf6" },
                ].map((item) => (
                  <div key={item.label} style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "12px 20px", textAlign: "center" }}>
                    <div style={{ fontSize: "22px", fontWeight: "700", color: item.color }}>{item.value}</div>
                    <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "2px" }}>{item.label}</div>
                  </div>
                ))}
              </div>

              {/* Tabela de execuções filtradas */}
              {generated.executions.length === 0 ? (
                <p style={{ color: "#9ca3af" }}>Nenhuma execução encontrada com esses filtros.</p>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                    <thead>
                      <tr style={{ background: "#f9fafb", borderBottom: "2px solid #e5e7eb" }}>
                        {["#", "Suite", "Ambiente", "Status", "Data"].map((h) => (
                          <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: "600", color: "#6b7280" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {generated.executions.map((ex) => (
                        <tr key={ex.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                          <td style={{ padding: "10px 14px", fontWeight: "600", color: "#374151" }}>#{ex.id}</td>
                          <td style={{ padding: "10px 14px", color: "#374151" }}>{suiteName(ex.suite_id)}</td>
                          <td style={{ padding: "10px 14px", color: "#6b7280" }}>{ex.ambiente}</td>
                          <td style={{ padding: "10px 14px" }}><StatusBadge status={ex.status} /></td>
                          <td style={{ padding: "10px 14px", color: "#9ca3af" }}>{new Date(ex.created_at).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── Histórico recente ────────────────────────── */}
          <div className="card">
            <h2>Histórico Recente</h2>
            {recentExecutions.length === 0 ? (
              <p style={{ color: "#9ca3af" }}>Nenhuma execução registrada ainda</p>
            ) : (
              <div style={{ overflowX: "auto", marginTop: "14px" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                  <thead>
                    <tr style={{ background: "#f9fafb", borderBottom: "2px solid #e5e7eb" }}>
                      {["#", "Suite", "Ambiente", "Status", "Data"].map((h) => (
                        <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: "600", color: "#6b7280" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {recentExecutions.map((ex) => (
                      <tr key={ex.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                        <td style={{ padding: "10px 14px", fontWeight: "600", color: "#374151" }}>#{ex.id}</td>
                        <td style={{ padding: "10px 14px", color: "#374151" }}>{suiteName(ex.suite_id)}</td>
                        <td style={{ padding: "10px 14px", color: "#6b7280" }}>{ex.ambiente}</td>
                        <td style={{ padding: "10px 14px" }}><StatusBadge status={ex.status} /></td>
                        <td style={{ padding: "10px 14px", color: "#9ca3af" }}>{new Date(ex.created_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}

      {toast.message && <div className={`toast ${toast.type}`}>{toast.message}</div>}
    </div>
  );
}
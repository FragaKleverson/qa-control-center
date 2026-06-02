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
  const [downloading, setDownloading] = useState(false);

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

  // Baixa o relatório atual como arquivo .docx
  async function handleExportDocx(e) {
    e.preventDefault();
    setDownloading(true);
    try {
      const payload = {};
      if (filters.startDate) payload.startDate = filters.startDate;
      if (filters.endDate)   payload.endDate   = filters.endDate;
      if (filters.suite_id)  payload.suite_id  = Number(filters.suite_id);
      const response = await reportsAPI.exportDocx(payload);
      if (!response.ok) throw new Error("Erro ao exportar relatório");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `qa-report-${new Date().toISOString().slice(0, 10)}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToast("Relatório exportado com sucesso!", "success");
    } catch (err) {
      console.error(err);
      showToast("Erro ao exportar .docx", "error");
    } finally {
      setDownloading(false);
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
          {stats.total > 0 && (() => {
            const tcPassed  = stats.passed  || 0;
            const tcFailed  = stats.failed  || 0;
            const tcBlocked = stats.blocked || 0;
            const tcSkipped = stats.skipped || 0;
            const tcPending = stats.pending || 0;
            const tcTotal   = stats.total;
            const pct = (v) => `${((v / tcTotal) * 100).toFixed(1)}%`;
            return (
              <div className="card">
                <h2>Taxa de Sucesso de Test Cases</h2>
                {/* Barra multi-cor */}
                <div style={{ display: "flex", height: "28px", borderRadius: "8px", overflow: "hidden", background: "#e5e7eb", marginTop: "12px" }}>
                  {tcPassed  > 0 && <div style={{ width: pct(tcPassed),  background: "#10b981", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "11px", fontWeight: "700" }}>{pct(tcPassed)}</div>}
                  {tcFailed  > 0 && <div style={{ width: pct(tcFailed),  background: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "11px", fontWeight: "700" }}>{pct(tcFailed)}</div>}
                  {tcBlocked > 0 && <div style={{ width: pct(tcBlocked), background: "#a21caf", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "11px", fontWeight: "700" }}>{pct(tcBlocked)}</div>}
                  {tcSkipped > 0 && <div style={{ width: pct(tcSkipped), background: "#9ca3af", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "11px", fontWeight: "700" }}>{pct(tcSkipped)}</div>}
                  {tcPending > 0 && <div style={{ width: pct(tcPending), background: "#f59e0b", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "11px", fontWeight: "700" }}>{pct(tcPending)}</div>}
                </div>
                {/* Legenda */}
                <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", marginTop: "10px", fontSize: "12px" }}>
                  {tcPassed  > 0 && <span style={{ color: "#15803d",  fontWeight: "600" }}>✅ Passed: {tcPassed}</span>}
                  {tcFailed  > 0 && <span style={{ color: "#991b1b",  fontWeight: "600" }}>❌ Failed: {tcFailed}</span>}
                  {tcBlocked > 0 && <span style={{ color: "#a21caf",  fontWeight: "600" }}>⛔ Blocked: {tcBlocked}</span>}
                  {tcSkipped > 0 && <span style={{ color: "#6b7280",  fontWeight: "600" }}>⏭ Skipped: {tcSkipped}</span>}
                  {tcPending > 0 && <span style={{ color: "#92400e",  fontWeight: "600" }}>⏳ Pending: {tcPending}</span>}
                  <span style={{ color: "#9ca3af" }}>/ {tcTotal} total · {successRate}% success</span>
                </div>
              </div>
            );
          })()}

          {/* ── Por Suite ───────────────────────────────── */}
          {suiteStats.length > 0 && (
            <div className="card">
              <h2>Por Test Suite</h2>
              <div style={{ display: "grid", gap: "10px", marginTop: "14px" }}>
                {suiteStats.map((ss) => {
                  const total   = Number(ss.total)   || 0;
                  const passed  = Number(ss.passed)  || 0;
                  const failed  = Number(ss.failed)  || 0;
                  const blocked = Number(ss.blocked) || 0;
                  const skipped = Number(ss.skipped) || 0;
                  const pending = Number(ss.pending) || 0;
                  const rate = total > 0 ? ((passed / total) * 100).toFixed(0) : 0;
                  const pct = (v) => total > 0 ? `${((v / total) * 100).toFixed(1)}%` : "0%";
                  // usa ss.nome se vier do backend, fallback ao helper
                  const nome = ss.nome || suiteName(ss.suite_id);
                  return (
                    <div key={ss.suite_id} style={{ padding: "12px 14px", background: "#f9fafb", borderRadius: "8px", border: "1px solid #e5e7eb" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                        <div style={{ fontWeight: "600", fontSize: "14px", color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {nome}
                        </div>
                        <div style={{ fontWeight: "700", fontSize: "15px", color: passed === total && total > 0 ? "#15803d" : failed > 0 ? "#991b1b" : "#111827", flexShrink: 0, marginLeft: "12px" }}>
                          {rate}% passed
                        </div>
                      </div>
                      {/* Barra multi-cor */}
                      {total > 0 ? (
                        <div style={{ display: "flex", height: "10px", borderRadius: "5px", overflow: "hidden", background: "#e5e7eb", marginBottom: "8px" }}>
                          {passed  > 0 && <div style={{ width: pct(passed),  background: "#10b981", transition: "width 0.4s ease" }} />}
                          {failed  > 0 && <div style={{ width: pct(failed),  background: "#ef4444", transition: "width 0.4s ease" }} />}
                          {blocked > 0 && <div style={{ width: pct(blocked), background: "#a21caf", transition: "width 0.4s ease" }} />}
                          {skipped > 0 && <div style={{ width: pct(skipped), background: "#9ca3af", transition: "width 0.4s ease" }} />}
                          {pending > 0 && <div style={{ width: pct(pending), background: "#f59e0b", transition: "width 0.4s ease" }} />}
                        </div>
                      ) : (
                        <div style={{ height: "10px", borderRadius: "5px", background: "#e5e7eb", marginBottom: "8px" }} />
                      )}
                      {/* Legenda */}
                      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", fontSize: "11px" }}>
                        {passed  > 0 && <span style={{ color: "#15803d", fontWeight: "600" }}>✅ {passed}</span>}
                        {failed  > 0 && <span style={{ color: "#991b1b", fontWeight: "600" }}>❌ {failed}</span>}
                        {blocked > 0 && <span style={{ color: "#a21caf", fontWeight: "600" }}>⛔ {blocked}</span>}
                        {skipped > 0 && <span style={{ color: "#6b7280", fontWeight: "600" }}>⏭ {skipped}</span>}
                        {pending > 0 && <span style={{ color: "#92400e", fontWeight: "600" }}>⏳ {pending}</span>}
                        <span style={{ color: "#9ca3af" }}>/ {total} test cases</span>
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
            <form onSubmit={handleGenerate} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto auto", gap: "12px", marginTop: "16px", alignItems: "end" }}>
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
              <button
                type="button"
                onClick={handleExportDocx}
                disabled={downloading}
                style={{ padding: "10px 20px", whiteSpace: "nowrap", background: "#10b981" }}
              >
                {downloading ? "Exportando…" : "⬇ .docx"}
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

              {/* Summary — test cases */}
              {(() => {
                const tc = generated.summary.testCases || {};
                const tcTotal = tc.total || 0;
                const tcPassed = tc.passed || 0;
                const tcFailed = tc.failed || 0;
                const tcBlocked = tc.blocked || 0;
                const tcSkipped = tc.skipped || 0;
                const tcPending = tc.pending || 0;
                const tcRate = tcTotal > 0 ? ((tcPassed / tcTotal) * 100).toFixed(1) : 0;
                return (
                  <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "16px" }}>
                    {[
                      { label: "Execuções", value: generated.summary.total, color: "#667eea" },
                      { label: "TC Passou", value: tcPassed, color: "#10b981" },
                      { label: "TC Falhou", value: tcFailed, color: "#ef4444" },
                      { label: "TC Blocked", value: tcBlocked, color: "#a21caf" },
                      { label: "TC Skipped", value: tcSkipped, color: "#6b7280" },
                      { label: "TC Pending", value: tcPending, color: "#f59e0b" },
                      { label: "Taxa TC", value: `${tcRate}%`, color: "#8b5cf6" },
                    ].map((item) => (
                      <div key={item.label} style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "12px 20px", textAlign: "center" }}>
                        <div style={{ fontSize: "22px", fontWeight: "700", color: item.color }}>{item.value}</div>
                        <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "2px" }}>{item.label}</div>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {/* Lista de execuções com test cases */}
              {generated.executions.length === 0 ? (
                <p style={{ color: "#9ca3af" }}>Nenhuma execução encontrada com esses filtros.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {generated.executions.map((ex, i) => (
                    <div key={ex.id} style={{ border: "1px solid #e5e7eb", borderRadius: "8px", overflow: "hidden" }}>
                      {/* Cabeçalho da execução */}
                      <div style={{ background: "#f9fafb", padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                        <div>
                          <span style={{ fontWeight: "700", color: "#111827", fontSize: "14px" }}>
                            #{i + 1} — {suiteName(ex.suite_id)}
                          </span>
                          <span style={{ color: "#9ca3af", fontSize: "12px", marginLeft: "12px" }}>
                            {ex.ambiente} · {new Date(ex.created_at).toLocaleString()}
                          </span>
                        </div>
                        <StatusBadge status={ex.status} />
                      </div>

                      {/* Test cases da execução */}
                      {ex.testCases && ex.testCases.length > 0 ? (
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                          <thead>
                            <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                              {["ID", "Título do Test Case", "Status", "Observação"].map((h) => (
                                <th key={h} style={{ padding: "8px 14px", textAlign: "left", fontWeight: "600", color: "#6b7280", fontSize: "11px", textTransform: "uppercase" }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {ex.testCases.map((tc) => (
                              <tr key={tc.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                                <td style={{ padding: "9px 14px", color: "#9ca3af", fontSize: "12px", whiteSpace: "nowrap" }}>#{tc.projeto_id}</td>
                                <td style={{ padding: "9px 14px", color: "#111827", fontWeight: "500" }}>{tc.titulo}</td>
                                <td style={{ padding: "9px 14px" }}><StatusBadge status={tc.status} /></td>
                                <td style={{ padding: "9px 14px", color: "#6b7280", fontSize: "12px" }}>{tc.comentario || "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <p style={{ padding: "12px 16px", color: "#9ca3af", fontSize: "13px", margin: 0 }}>
                          Nenhum test case registrado nesta execução.
                        </p>
                      )}
                    </div>
                  ))}
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
import { useState, useEffect, useRef } from "react";
import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";
import GherkinDisplay from "../components/GherkinDisplay";
import { executionsAPI, testSuitesAPI } from "../services/api";
import "./Pages.css";

const STATUS_OPTIONS = [
  { value: "pending",  label: "Pending",  bg: "#fef3c7", color: "#92400e" },
  { value: "running",  label: "Running",  bg: "#dbeafe", color: "#0c4a6e" },
  { value: "passed",   label: "Passed",   bg: "#dcfce7", color: "#15803d" },
  { value: "failed",   label: "Failed",   bg: "#fee2e2", color: "#991b1b" },
  { value: "blocked",  label: "Blocked",  bg: "#fce7f3", color: "#9d174d" },
  { value: "skipped",  label: "Skipped",  bg: "#f3f4f6", color: "#6b7280" },
];

function getStatusInfo(status) {
  return STATUS_OPTIONS.find((s) => s.value === status) || STATUS_OPTIONS[0];
}

export default function Executions() {
  const [executions, setExecutions] = useState([]);
  const [suites, setSuites] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [resultsMap, setResultsMap] = useState({});
  const [loadingResults, setLoadingResults] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedResult, setSelectedResult] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ suite_id: "", ambiente: "staging", status: "pending" });
  const toastTimerRef = useRef(null);
  const [toast, setToast] = useState({ message: "", type: "" });
  const [confirmState, setConfirmState] = useState({ isOpen: false, message: "", onConfirm: null, danger: true });

  useEffect(() => {
    loadExecutions();
    loadSuites();
  }, []);

  function showToast(message, type = "info") {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => setToast({ message: "", type: "" }), 3000);
  }

  async function loadExecutions() {
    try {
      const data = await executionsAPI.list();
      setExecutions(data);
    } catch (err) {
      console.error(err);
      showToast("Erro ao carregar execuções", "error");
    }
  }

  async function loadSuites() {
    try {
      const data = await testSuitesAPI.list();
      setSuites(data);
    } catch (err) {
      console.error(err);
    }
  }

  async function toggleExpand(executionId) {
    if (expandedId === executionId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(executionId);
    if (!resultsMap[executionId]) {
      setLoadingResults((prev) => ({ ...prev, [executionId]: true }));
      try {
        const results = await executionsAPI.getResults(executionId);
        setResultsMap((prev) => ({ ...prev, [executionId]: results }));
      } catch (err) {
        console.error(err);
        showToast("Erro ao carregar test cases da execução", "error");
      } finally {
        setLoadingResults((prev) => ({ ...prev, [executionId]: false }));
      }
    }
  }

  async function handleUpdateResultStatus(execucaoId, projetoId, newStatus) {
    try {
      await executionsAPI.updateResult(execucaoId, projetoId, { status: newStatus });
      // Atualiza local
      setResultsMap((prev) => ({
        ...prev,
        [execucaoId]: prev[execucaoId].map((r) =>
          r.projeto_id === projetoId ? { ...r, status: newStatus } : r
        ),
      }));
      // Reload executions para atualizar status geral
      loadExecutions();
      showToast("Status atualizado!", "success");
    } catch (err) {
      console.error(err);
      showToast("Erro ao atualizar status", "error");
    }
  }

  async function handleRunExecution(e) {
    e.preventDefault();
    setLoading(true);
    if (!formData.suite_id) {
      showToast("Selecione uma test suite", "warning");
      setLoading(false);
      return;
    }
    try {
      const res = await executionsAPI.create(formData);
      if (res.error) throw new Error(res.error);
      showToast("Execução iniciada com sucesso!", "success");
      setFormData({ suite_id: "", ambiente: "staging", status: "pending" });
      setIsModalOpen(false);
      loadExecutions();
    } catch (err) {
      console.error(err);
      showToast("Erro ao executar test suite", "error");
    } finally {
      setLoading(false);
    }
  }

  function handleDeleteExecution(id) {
    setConfirmState({
      isOpen: true,
      message: "Deseja deletar esta execução?",
      danger: true,
      onConfirm: async () => {
        setConfirmState((s) => ({ ...s, isOpen: false }));
        try {
          await executionsAPI.delete(id);
          showToast("Execução deletada", "success");
          setResultsMap((prev) => { const next = { ...prev }; delete next[id]; return next; });
          if (expandedId === id) setExpandedId(null);
          loadExecutions();
        } catch (err) {
          console.error(err);
          showToast("Erro ao deletar execução", "error");
        }
      },
    });
  }

  function openResultDetail(result) {
    setSelectedResult(result);
    setIsDetailOpen(true);
  }

  return (
    <div className="page">
      <h1>Test Executions</h1>
      <p>Execute and monitor your test suites</p>

      <div className="page-content">
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h2>Start New Execution</h2>
              <p>Run a test suite to verify your application</p>
            </div>
            <button onClick={() => setIsModalOpen(true)}>Run Suite</button>
          </div>
        </div>

        <div className="card">
          <h2>Execution History ({executions.length})</h2>
          {executions.length === 0 ? (
            <p>No executions yet. Start by running a test suite!</p>
          ) : (
            <div style={{ display: "grid", gap: "16px", marginTop: "16px" }}>
              {executions.map((execution) => {
                const statusInfo = getStatusInfo(execution.status);
                const isExpanded = expandedId === execution.id;
                const results = resultsMap[execution.id] || [];
                const isLoadingR = loadingResults[execution.id];

                return (
                  <div key={execution.id} style={{ background: "#f9fafb", borderRadius: "8px", border: "1px solid #e5e7eb", overflow: "hidden" }}>
                    {/* Cabeçalho da execução */}
                    <div style={{ padding: "16px", display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                      <div style={{ flex: 1 }}>
                        <h3 style={{ margin: "0 0 6px 0", color: "#111827" }}>
                          {execution.nome_suite || `Suite #${execution.suite_id}`}
                        </h3>
                        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap", marginBottom: "6px" }}>
                          <span style={{ background: statusInfo.bg, color: statusInfo.color, padding: "4px 10px", borderRadius: "6px", fontSize: "12px", fontWeight: "600" }}>
                            {statusInfo.label}
                          </span>
                          <span style={{ color: "#9ca3af", fontSize: "12px" }}>Ambiente: {execution.ambiente}</span>
                          {execution.total_cases > 0 && (
                            <span style={{ color: "#6b7280", fontSize: "12px" }}>
                              {execution.passed_cases}/{execution.total_cases} passed · {execution.failed_cases} failed
                            </span>
                          )}
                        </div>
                        <p style={{ margin: "0", color: "#9ca3af", fontSize: "12px" }}>
                          {new Date(execution.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                        <button
                          onClick={() => toggleExpand(execution.id)}
                          style={{ background: "#6366f1", padding: "8px 14px", fontSize: "12px" }}
                        >
                          {isExpanded ? "Fechar" : "Ver Cases"}
                        </button>
                        <button
                          onClick={() => handleDeleteExecution(execution.id)}
                          style={{ background: "#ef4444", padding: "8px 14px", fontSize: "12px" }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    {/* Painel expandido: test cases */}
                    {isExpanded && (
                      <div style={{ borderTop: "1px solid #e5e7eb", padding: "16px", background: "#fff" }}>
                        {isLoadingR ? (
                          <p style={{ color: "#9ca3af", fontSize: "14px" }}>Carregando test cases...</p>
                        ) : results.length === 0 ? (
                          <p style={{ color: "#9ca3af", fontSize: "14px" }}>
                            Nenhum test case nesta execução. Use <strong>Test Plans &gt; Execute</strong> para criar execuções com test cases vinculados.
                          </p>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                              <span style={{ fontSize: "13px", fontWeight: "700", color: "#374151" }}>
                                Test Cases ({results.length})
                              </span>
                            </div>
                            {results.map((result) => {
                              const rs = getStatusInfo(result.status);
                              return (
                                <div key={result.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "#f9fafb", borderRadius: "6px", border: `1px solid ${rs.bg}` }}>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
                                      <span style={{ background: rs.bg, color: rs.color, padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: "600", whiteSpace: "nowrap" }}>
                                        {rs.label}
                                      </span>
                                      <span style={{ fontWeight: "600", color: "#111827", fontSize: "14px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                        {result.titulo}
                                      </span>
                                    </div>
                                    {result.comentario && (
                                      <p style={{ margin: "0", color: "#6b7280", fontSize: "12px" }}>{result.comentario}</p>
                                    )}
                                  </div>
                                  <div style={{ display: "flex", gap: "6px", flexShrink: 0, marginLeft: "12px" }}>
                                    <button
                                      onClick={() => openResultDetail(result)}
                                      style={{ background: "#e5e7eb", color: "#374151", padding: "4px 10px", fontSize: "11px" }}
                                    >
                                      Ver
                                    </button>
                                    <select
                                      value={result.status}
                                      onChange={(e) => handleUpdateResultStatus(execution.id, result.projeto_id, e.target.value)}
                                      style={{ padding: "4px 8px", borderRadius: "6px", border: "1px solid #e5e7eb", background: rs.bg, color: rs.color, cursor: "pointer", fontSize: "11px", fontWeight: "600" }}
                                    >
                                      {STATUS_OPTIONS.map((s) => (
                                        <option key={s.value} value={s.value}>{s.label}</option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal: Criar execução manual */}
      <Modal isOpen={isModalOpen} title="Run Test Suite" onClose={() => setIsModalOpen(false)}>
        <form onSubmit={handleRunExecution}>
          <label style={{ display: "block", marginBottom: "16px" }}>
            <span style={{ fontSize: "14px", fontWeight: "600", color: "#111827" }}>Test Suite</span>
            <select
              value={formData.suite_id}
              onChange={(e) => setFormData({ ...formData, suite_id: e.target.value })}
              required
              style={{ width: "100%", padding: "12px", marginTop: "8px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "14px" }}
            >
              <option value="">Selecione uma suite</option>
              {suites.map((suite) => (
                <option key={suite.id} value={suite.id}>{suite.nome}</option>
              ))}
            </select>
          </label>
          <label style={{ display: "block", marginBottom: "16px" }}>
            <span style={{ fontSize: "14px", fontWeight: "600", color: "#111827" }}>Ambiente</span>
            <select
              value={formData.ambiente}
              onChange={(e) => setFormData({ ...formData, ambiente: e.target.value })}
              style={{ width: "100%", padding: "12px", marginTop: "8px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "14px" }}
            >
              <option value="staging">Staging</option>
              <option value="production">Production</option>
              <option value="dev">Dev</option>
              <option value="qa">QA</option>
            </select>
          </label>
          <div style={{ display: "flex", gap: "12px", marginTop: "20px" }}>
            <button type="submit" disabled={loading}>{loading ? "Starting..." : "Run"}</button>
            <button type="button" onClick={() => setIsModalOpen(false)} style={{ background: "#6b7280" }}>Cancel</button>
          </div>
        </form>
      </Modal>

      {/* Modal: Detalhe do test case */}
      <Modal
        isOpen={isDetailOpen}
        title={selectedResult?.titulo || "Test Case"}
        onClose={() => { setIsDetailOpen(false); setSelectedResult(null); }}
      >
        {selectedResult && (
          <div>
            <div style={{ marginBottom: "12px" }}>
              <p style={{ margin: "0 0 4px 0", color: "#6b7280", fontSize: "12px", fontWeight: "600", textTransform: "uppercase" }}>Descrição</p>
              <p style={{ margin: "0", color: "#111827" }}>{selectedResult.descricao}</p>
            </div>
            <div style={{ marginBottom: "16px" }}>
              <p style={{ margin: "0 0 4px 0", color: "#6b7280", fontSize: "12px", fontWeight: "600", textTransform: "uppercase" }}>Feature</p>
              <code style={{ display: "block", background: "#f3f4f6", padding: "8px 12px", borderRadius: "6px", fontSize: "13px", color: "#374151" }}>
                {selectedResult.feature}
              </code>
            </div>
            <div>
              <p style={{ margin: "0 0 10px 0", color: "#6b7280", fontSize: "12px", fontWeight: "600", textTransform: "uppercase" }}>
                Cenários ({selectedResult.cenarios && Array.isArray(selectedResult.cenarios) ? selectedResult.cenarios.length : 0})
              </p>
              {selectedResult.cenarios && Array.isArray(selectedResult.cenarios) && selectedResult.cenarios.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {selectedResult.cenarios.map((cenario, idx) => (
                    <GherkinDisplay key={idx} testCase={cenario} />
                  ))}
                </div>
              ) : (
                <p style={{ color: "#9ca3af", fontSize: "14px" }}>Nenhum cenário definido</p>
              )}
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={confirmState.isOpen}
        message={confirmState.message}
        danger={confirmState.danger}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState((s) => ({ ...s, isOpen: false }))}
      />
      {toast.message && <div className={`toast ${toast.type}`}>{toast.message}</div>}
    </div>
  );
}

import { useState, useEffect, useRef } from "react";
import Modal from "../components/Modal";
import { executionsAPI, testSuitesAPI } from "../services/api";
import "./Pages.css";

export default function Executions() {
  const [executions, setExecutions] = useState([]);
  const [suites, setSuites] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    suite_id: "",
    ambiente: "staging",
    status: "pending"
  });
  const toastTimerRef = useRef(null);
  const [toast, setToast] = useState({ message: "", type: "" });

  useEffect(() => {
    loadExecutions();
    loadSuites();
  }, []);

  function showToast(message, type = "info") {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => {
      setToast({ message: "", type: "" });
    }, 3000);
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

      if (!res.ok) {
        showToast(await res.text(), "error");
        setLoading(false);
        return;
      }

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

  async function handleUpdateStatus(id, newStatus) {
    try {
      const res = await executionsAPI.update(id, { status: newStatus });

      if (!res.ok) throw new Error("Failed to update");
      showToast("Status atualizado!", "success");
      loadExecutions();
    } catch (err) {
      console.error(err);
      showToast("Erro ao atualizar status", "error");
    }
  }

  async function handleDeleteExecution(id) {
    if (!confirm("Deseja deletar esta execução?")) return;

    try {
      await executionsAPI.delete(id);

      if (!res.ok) throw new Error("Failed to delete");
      showToast("Execução deletada", "success");
      loadExecutions();
    } catch (err) {
      console.error(err);
      showToast("Erro ao deletar execução", "error");
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "passed":
        return { bg: "#dcfce7", color: "#15803d", label: "✅ Passed" };
      case "failed":
        return { bg: "#fee2e2", color: "#991b1b", label: "❌ Failed" };
      case "running":
        return { bg: "#dbeafe", color: "#0c4a6e", label: "⏳ Running" };
      case "pending":
        return { bg: "#fef3c7", color: "#92400e", label: "⏸️ Pending" };
      default:
        return { bg: "#f3f4f6", color: "#6b7280", label: status };
    }
  };

  return (
    <div className="page">
      <h1>🚀 Test Executions</h1>
      <p>Execute and monitor your test suites</p>

      <div className="page-content">
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h2>Start New Execution</h2>
              <p>Run a test suite to verify your application</p>
            </div>
            <button onClick={() => setIsModalOpen(true)}>▶️ Run Suite</button>
          </div>
        </div>

        <div className="card">
          <h2>Execution History ({executions.length})</h2>
          {executions.length === 0 ? (
            <p>No executions yet. Start by running a test suite!</p>
          ) : (
            <div style={{ display: "grid", gap: "16px", marginTop: "16px" }}>
              {executions.map((execution) => {
                const statusInfo = getStatusColor(execution.status);
                return (
                  <div
                    key={execution.id}
                    style={{
                      padding: "16px",
                      background: "#f9fafb",
                      borderRadius: "8px",
                      border: "1px solid #e5e7eb"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                      <div style={{ flex: 1 }}>
                        <h3 style={{ margin: "0 0 8px 0", color: "#111827" }}>
                          Suite #{execution.suite_id}
                        </h3>
                        <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "8px" }}>
                          <span
                            style={{
                              background: statusInfo.bg,
                              color: statusInfo.color,
                              padding: "6px 12px",
                              borderRadius: "6px",
                              fontSize: "12px",
                              fontWeight: "600"
                            }}
                          >
                            {statusInfo.label}
                          </span>
                          <span style={{ color: "#9ca3af", fontSize: "12px" }}>
                            Ambiente: {execution.ambiente}
                          </span>
                        </div>
                        <p style={{ margin: "0", color: "#9ca3af", fontSize: "12px" }}>
                          {new Date(execution.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <select
                          value={execution.status}
                          onChange={(e) => handleUpdateStatus(execution.id, e.target.value)}
                          style={{
                            padding: "8px 12px",
                            borderRadius: "6px",
                            border: "1px solid #e5e7eb",
                            background: "white",
                            cursor: "pointer",
                            fontSize: "12px"
                          }}
                        >
                          <option value="pending">Pending</option>
                          <option value="running">Running</option>
                          <option value="passed">Passed</option>
                          <option value="failed">Failed</option>
                        </select>
                        <button
                          onClick={() => handleDeleteExecution(execution.id)}
                          style={{
                            background: "#ef4444",
                            padding: "8px 16px",
                            fontSize: "12px"
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        title="Run Test Suite"
        onClose={() => setIsModalOpen(false)}
      >
        <form onSubmit={handleRunExecution}>
          <label style={{ display: "block", marginBottom: "16px" }}>
            <span style={{ fontSize: "14px", fontWeight: "600", color: "#111827" }}>Test Suite</span>
            <select
              value={formData.suite_id}
              onChange={(e) => setFormData({ ...formData, suite_id: e.target.value })}
              required
              style={{
                width: "100%",
                padding: "12px",
                marginTop: "8px",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                fontSize: "14px"
              }}
            >
              <option value="">Selecione uma suite</option>
              {suites.map((suite) => (
                <option key={suite.id} value={suite.id}>
                  {suite.nome}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "block", marginBottom: "16px" }}>
            <span style={{ fontSize: "14px", fontWeight: "600", color: "#111827" }}>Environment</span>
            <select
              value={formData.ambiente}
              onChange={(e) => setFormData({ ...formData, ambiente: e.target.value })}
              style={{
                width: "100%",
                padding: "12px",
                marginTop: "8px",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                fontSize: "14px"
              }}
            >
              <option value="staging">Staging</option>
              <option value="production">Production</option>
              <option value="development">Development</option>
              <option value="qa">QA</option>
            </select>
          </label>

          <div style={{ display: "flex", gap: "12px", marginTop: "20px" }}>
            <button type="submit" disabled={loading}>
              {loading ? "Running..." : "▶️ Run Now"}
            </button>
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              style={{ background: "#6b7280" }}
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      {toast.message && (
        <div className={`toast ${toast.type}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
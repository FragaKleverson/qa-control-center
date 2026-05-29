import { useState, useEffect, useRef } from "react";
import { executionsAPI, reportsAPI } from "../services/api";
import "./Pages.css";

export default function Reports() {
  const [stats, setStats] = useState({
    total: 0,
    passed: 0,
    failed: 0,
    pending: 0
  });
  const [executions, setExecutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const toastTimerRef = useRef(null);
  const [toast, setToast] = useState({ message: "", type: "" });

  useEffect(() => {
    loadReports();
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

  async function loadReports() {
    setLoading(true);
    try {
      const [statsData, reportsData] = await Promise.all([
        executionsAPI.getStats(),
        reportsAPI.list()
      ]);
      setStats(statsData);
      setExecutions(reportsData.executions || []);
    } catch (err) {
      console.error(err);
      showToast("Erro ao carregar relatório", "error");
    } finally {
      setLoading(false);
    }
  }

  const successRate = stats.total > 0 ? ((stats.passed / stats.total) * 100).toFixed(1) : 0;
  const failureRate = stats.total > 0 ? ((stats.failed / stats.total) * 100).toFixed(1) : 0;

  const getStatusIcon = (status) => {
    switch (status) {
      case "passed":
        return "✅";
      case "failed":
        return "❌";
      case "running":
        return "⏳";
      case "pending":
        return "⏸️";
      default:
        return "❓";
    }
  };

  return (
    <div className="page">
      <h1>📈 Test Reports</h1>
      <p>Comprehensive analysis of your test executions</p>

      {loading ? (
        <p style={{ color: "#6b7280", textAlign: "center", padding: "40px" }}>Carregando relatório...</p>
      ) : (
        <div className="page-content">
          {/* Stats Overview */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "16px",
            marginBottom: "24px"
          }}>
            <div style={{
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "white",
              padding: "20px",
              borderRadius: "8px",
              textAlign: "center"
            }}>
              <div style={{ fontSize: "32px", fontWeight: "700", marginBottom: "8px" }}>
                {stats.total}
              </div>
              <div style={{ fontSize: "14px", opacity: 0.9 }}>Total Executions</div>
            </div>

            <div style={{
              background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
              color: "white",
              padding: "20px",
              borderRadius: "8px",
              textAlign: "center"
            }}>
              <div style={{ fontSize: "32px", fontWeight: "700", marginBottom: "8px" }}>
                {stats.passed}
              </div>
              <div style={{ fontSize: "14px", opacity: 0.9 }}>Passed ({successRate}%)</div>
            </div>

            <div style={{
              background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
              color: "white",
              padding: "20px",
              borderRadius: "8px",
              textAlign: "center"
            }}>
              <div style={{ fontSize: "32px", fontWeight: "700", marginBottom: "8px" }}>
                {stats.failed}
              </div>
              <div style={{ fontSize: "14px", opacity: 0.9 }}>Failed ({failureRate}%)</div>
            </div>

            <div style={{
              background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
              color: "white",
              padding: "20px",
              borderRadius: "8px",
              textAlign: "center"
            }}>
              <div style={{ fontSize: "32px", fontWeight: "700", marginBottom: "8px" }}>
                {stats.pending}
              </div>
              <div style={{ fontSize: "14px", opacity: 0.9 }}>Pending</div>
            </div>
          </div>

          {/* Success Rate Bar */}
          {stats.total > 0 && (
            <div className="card" style={{ marginBottom: "24px" }}>
              <h2>Success Rate</h2>
              <div style={{ marginTop: "16px" }}>
                <div style={{
                  background: "#e5e7eb",
                  borderRadius: "8px",
                  height: "32px",
                  overflow: "hidden",
                  display: "flex"
                }}>
                  <div style={{
                    background: "linear-gradient(90deg, #10b981 0%, #059669 100%)",
                    height: "100%",
                    width: `${successRate}%`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontWeight: "600",
                    fontSize: "14px"
                  }}>
                    {successRate > 10 && `${successRate}%`}
                  </div>
                </div>
                <p style={{ marginTop: "12px", color: "#6b7280", fontSize: "14px" }}>
                  {stats.passed} de {stats.total} execuções passaram com sucesso
                </p>
              </div>
            </div>
          )}

          {/* Recent Executions */}
          <div className="card">
            <h2>Recent Executions</h2>
            {executions.length === 0 ? (
              <p style={{ color: "#9ca3af" }}>Nenhuma execução registrada ainda</p>
            ) : (
              <div style={{
                marginTop: "16px",
                maxHeight: "400px",
                overflowY: "auto"
              }}>
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr 1fr",
                  gap: "12px",
                  marginBottom: "12px",
                  padding: "12px",
                  background: "#f9fafb",
                  borderRadius: "6px",
                  fontWeight: "600",
                  fontSize: "12px",
                  color: "#6b7280",
                  position: "sticky",
                  top: 0
                }}>
                  <div>ID</div>
                  <div>Ambiente</div>
                  <div>Status</div>
                  <div>Data</div>
                </div>
                {executions.map((execution) => (
                  <div
                    key={execution.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr 1fr 1fr",
                      gap: "12px",
                      padding: "12px",
                      borderBottom: "1px solid #e5e7eb",
                      fontSize: "13px",
                      alignItems: "center"
                    }}
                  >
                    <div style={{ fontWeight: "600" }}>#{execution.id}</div>
                    <div style={{ color: "#6b7280" }}>{execution.ambiente}</div>
                    <div>
                      <span style={{
                        background: execution.status === 'passed' ? '#dcfce7' :
                                   execution.status === 'failed' ? '#fee2e2' :
                                   execution.status === 'running' ? '#dbeafe' : '#fef3c7',
                        color: execution.status === 'passed' ? '#15803d' :
                               execution.status === 'failed' ? '#991b1b' :
                               execution.status === 'running' ? '#0c4a6e' : '#92400e',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: '600'
                      }}>
                        {getStatusIcon(execution.status)} {execution.status}
                      </span>
                    </div>
                    <div style={{ color: "#9ca3af", fontSize: "12px" }}>
                      {new Date(execution.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {toast.message && (
        <div className={`toast ${toast.type}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
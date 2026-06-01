import { useState, useEffect, useRef } from "react";
import Modal from "../components/Modal";
import GherkinDisplay from "../components/GherkinDisplay";
import { projectsAPI, executionsAPI } from "../services/api";
import "./Dashboard.css";

export default function Dashboard() {
  const [projects, setProjects] = useState([]);
  const [testCases, setTestCases] = useState([]);
  const [executions, setExecutions] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [modalType, setModalType] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const toastTimerRef = useRef(null);
  const [toast, setToast] = useState({ message: "", type: "" });

  useEffect(() => {
    loadDashboard();
  }, []);

  // Exibe uma notificação temporária por 3 segundos
  function showToast(message, type = "info") {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => {
      setToast({ message: "", type: "" });
    }, 3000);
  }

  // Busca projetos e execuções em paralelo e alimenta os cards
  async function loadDashboard() {
    try {
      const [projectsData, executionsData] = await Promise.all([
        projectsAPI.list(),
        executionsAPI.list()
      ]);

      setProjects(projectsData);
      setTestCases(projectsData);
      setExecutions(executionsData);
    } catch (err) {
      console.error(err);
      showToast("Erro ao carregar dashboard", "error");
    }
  }

  // Abre o modal de detalhe de um item (projeto, test case ou execução)
  const openModal = (type, item) => {
    setModalType(type);
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  // Fecha o modal e limpa o item selecionado
  const closeModal = () => {
    setIsModalOpen(false);
    setModalType(null);
    setSelectedItem(null);
  };

  // Renderiza o conteúdo do modal conforme o tipo do item selecionado
  const renderModalContent = () => {
    if (!selectedItem) return null;

    if (modalType === "projects") {
      return (
        <div>
          <h3 style={{ margin: "0 0 16px 0", color: "#111827" }}>📁 {selectedItem.titulo}</h3>
          <div style={{ marginBottom: "16px" }}>
            <p style={{ margin: "0 0 8px 0", color: "#6b7280", fontSize: "14px" }}>
              <strong>Descrição:</strong>
            </p>
            <p style={{ margin: "0", color: "#111827" }}>{selectedItem.descricao}</p>
          </div>
          <div>
            <p style={{ margin: "0 0 8px 0", color: "#6b7280", fontSize: "14px" }}>
              <strong>Feature:</strong>
            </p>
            <p style={{ margin: "0", color: "#111827" }}>{selectedItem.feature}</p>
          </div>
        </div>
      );
    }

    if (modalType === "testCases") {
      return (
        <div>
          <h3 style={{ margin: "0 0 16px 0", color: "#111827" }}>🧪 {selectedItem.titulo}</h3>
          <div style={{ marginBottom: "16px" }}>
            <p style={{ margin: "0 0 4px 0", color: "#6b7280", fontSize: "12px", fontWeight: "600", textTransform: "uppercase" }}>Descrição</p>
            <p style={{ margin: "0", color: "#111827" }}>{selectedItem.descricao}</p>
          </div>
          <div style={{ marginBottom: "20px" }}>
            <p style={{ margin: "0 0 4px 0", color: "#6b7280", fontSize: "12px", fontWeight: "600", textTransform: "uppercase" }}>Feature</p>
            <code style={{ display: "block", background: "#f3f4f6", padding: "8px 12px", borderRadius: "6px", fontSize: "13px", color: "#374151" }}>
              {selectedItem.feature}
            </code>
          </div>
          <div>
            <p style={{ margin: "0 0 12px 0", color: "#6b7280", fontSize: "12px", fontWeight: "600", textTransform: "uppercase" }}>
              Cenários ({selectedItem.cenarios && Array.isArray(selectedItem.cenarios) ? selectedItem.cenarios.length : 0})
            </p>
            {selectedItem.cenarios && Array.isArray(selectedItem.cenarios) && selectedItem.cenarios.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {selectedItem.cenarios.map((cenario, idx) => (
                  <GherkinDisplay key={idx} testCase={cenario} />
                ))}
              </div>
            ) : (
              <p style={{ color: "#9ca3af", fontSize: "14px" }}>Nenhum cenário definido</p>
            )}
          </div>
        </div>
      );
    }

    if (modalType === "executions") {
      return (
        <div>
          <h3 style={{ margin: "0 0 16px 0", color: "#111827" }}>🚀 {selectedItem.nome_suite}</h3>
          <div style={{ display: "grid", gap: "12px" }}>
            <div>
              <p style={{ margin: "0 0 4px 0", color: "#6b7280", fontSize: "12px" }}>Status</p>
              <span style={{
                background: selectedItem.status === 'completed' ? '#dcfce7' : 
                           selectedItem.status === 'running' ? '#dbeafe' : '#fef3c7',
                color: selectedItem.status === 'completed' ? '#15803d' :
                       selectedItem.status === 'running' ? '#0c4a6e' : '#92400e',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '600',
                display: 'inline-block'
              }}>
                {selectedItem.status}
              </span>
            </div>
            <div>
              <p style={{ margin: "0 0 4px 0", color: "#6b7280", fontSize: "12px" }}>Data</p>
              <p style={{ margin: "0", color: "#111827", fontSize: "14px" }}>
                {new Date(selectedItem.created_at).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      );
    }
  };

  return (
    <div className="dashboard">
      <h1>📊 Dashboard</h1>
      <p>Overview of your QA testing metrics</p>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div 
          className="stat-card projects"
          onClick={() => projects.length > 0 && openModal("projects", projects[0])}
          style={{ cursor: projects.length > 0 ? "pointer" : "default" }}
        >
          <div className="stat-card-content">
            <div className="stat-card-label">📁 Total Projects</div>
            <div className="stat-card-number">{projects.length}</div>
            <div className="stat-card-description">
              {projects.length === 1 ? "1 project created" : `${projects.length} projects created`}
            </div>
          </div>
        </div>

        <div 
          className="stat-card test-cases"
          style={{ cursor: "default" }}
        >
          <div className="stat-card-content">
            <div className="stat-card-label">🧪 Total Test Cases</div>
            <div className="stat-card-number">{testCases.length}</div>
            <div className="stat-card-description">
              {testCases.length === 1 ? "1 test case created" : `${testCases.length} test cases created`}
            </div>
          </div>
        </div>

        <div 
          className="stat-card executions"
          onClick={() => executions.length > 0 && openModal("executions", executions[0])}
          style={{ cursor: executions.length > 0 ? "pointer" : "default" }}
        >
          <div className="stat-card-content">
            <div className="stat-card-label">🚀 Total Executions</div>
            <div className="stat-card-number">{executions.length}</div>
            <div className="stat-card-description">
              {executions.length === 1 ? "1 execution run" : `${executions.length} execution runs`}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Items */}
      <div className="dashboard-content">
        <div className="dashboard-section">
          <h2>📁 Recent Projects</h2>
          {projects.length > 0 ? (
            <div className="section-list">
              {projects.slice(0, 5).map((project) => (
                <div 
                  key={project.id} 
                  className="list-item"
                  onClick={() => openModal("projects", project)}
                >
                  <p className="list-item-title">{project.titulo}</p>
                  <p className="list-item-meta">
                    {new Date(project.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: "#9ca3af", fontSize: "14px" }}>No projects yet. Create one to get started!</p>
          )}
        </div>

        <div className="dashboard-section">
          <h2>🧪 Recent Test Cases</h2>
          {testCases.length > 0 ? (
            <div className="section-list">
              {testCases.slice(0, 5).map((tc) => (
                <div
                  key={tc.id}
                  className="list-item"
                  onClick={() => openModal("testCases", tc)}
                  style={{ cursor: "pointer" }}
                >
                  <p className="list-item-title">{tc.titulo}</p>
                  <p className="list-item-meta">
                    {tc.cenarios && Array.isArray(tc.cenarios)
                      ? `${tc.cenarios.length} cenário${tc.cenarios.length !== 1 ? "s" : ""}`
                      : "0 cenários"}{" "}
                    · {new Date(tc.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: "#9ca3af", fontSize: "14px" }}>No test cases yet. Create one to get started!</p>
          )}
        </div>

        <div className="dashboard-section">
          <h2>🚀 Recent Executions</h2>
          {executions.length > 0 ? (
            <div className="section-list">
              {executions.slice(0, 5).map((execution) => (
                <div 
                  key={execution.id}
                  className="list-item"
                  onClick={() => openModal("executions", execution)}
                >
                  <p className="list-item-title">{execution.nome_suite || `Suite #${execution.suite_id}`}</p>
                  <p className="list-item-meta">
                    {new Date(execution.created_at).toLocaleDateString()}
                  </p>
                  <span className={`list-item-status status-${execution.status}`}>
                    {execution.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: "#9ca3af", fontSize: "14px" }}>No executions yet. Run a test suite to get started!</p>
          )}
        </div>
      </div>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        title={
          modalType === "projects" ? "Project Details" :
          modalType === "testCases" ? "Test Case Details" :
          "Execution Details"
        }
        onClose={closeModal}
      >
        <div className="modal-details">
          {renderModalContent()}
        </div>
      </Modal>

      {/* Toast */}
      {toast.message && (
        <div className={`toast ${toast.type}`} style={{
          position: "fixed",
          bottom: "20px",
          right: "20px",
          padding: "16px 24px",
          borderRadius: "8px",
          fontWeight: "500",
          animation: "slideIn 0.3s ease",
          boxShadow: "0 10px 25px rgba(0, 0, 0, 0.15)"
        }}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
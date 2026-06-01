import { useState, useEffect, useRef } from "react";
import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";
import { testSuitesAPI, projectsAPI } from "../services/api";
import "./Pages.css";

export default function TestSuites() {
  const [suites, setSuites] = useState([]);
  const [allProjects, setAllProjects] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCasesModalOpen, setIsCasesModalOpen] = useState(false);
  const [selectedSuite, setSelectedSuite] = useState(null);
  const [suiteCases, setSuiteCases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ nome: "", descricao: "" });
  const toastTimerRef = useRef(null);
  const [toast, setToast] = useState({ message: "", type: "" });
  const [confirmState, setConfirmState] = useState({ isOpen: false, message: "", onConfirm: null, danger: true });

  useEffect(() => {
    loadSuites();
    loadProjects();
  }, []);

  // Exibe uma notificação temporária por 3 segundos
  function showToast(message, type = "info") {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => setToast({ message: "", type: "" }), 3000);
  }

  // Busca todas as test suites da API
  async function loadSuites() {
    try {
      const data = await testSuitesAPI.list();
      setSuites(data);
    } catch (err) {
      console.error(err);
      showToast("Erro ao carregar test suites", "error");
    }
  }

  // Busca todos os test cases (projetos) para exibir no modal de vínculo
  async function loadProjects() {
    try {
      const data = await projectsAPI.list();
      setAllProjects(data);
    } catch (err) {
      console.error(err);
    }
  }

  // Abre o modal de gestão de test cases de uma suite e carrega os vinculados
  async function openCasesModal(suite) {
    setSelectedSuite(suite);
    setIsCasesModalOpen(true);
    try {
      const cases = await testSuitesAPI.getCases(suite.id);
      setSuiteCases(cases);
    } catch (err) {
      console.error(err);
      showToast("Erro ao carregar test cases", "error");
    }
  }

  // Vincula um test case à suite selecionada
  async function handleAddCase(projetoId) {
    try {
      await testSuitesAPI.addCase(selectedSuite.id, projetoId);
      const cases = await testSuitesAPI.getCases(selectedSuite.id);
      setSuiteCases(cases);
      showToast("Test case adicionado à suite!", "success");
    } catch (err) {
      console.error(err);
      showToast("Erro ao adicionar test case", "error");
    }
  }

  // Remove o vínculo de um test case da suite selecionada
  async function handleRemoveCase(projetoId) {
    try {
      await testSuitesAPI.removeCase(selectedSuite.id, projetoId);
      const cases = await testSuitesAPI.getCases(selectedSuite.id);
      setSuiteCases(cases);
      showToast("Test case removido da suite", "success");
    } catch (err) {
      console.error(err);
      showToast("Erro ao remover test case", "error");
    }
  }

  // Cria uma nova test suite via API; valida campo nome
  async function handleCreateSuite(e) {
    e.preventDefault();
    setLoading(true);
    if (!formData.nome.trim()) {
      showToast("Preencha o nome", "warning");
      setLoading(false);
      return;
    }
    try {
      const res = await testSuitesAPI.create(formData);
      if (!res.id) { showToast("Erro ao criar suite", "error"); setLoading(false); return; }
      showToast("Test Suite criada com sucesso!", "success");
      setFormData({ nome: "", descricao: "" });
      setIsModalOpen(false);
      loadSuites();
    } catch (err) {
      console.error(err);
      showToast("Erro ao criar test suite", "error");
    } finally {
      setLoading(false);
    }
  }

  // Abre dialog de confirmação antes de deletar uma suite
  function handleDeleteSuite(id) {
    setConfirmState({
      isOpen: true,
      message: "Deseja deletar esta test suite?",
      danger: true,
      onConfirm: async () => {
        setConfirmState((s) => ({ ...s, isOpen: false }));
        try {
          await testSuitesAPI.delete(id);
          showToast("Test Suite deletada", "success");
          loadSuites();
        } catch (err) {
          console.error(err);
          showToast("Erro ao deletar test suite", "error");
        }
      },
    });
  }

  const linkedIds = new Set(suiteCases.map((c) => c.id));
  const availableToLink = allProjects.filter((p) => !linkedIds.has(p.id));

  return (
    <div className="page">
      <h1>Test Suites</h1>
      <p>Group and organize test cases into suites</p>

      <div className="page-content">
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h2>Create New Test Suite</h2>
              <p>Create a new suite to group related test cases</p>
            </div>
            <button onClick={() => setIsModalOpen(true)}>+ New Suite</button>
          </div>
        </div>

        <div className="card">
          <h2>Your Test Suites ({suites.length})</h2>
          {suites.length === 0 ? (
            <p>No test suites created yet. Create one to get started!</p>
          ) : (
            <div style={{ display: "grid", gap: "16px", marginTop: "16px" }}>
              {suites.map((suite) => (
                <div key={suite.id} style={{ padding: "16px", background: "#f9fafb", borderRadius: "8px", border: "1px solid #e5e7eb" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ margin: "0 0 4px 0", color: "#111827" }}>{suite.nome}</h3>
                      <p style={{ margin: "0 0 8px 0", color: "#6b7280", fontSize: "14px" }}>{suite.descricao}</p>
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        onClick={() => openCasesModal(suite)}
                        style={{ background: "#6366f1", padding: "8px 16px", fontSize: "12px" }}
                      >
                        Manage Cases
                      </button>
                      <button
                        onClick={() => handleDeleteSuite(suite.id)}
                        style={{ background: "#ef4444", padding: "8px 16px", fontSize: "12px" }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal: Criar suite */}
      <Modal isOpen={isModalOpen} title="Create New Test Suite" onClose={() => setIsModalOpen(false)}>
        <form onSubmit={handleCreateSuite}>
          <input
            type="text"
            placeholder="Suite Name"
            value={formData.nome}
            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
            required
          />
          <textarea
            placeholder="Description (optional)"
            value={formData.descricao}
            onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
            style={{ minHeight: "80px", marginBottom: "16px" }}
          />
          <div style={{ display: "flex", gap: "12px", marginTop: "20px" }}>
            <button type="submit" disabled={loading}>{loading ? "Creating..." : "Create Suite"}</button>
            <button type="button" onClick={() => setIsModalOpen(false)} style={{ background: "#6b7280" }}>Cancel</button>
          </div>
        </form>
      </Modal>

      {/* Modal: Gerenciar test cases da suite */}
      <Modal
        isOpen={isCasesModalOpen}
        title={`Test Cases - ${selectedSuite?.nome || ""}`}
        onClose={() => { setIsCasesModalOpen(false); setSelectedSuite(null); setSuiteCases([]); }}
      >
        <div>
          {/* Casos já vinculados */}
          <div style={{ marginBottom: "24px" }}>
            <h3 style={{ margin: "0 0 12px 0", fontSize: "14px", fontWeight: "700", color: "#374151", textTransform: "uppercase" }}>
              Vinculados ({suiteCases.length})
            </h3>
            {suiteCases.length === 0 ? (
              <p style={{ color: "#9ca3af", fontSize: "14px" }}>Nenhum test case vinculado ainda.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {suiteCases.map((tc) => (
                  <div key={tc.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "#ecfdf5", borderRadius: "6px", border: "1px solid #bbf7d0" }}>
                    <div>
                      <span style={{ fontWeight: "600", color: "#065f46", fontSize: "14px" }}>{tc.titulo}</span>
                      <span style={{ marginLeft: "12px", color: "#6b7280", fontSize: "12px" }}>
                        {tc.cenarios && Array.isArray(tc.cenarios) ? `${tc.cenarios.length} cenários` : ""}
                      </span>
                    </div>
                    <button
                      onClick={() => handleRemoveCase(tc.id)}
                      style={{ background: "#ef4444", padding: "4px 12px", fontSize: "12px" }}
                    >
                      Remover
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Casos disponíveis para vincular */}
          <div>
            <h3 style={{ margin: "0 0 12px 0", fontSize: "14px", fontWeight: "700", color: "#374151", textTransform: "uppercase" }}>
              Disponíveis para vincular ({availableToLink.length})
            </h3>
            {availableToLink.length === 0 ? (
              <p style={{ color: "#9ca3af", fontSize: "14px" }}>Todos os test cases já estão vinculados ou nenhum foi criado.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {availableToLink.map((tc) => (
                  <div key={tc.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "#f9fafb", borderRadius: "6px", border: "1px solid #e5e7eb" }}>
                    <div>
                      <span style={{ fontWeight: "600", color: "#374151", fontSize: "14px" }}>{tc.titulo}</span>
                      <span style={{ marginLeft: "12px", color: "#9ca3af", fontSize: "12px" }}>
                        {tc.cenarios && Array.isArray(tc.cenarios) ? `${tc.cenarios.length} cenários` : ""}
                      </span>
                    </div>
                    <button
                      onClick={() => handleAddCase(tc.id)}
                      style={{ background: "#6366f1", padding: "4px 12px", fontSize: "12px" }}
                    >
                      + Adicionar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={confirmState.isOpen}
        message={confirmState.message}
        danger={confirmState.danger}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState((s) => ({ ...s, isOpen: false }))}
      />
      {toast.message && (
        <div className={`toast ${toast.type}`}>{toast.message}</div>
      )}
    </div>
  );
}

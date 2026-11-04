import ActionButton from "../components/ActionButton";
import { useAuth } from "../contexts/AuthContext";
import { useState, useEffect, useRef } from "react";
import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";
import Pagination from "../components/Pagination";
import usePaginatedList from "../hooks/usePaginatedList";
import { testSuitesAPI, projectsAPI, parsePaginationResponse } from "../services/api";
import "./Pages.css";

export default function TestSuites() {
  const { user } = useAuth();
  const canWrite = ["admin", "qa"].includes(user?.role);
  const canDelete = user?.role === "admin";
  const {
    data: suites, page, pageSize, total, setPage, setPageSize,
    isLoading, error: listError, reload: loadSuites, mounted,
  } = usePaginatedList(testSuitesAPI.list);
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

  useEffect(() => () => clearTimeout(toastTimerRef.current), []);

  useEffect(() => {
    const controller = new AbortController();
    projectsAPI.list(undefined, { signal: controller.signal })
      .then(parsePaginationResponse)
      .then(({ data }) => {
        if (!controller.signal.aborted) setAllProjects(data);
      })
      .catch((err) => {
        if (!controller.signal.aborted) console.error(err);
      });
    return () => controller.abort();
  }, []);

  // Exibe uma notificação temporária por 3 segundos
  function showToast(message, type = "info") {
    if (!mounted.current) return;
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => setToast({ message: "", type: "" }), 3000);
  }

  // Abre o modal de gestão de test cases de uma suite e carrega os vinculados
  async function openCasesModal(suite) {
    setSelectedSuite(suite);
    setIsCasesModalOpen(true);
    try {
      const cases = await testSuitesAPI.getCases(suite.id);
      if (!mounted.current) return;
      setSuiteCases(parsePaginationResponse(cases).data);
    } catch (err) {
      if (!mounted.current) return;
      console.error(err);
      showToast("Erro ao carregar test cases", "error");
    }
  }

  // Vincula um test case à suite selecionada
  async function handleAddCase(projetoId) {
    if (!canWrite) return;
    try {
      await testSuitesAPI.addCase(selectedSuite.id, projetoId);
      if (!mounted.current) return;
      const cases = await testSuitesAPI.getCases(selectedSuite.id);
      if (!mounted.current) return;
      setSuiteCases(parsePaginationResponse(cases).data);
      showToast("Test case adicionado à suite!", "success");
    } catch (err) {
      if (!mounted.current) return;
      console.error(err);
      showToast("Erro ao adicionar test case", "error");
    }
  }

  // Remove o vínculo de um test case da suite selecionada
  async function handleRemoveCase(projetoId) {
    if (!canDelete) return;
    try {
      await testSuitesAPI.removeCase(selectedSuite.id, projetoId);
      if (!mounted.current) return;
      const cases = await testSuitesAPI.getCases(selectedSuite.id);
      if (!mounted.current) return;
      setSuiteCases(parsePaginationResponse(cases).data);
      showToast("Test case removido da suite", "success");
    } catch (err) {
      if (!mounted.current) return;
      console.error(err);
      showToast("Erro ao remover test case", "error");
    }
  }

  // Cria uma nova test suite via API; valida campo nome
  async function handleCreateSuite(e) {
    e.preventDefault();
    if (!canWrite) return;
    setLoading(true);
    if (!formData.nome.trim()) {
      showToast("Preencha o nome", "warning");
      setLoading(false);
      return;
    }
    try {
      const res = await testSuitesAPI.create(formData);
      if (!mounted.current) return;
      if (!res.id) { showToast("Erro ao criar suite", "error"); setLoading(false); return; }
      showToast("Test Suite criada com sucesso!", "success");
      setFormData({ nome: "", descricao: "" });
      setIsModalOpen(false);
      loadSuites();
    } catch (err) {
      if (!mounted.current) return;
      console.error(err);
      showToast("Erro ao criar test suite", "error");
    } finally {
      if (mounted.current) setLoading(false);
    }
  }

  // Abre dialog de confirmação antes de deletar uma suite
  function handleDeleteSuite(id) {
    if (!canDelete) return;
    setConfirmState({
      isOpen: true,
      message: "Deseja deletar esta test suite?",
      danger: true,
      onConfirm: async () => {
        setConfirmState((s) => ({ ...s, isOpen: false }));
        try {
          await testSuitesAPI.delete(id);
          if (!mounted.current) return;
          showToast("Test Suite deletada", "success");
          loadSuites();
        } catch (err) {
          if (!mounted.current) return;
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
            {canWrite && (<button onClick={() => setIsModalOpen(true)}>+ New Suite</button>)}
          </div>
        </div>

        <div className="card">
          <h2>Your Test Suites ({isLoading || listError ? "..." : total})</h2>
          {isLoading ? (
            <p role="status">Carregando registros...</p>
          ) : listError ? (
            <div role="alert">
              <p>Não foi possível carregar os registros: {listError}</p>
              <button onClick={loadSuites}>Tentar novamente</button>
            </div>
          ) : suites.length === 0 && total > 0 ? (
            <p>Nenhum registro nesta página.</p>
          ) : suites.length === 0 ? (
            <p>No test suites created yet. Create one to get started!</p>
          ) : (
            <div style={{ display: "grid", gap: "16px", marginTop: "16px" }}>
              {suites.map((suite) => (
                <div key={suite.id} style={{ padding: "16px", background: "#f9fafb", borderRadius: "8px", border: "1px solid #e5e7eb" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", flexWrap: "wrap", gap: "12px" }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ margin: "0 0 4px 0", color: "#111827" }}>{suite.nome}</h3>
                      <p style={{ margin: "0 0 8px 0", color: "#6b7280", fontSize: "14px" }}>{suite.descricao}</p>
                    </div>
                    <div className="action-buttons">
                      <ActionButton action="view" onClick={() => openCasesModal(suite)}>Visualizar casos</ActionButton>
                      {canDelete && (<ActionButton action="delete" onClick={() => handleDeleteSuite(suite.id)}>Excluir</ActionButton>)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Pagination
            loading={isLoading}
            error={Boolean(listError)}
            empty={suites.length === 0}
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      </div>

      {/* Modal: Criar suite */}
      <Modal isOpen={isModalOpen && canWrite} title="Create New Test Suite" onClose={() => setIsModalOpen(false)}>
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
                    {canDelete && (<ActionButton action="delete" onClick={() => handleRemoveCase(tc.id)}>Excluir vínculo</ActionButton>)}
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
                    {canWrite && (<button
                      onClick={() => handleAddCase(tc.id)}
                      style={{ background: "#6366f1", padding: "4px 12px", fontSize: "12px" }}
                    >
                      + Adicionar
                    </button>)}
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

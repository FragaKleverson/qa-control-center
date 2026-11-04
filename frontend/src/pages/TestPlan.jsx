import ActionButton from "../components/ActionButton";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import { planExecutionView, executionLookupMessage } from "../domain/planExecution";
import { ENVIRONMENTS } from "../domain/environments";
import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";
import Pagination from "../components/Pagination";
import usePaginatedList from "../hooks/usePaginatedList";
import { testPlansAPI, testSuitesAPI, executionsAPI, parsePaginationResponse } from "../services/api";
import "./Pages.css";

export default function TestPlan() {
  const { user } = useAuth();
  const canDelete = user?.role === "admin";
  const canManage = ["admin", "qa"].includes(user?.role);
  const canChange = (plan) => canManage && !plan.executed_at && plan.legacy_classification === "eligible";
  const executionLock = useRef(false);
  const suitesRequest = useRef(0);
  const suitesMutation = useRef(null);
  const executionRequest = useRef(0);
  const formSession = useRef(null);
  const [suitesError, setSuitesError] = useState("");
  const [suitesLoading, setSuitesLoading] = useState(false);
  const [executionDetail, setExecutionDetail] = useState(null);
  const [executionError, setExecutionError] = useState("");
  const [executionOpen, setExecutionOpen] = useState(false);
  const {
    data: plans, page, pageSize, total, setPage, setPageSize,
    isLoading, error: listError, reload: loadPlans, mounted,
  } = usePaginatedList(testPlansAPI.list);
  const [allSuites, setAllSuites] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSuitesModalOpen, setIsSuitesModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [planSuites, setPlanSuites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [execModal, setExecModal] = useState({ isOpen: false, plan: null });
  const [formData, setFormData] = useState({
    titulo: "", descricao: "", escopo: "", objetivo: "", ambiente: ""
  });
  const toastTimerRef = useRef(null);
  const [toast, setToast] = useState({ message: "", type: "" });
  const [confirmState, setConfirmState] = useState({ isOpen: false, message: "", onConfirm: null, danger: true });

  async function viewExecution(id) {
    const request = ++executionRequest.current;
    setExecutionOpen(true); setExecutionDetail(null); setExecutionError("");
    try {
      const [execution, results] = await Promise.all([executionsAPI.getById(id), executionsAPI.getResults(id)]);
      if (mounted.current && request === executionRequest.current) setExecutionDetail({ execution, results: parsePaginationResponse(results).data });
    } catch (err) { if (mounted.current && request === executionRequest.current) { setExecutionError(executionLookupMessage(err)); if (err.status === 404) loadPlans(); } }
  }
  function openCreateForm() {
    formSession.current = { pending: false };
    setLoading(false); setIsModalOpen(true);
  }
  function closeCreateForm() {
    formSession.current = null;
    setLoading(false); setIsModalOpen(false);
  }
  function mutationError(err) {
    if (err.status === 409) {
      loadPlans(); setExecModal((v) => ({ ...v, isOpen: false }));
      setIsSuitesModalOpen(false);
    }
    showToast(err.message || "Falha na operação", "error");
  }

  useEffect(() => () => clearTimeout(toastTimerRef.current), []);

  useEffect(() => {
    const controller = new AbortController();
    testSuitesAPI.list(undefined, { signal: controller.signal })
      .then(parsePaginationResponse)
      .then(({ data }) => {
        if (!controller.signal.aborted) setAllSuites(data);
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

  // Abre o modal de gestão de suites de um plan e carrega as vinculadas
  async function openSuitesModal(plan) {
    const request = ++suitesRequest.current;
    setSelectedPlan(plan); setPlanSuites([]); setSuitesError("");
    setSuitesLoading(true); setIsSuitesModalOpen(true);
    try {
      const suites = await testPlansAPI.getSuites(plan.id);
      if (mounted.current && request === suitesRequest.current) setPlanSuites(parsePaginationResponse(suites).data);
    } catch (err) {
      if (mounted.current && request === suitesRequest.current) setSuitesError(err.message);
    } finally {
      if (mounted.current && request === suitesRequest.current) setSuitesLoading(false);
    }
  }

  // Vincula uma suite ao plan selecionado
  async function handleAddSuite(suiteId) {
    if (!selectedPlan || !canChange(selectedPlan) || suitesLoading || suitesError || suitesMutation.current === suitesRequest.current) return;
    const request = ++suitesRequest.current;
    suitesMutation.current = request;
    setSuitesLoading(true);
    try {
      await testPlansAPI.addSuite(selectedPlan.id, suiteId);
      if (!mounted.current || request !== suitesRequest.current) return;
      const suites = await testPlansAPI.getSuites(selectedPlan.id);
      if (!mounted.current || request !== suitesRequest.current) return;
      setPlanSuites(parsePaginationResponse(suites).data);
      showToast("Suite adicionada ao plan!", "success");
    } catch (err) {
      if (!mounted.current || request !== suitesRequest.current) return;
      console.error(err);
      setSuitesError(err.message || "Falha ao atualizar suites.");
      mutationError(err);
    } finally {
      if (suitesMutation.current === request) suitesMutation.current = null;
      if (mounted.current && request === suitesRequest.current) setSuitesLoading(false);
    }
  }

  // Remove o vínculo de uma suite do plan selecionado
  async function handleRemoveSuite(suiteId) {
    if (!canDelete) return;
    if (!selectedPlan || !canChange(selectedPlan) || suitesLoading || suitesError || suitesMutation.current === suitesRequest.current) return;
    const request = ++suitesRequest.current;
    suitesMutation.current = request;
    setSuitesLoading(true);
    try {
      await testPlansAPI.removeSuite(selectedPlan.id, suiteId);
      if (!mounted.current || request !== suitesRequest.current) return;
      const suites = await testPlansAPI.getSuites(selectedPlan.id);
      if (!mounted.current || request !== suitesRequest.current) return;
      setPlanSuites(parsePaginationResponse(suites).data);
      showToast("Suite removida do plan", "success");
    } catch (err) {
      if (!mounted.current || request !== suitesRequest.current) return;
      console.error(err);
      setSuitesError(err.message || "Falha ao atualizar suites.");
      mutationError(err);
    } finally {
      if (suitesMutation.current === request) suitesMutation.current = null;
      if (mounted.current && request === suitesRequest.current) setSuitesLoading(false);
    }
  }

  // Valida o estado atual antes de confirmar o ambiente herdado do plano
  async function handleExecutePlan(plan) {
    if (executionLock.current || !canChange(plan)) return;
    executionLock.current = true; setExecuting(true);
    try {
      const fresh = await testPlansAPI.getById(plan.id);
      const suites = parsePaginationResponse(await testPlansAPI.getSuites(plan.id)).data;
      if (!canChange(fresh)) throw Object.assign(new Error("Estado do plano alterado. Atualize a consulta."), { status: 409 });
      if (!ENVIRONMENTS.includes(fresh.ambiente)) throw new Error("Regularize o ambiente do plano antes de executar.");
      if (!suites.some((suite) => !suite.deleted_at && Number(suite.total_cases) > 0)) {
        throw new Error("Vincule uma suite ativa com pelo menos um caso ativo.");
      }
      if (mounted.current) setExecModal({ isOpen: true, plan: fresh });
    } catch (err) { if (mounted.current) mutationError(err); }
    finally { executionLock.current = false; if (mounted.current) setExecuting(false); }
  }

  async function confirmExecutePlan() {
    if (executionLock.current) return;
    executionLock.current = true; setExecuting(true);
    try {
      const exec = await testPlansAPI.execute(execModal.plan.id);
      if (!mounted.current) return;
      setExecModal((v) => ({ ...v, isOpen: false })); loadPlans();
      showToast(`Execução #${exec.id} criada!`, "success");
    } catch (err) { if (mounted.current) mutationError(err); }
    finally { executionLock.current = false; if (mounted.current) setExecuting(false); }
  }

  // Cria um novo test plan via API; valida campo título
  async function handleCreatePlan(e) {
    e.preventDefault();
    const session = formSession.current;
    if (!canManage || !session || session.pending) return;
    const isCurrent = () => mounted.current && formSession.current === session;
    setLoading(true);
    if (!formData.titulo.trim() || !ENVIRONMENTS.includes(formData.ambiente)) {
      showToast("Preencha o título e selecione um ambiente oficial", "warning");
      setLoading(false);
      return;
    }
    session.pending = true;
    try {
      const res = await testPlansAPI.create(formData);
      if (!isCurrent()) return;
      if (!res.id) { showToast("Erro ao criar plan", "error"); setLoading(false); return; }
      showToast("Test Plan criado com sucesso!", "success");
      setFormData({ titulo: "", descricao: "", escopo: "", objetivo: "", ambiente: "" });
      closeCreateForm();
      loadPlans();
    } catch (err) {
      if (!isCurrent()) return;
      console.error(err);
      mutationError(err);
    } finally {
      if (isCurrent()) { session.pending = false; setLoading(false); }
    }
  }

  // Abre dialog de confirmação antes de deletar um test plan
  function handleDeletePlan(id) {
    if (!canDelete) return;
    setConfirmState({
      isOpen: true,
      message: "Deseja deletar este test plan?",
      danger: true,
      onConfirm: async () => {
        setConfirmState((s) => ({ ...s, isOpen: false }));
        try {
          await testPlansAPI.delete(id);
          if (!mounted.current) return;
          showToast("Test Plan deletado", "success");
          loadPlans();
        } catch (err) {
          if (!mounted.current) return;
          console.error(err);
          mutationError(err);
        }
      },
    });
  }

  const linkedSuiteIds = new Set(planSuites.map((s) => s.id));
  const availableToLink = allSuites.filter((s) => !linkedSuiteIds.has(s.id));

  return (
    <div className="page">
      <h1>Test Plans</h1>
      <p>Create and manage comprehensive test plans</p>

      <div className="page-content">
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h2>Create New Test Plan</h2>
              <p>Define a comprehensive test plan for your project</p>
            </div>
            {canManage && <button onClick={openCreateForm}>+ New Plan</button>}
          </div>
        </div>

        <div className="card">
          <h2>Your Test Plans ({isLoading || listError ? "..." : total})</h2>
          {isLoading ? (
            <p role="status">Carregando registros...</p>
          ) : listError ? (
            <div role="alert">
              <p>Não foi possível carregar os registros: {listError}</p>
              <button onClick={loadPlans}>Tentar novamente</button>
            </div>
          ) : plans.length === 0 && total > 0 ? (
            <p>Nenhum registro nesta página.</p>
          ) : plans.length === 0 ? (
            <p>No test plans created yet. Create one to get started!</p>
          ) : (
            <div style={{ display: "grid", gap: "16px", marginTop: "16px" }}>
              {plans.map((plan) => (
                <div key={plan.id} style={{ padding: "16px", background: "#f9fafb", borderRadius: "8px", border: "1px solid #e5e7eb" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", flexWrap: "wrap", gap: "12px" }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ margin: "0 0 8px 0", color: "#111827" }}>{plan.titulo}</h3>
                      <p>{plan.executed_at || plan.legacy_classification === "executed" ? "Executado" : plan.legacy_classification !== "eligible" ? "Legado: revisão necessária" : "Não executado"}</p>
                      {plan.executed_at && <p>{new Date(plan.executed_at).toLocaleString()}</p>}
                      {canChange(plan) && !ENVIRONMENTS.includes(plan.ambiente) && <p role="alert">Ambiente não canônico: regularização autorizada necessária antes de executar.</p>}
                      {planExecutionView(plan).available && <ActionButton action="view" onClick={() => viewExecution(plan.execution_id)}>Visualizar execução #{plan.execution_id}</ActionButton>}
                      {planExecutionView(plan).message && <p role="status">{planExecutionView(plan).message}</p>}
                      <p style={{ margin: "0 0 8px 0", color: "#6b7280", fontSize: "14px" }}>{plan.descricao}</p>
                      {plan.escopo && <p style={{ margin: "0 0 4px 0", color: "#9ca3af", fontSize: "12px" }}><strong>Escopo:</strong> {plan.escopo}</p>}
                      {plan.objetivo && <p style={{ margin: "0 0 4px 0", color: "#9ca3af", fontSize: "12px" }}><strong>Objetivo:</strong> {plan.objetivo}</p>}
                      {plan.ambiente && <p style={{ margin: "0", color: "#9ca3af", fontSize: "12px" }}><strong>Ambiente:</strong> {plan.ambiente}</p>}
                    </div>
                    <div className="action-buttons">
                      <ActionButton action="view" onClick={() => openSuitesModal(plan)}>{canChange(plan) ? "Gerenciar suítes" : "Visualizar detalhes e suítes"}</ActionButton>
                      <button
                        onClick={() => handleExecutePlan(plan)}
                        disabled={executing || !canChange(plan) || !ENVIRONMENTS.includes(plan.ambiente)}
                        style={{ background: "#10b981", padding: "8px 16px", fontSize: "12px" }}
                      >
                        Execute
                      </button>
                      {user?.role === "admin" && <ActionButton action="delete" onClick={() => handleDeletePlan(plan.id)}>Excluir</ActionButton>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Pagination
            loading={isLoading}
            error={Boolean(listError)}
            empty={plans.length === 0}
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      </div>

      {/* Modal: Criar plan */}
      <Modal isOpen={isModalOpen} title="Create New Test Plan" onClose={closeCreateForm} dialogLabel="Formulario de Test Plan">
        <form onSubmit={handleCreatePlan}>
          <input
            type="text"
            placeholder="Plan Title"
            value={formData.titulo}
            onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
            required
          />
          <textarea placeholder="Description" value={formData.descricao} onChange={(e) => setFormData({ ...formData, descricao: e.target.value })} style={{ minHeight: "80px", marginBottom: "16px" }} />
          <textarea placeholder="Scope (Escopo)" value={formData.escopo} onChange={(e) => setFormData({ ...formData, escopo: e.target.value })} style={{ minHeight: "60px", marginBottom: "16px" }} />
          <textarea placeholder="Objective (Objetivo)" value={formData.objetivo} onChange={(e) => setFormData({ ...formData, objetivo: e.target.value })} style={{ minHeight: "60px", marginBottom: "16px" }} />
          <label>Environment
            <select required value={formData.ambiente} onChange={(e) => setFormData({ ...formData, ambiente: e.target.value })}>
              <option value="">Selecione um ambiente</option>
              {ENVIRONMENTS.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
          <div style={{ display: "flex", gap: "12px", marginTop: "20px" }}>
            <button type="submit" disabled={loading}>{loading ? "Creating..." : "Create Plan"}</button>
            <button type="button" onClick={closeCreateForm} style={{ background: "#6b7280" }}>Cancel</button>
          </div>
        </form>
      </Modal>

      {/* Modal: Gerenciar suites do plan */}
      <Modal
        isOpen={isSuitesModalOpen}
        title={`Suites - ${selectedPlan?.titulo || ""}`}
        onClose={() => { suitesRequest.current++; setIsSuitesModalOpen(false); setSelectedPlan(null); setPlanSuites([]); }}
      >
        <div>
          <p>{selectedPlan?.descricao}</p><p>{selectedPlan?.escopo}</p><p>{selectedPlan?.objetivo}</p>
          {suitesLoading && <p role="status">Carregando suites...</p>}
          {suitesError && <p role="alert">{suitesError}</p>}
          <div style={{ marginBottom: "24px" }}>
            <h3 style={{ margin: "0 0 12px 0", fontSize: "14px", fontWeight: "700", color: "#374151", textTransform: "uppercase" }}>
              Vinculadas ({planSuites.length})
            </h3>
            {planSuites.length === 0 ? (
              <p style={{ color: "#9ca3af", fontSize: "14px" }}>Nenhuma suite vinculada ainda.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {planSuites.map((suite) => (
                  <div key={suite.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "#ecfdf5", borderRadius: "6px", border: "1px solid #bbf7d0" }}>
                    <div>
                      <span style={{ fontWeight: "600", color: "#065f46", fontSize: "14px" }}>{suite.nome}{suite.deleted_at ? " (excluída)" : ""}</span>
                      <span style={{ marginLeft: "10px", color: "#6b7280", fontSize: "12px" }}>
                        {suite.total_cases || 0} test case{suite.total_cases !== "1" ? "s" : ""}
                      </span>
                    </div>
                    {selectedPlan && canDelete && canChange(selectedPlan) && !suitesLoading && !suitesError && <ActionButton action="delete" onClick={() => handleRemoveSuite(suite.id)}>Excluir vínculo</ActionButton>}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 style={{ margin: "0 0 12px 0", fontSize: "14px", fontWeight: "700", color: "#374151", textTransform: "uppercase" }}>
              Disponíveis ({availableToLink.length})
            </h3>
            {availableToLink.length === 0 ? (
              <p style={{ color: "#9ca3af", fontSize: "14px" }}>Todas as suites já estão vinculadas.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {availableToLink.map((suite) => (
                  <div key={suite.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "#f9fafb", borderRadius: "6px", border: "1px solid #e5e7eb" }}>
                    <span style={{ fontWeight: "600", color: "#374151", fontSize: "14px" }}>{suite.nome}{suite.deleted_at ? " (excluída)" : ""}</span>
                    {selectedPlan && canChange(selectedPlan) && !suitesLoading && !suitesError && <button onClick={() => handleAddSuite(suite.id)} style={{ background: "#6366f1", padding: "4px 12px", fontSize: "12px" }}>+ Adicionar</button>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Modal: Executar plan — escolha de ambiente */}
      <Modal
        isOpen={execModal.isOpen}
        title={`Executar "${execModal.plan?.titulo || ""}"`}
        onClose={() => setExecModal((s) => ({ ...s, isOpen: false }))}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <p style={{ margin: 0, color: "#374151", fontSize: "14px" }}>
            O ambiente será herdado do plano. Esta ação bloqueia novas execuções e alterações.
          </p>
          <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "13px", fontWeight: "600", color: "#374151" }}>
            Ambiente
            <span>{execModal.plan?.ambiente}</span>
          </label>
          <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={() => setExecModal((s) => ({ ...s, isOpen: false }))}
              style={{ background: "#f3f4f6", color: "#374151", padding: "9px 20px", fontSize: "14px", boxShadow: "none", transform: "none" }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={confirmExecutePlan}
              disabled={executing}
              style={{ background: "#10b981", padding: "9px 20px", fontSize: "14px" }}
            >
              {executing ? "Executando..." : "Confirmar"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={executionOpen} title="Execução do plano" onClose={() => { executionRequest.current++; setExecutionOpen(false); }}>
        {executionError ? <p role="alert">{executionError}</p> : !executionDetail ? <p role="status">Carregando...</p> : <div>
          <p>#{executionDetail.execution.id} - {executionDetail.execution.status} - {executionDetail.execution.ambiente}</p>
          {executionDetail.results.map((result) => <p key={result.id}>{result.titulo}: {result.status}</p>)}
        </div>}
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

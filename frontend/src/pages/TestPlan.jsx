import { useState, useEffect, useRef } from "react";
import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";
import { testPlansAPI, testSuitesAPI } from "../services/api";
import "./Pages.css";

export default function TestPlan() {
  const [plans, setPlans] = useState([]);
  const [allSuites, setAllSuites] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSuitesModalOpen, setIsSuitesModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [planSuites, setPlanSuites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [formData, setFormData] = useState({
    titulo: "", descricao: "", escopo: "", objetivo: "", ambiente: ""
  });
  const toastTimerRef = useRef(null);
  const [toast, setToast] = useState({ message: "", type: "" });
  const [confirmState, setConfirmState] = useState({ isOpen: false, message: "", onConfirm: null, danger: true });

  useEffect(() => {
    loadPlans();
    loadAllSuites();
  }, []);

  function showToast(message, type = "info") {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => setToast({ message: "", type: "" }), 3000);
  }

  async function loadPlans() {
    try {
      const data = await testPlansAPI.list();
      setPlans(data);
    } catch (err) {
      console.error(err);
      showToast("Erro ao carregar test plans", "error");
    }
  }

  async function loadAllSuites() {
    try {
      const data = await testSuitesAPI.list();
      setAllSuites(data);
    } catch (err) {
      console.error(err);
    }
  }

  async function openSuitesModal(plan) {
    setSelectedPlan(plan);
    setIsSuitesModalOpen(true);
    try {
      const suites = await testPlansAPI.getSuites(plan.id);
      setPlanSuites(suites);
    } catch (err) {
      console.error(err);
      showToast("Erro ao carregar suites do plan", "error");
    }
  }

  async function handleAddSuite(suiteId) {
    try {
      await testPlansAPI.addSuite(selectedPlan.id, suiteId);
      const suites = await testPlansAPI.getSuites(selectedPlan.id);
      setPlanSuites(suites);
      showToast("Suite adicionada ao plan!", "success");
    } catch (err) {
      console.error(err);
      showToast("Erro ao adicionar suite", "error");
    }
  }

  async function handleRemoveSuite(suiteId) {
    try {
      await testPlansAPI.removeSuite(selectedPlan.id, suiteId);
      const suites = await testPlansAPI.getSuites(selectedPlan.id);
      setPlanSuites(suites);
      showToast("Suite removida do plan", "success");
    } catch (err) {
      console.error(err);
      showToast("Erro ao remover suite", "error");
    }
  }

  function handleExecutePlan(plan, ambiente = "staging") {
    setConfirmState({
      isOpen: true,
      message: `Executar o plan "${plan.titulo}" no ambiente ${ambiente}?`,
      danger: false,
      onConfirm: async () => {
        setConfirmState((s) => ({ ...s, isOpen: false }));
        setExecuting(true);
        try {
          const exec = await testPlansAPI.execute(plan.id, ambiente);
          if (exec.error) throw new Error(exec.error);
          showToast(`Execução #${exec.id} criada! Vá para Executions para acompanhar.`, "success");
        } catch (err) {
          console.error(err);
          showToast("Erro ao executar plan: " + err.message, "error");
        } finally {
          setExecuting(false);
        }
      },
    });
  }

  async function handleCreatePlan(e) {
    e.preventDefault();
    setLoading(true);
    if (!formData.titulo.trim()) {
      showToast("Preencha o título", "warning");
      setLoading(false);
      return;
    }
    try {
      const res = await testPlansAPI.create(formData);
      if (!res.id) { showToast("Erro ao criar plan", "error"); setLoading(false); return; }
      showToast("Test Plan criado com sucesso!", "success");
      setFormData({ titulo: "", descricao: "", escopo: "", objetivo: "", ambiente: "" });
      setIsModalOpen(false);
      loadPlans();
    } catch (err) {
      console.error(err);
      showToast("Erro ao criar test plan", "error");
    } finally {
      setLoading(false);
    }
  }

  function handleDeletePlan(id) {
    setConfirmState({
      isOpen: true,
      message: "Deseja deletar este test plan?",
      danger: true,
      onConfirm: async () => {
        setConfirmState((s) => ({ ...s, isOpen: false }));
        try {
          await testPlansAPI.delete(id);
          showToast("Test Plan deletado", "success");
          loadPlans();
        } catch (err) {
          console.error(err);
          showToast("Erro ao deletar test plan", "error");
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
            <button onClick={() => setIsModalOpen(true)}>+ New Plan</button>
          </div>
        </div>

        <div className="card">
          <h2>Your Test Plans ({plans.length})</h2>
          {plans.length === 0 ? (
            <p>No test plans created yet. Create one to get started!</p>
          ) : (
            <div style={{ display: "grid", gap: "16px", marginTop: "16px" }}>
              {plans.map((plan) => (
                <div key={plan.id} style={{ padding: "16px", background: "#f9fafb", borderRadius: "8px", border: "1px solid #e5e7eb" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ margin: "0 0 8px 0", color: "#111827" }}>{plan.titulo}</h3>
                      <p style={{ margin: "0 0 8px 0", color: "#6b7280", fontSize: "14px" }}>{plan.descricao}</p>
                      {plan.escopo && <p style={{ margin: "0 0 4px 0", color: "#9ca3af", fontSize: "12px" }}><strong>Escopo:</strong> {plan.escopo}</p>}
                      {plan.objetivo && <p style={{ margin: "0 0 4px 0", color: "#9ca3af", fontSize: "12px" }}><strong>Objetivo:</strong> {plan.objetivo}</p>}
                      {plan.ambiente && <p style={{ margin: "0", color: "#9ca3af", fontSize: "12px" }}><strong>Ambiente:</strong> {plan.ambiente}</p>}
                    </div>
                    <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                      <button
                        onClick={() => openSuitesModal(plan)}
                        style={{ background: "#6366f1", padding: "8px 16px", fontSize: "12px" }}
                      >
                        Manage Suites
                      </button>
                      <button
                        onClick={() => handleExecutePlan(plan, plan.ambiente || "staging")}
                        disabled={executing}
                        style={{ background: "#10b981", padding: "8px 16px", fontSize: "12px" }}
                      >
                        Execute
                      </button>
                      <button
                        onClick={() => handleDeletePlan(plan.id)}
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

      {/* Modal: Criar plan */}
      <Modal isOpen={isModalOpen} title="Create New Test Plan" onClose={() => setIsModalOpen(false)}>
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
          <input
            type="text"
            placeholder="Environment (Ambiente)"
            value={formData.ambiente}
            onChange={(e) => setFormData({ ...formData, ambiente: e.target.value })}
          />
          <div style={{ display: "flex", gap: "12px", marginTop: "20px" }}>
            <button type="submit" disabled={loading}>{loading ? "Creating..." : "Create Plan"}</button>
            <button type="button" onClick={() => setIsModalOpen(false)} style={{ background: "#6b7280" }}>Cancel</button>
          </div>
        </form>
      </Modal>

      {/* Modal: Gerenciar suites do plan */}
      <Modal
        isOpen={isSuitesModalOpen}
        title={`Suites - ${selectedPlan?.titulo || ""}`}
        onClose={() => { setIsSuitesModalOpen(false); setSelectedPlan(null); setPlanSuites([]); }}
      >
        <div>
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
                      <span style={{ fontWeight: "600", color: "#065f46", fontSize: "14px" }}>{suite.nome}</span>
                      <span style={{ marginLeft: "10px", color: "#6b7280", fontSize: "12px" }}>
                        {suite.total_cases || 0} test case{suite.total_cases !== "1" ? "s" : ""}
                      </span>
                    </div>
                    <button onClick={() => handleRemoveSuite(suite.id)} style={{ background: "#ef4444", padding: "4px 12px", fontSize: "12px" }}>Remover</button>
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
                    <span style={{ fontWeight: "600", color: "#374151", fontSize: "14px" }}>{suite.nome}</span>
                    <button onClick={() => handleAddSuite(suite.id)} style={{ background: "#6366f1", padding: "4px 12px", fontSize: "12px" }}>+ Adicionar</button>
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
      {toast.message && <div className={`toast ${toast.type}`}>{toast.message}</div>}
    </div>
  );
}

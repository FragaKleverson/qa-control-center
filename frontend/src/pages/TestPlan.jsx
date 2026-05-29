import { useState, useEffect, useRef } from "react";
import Modal from "../components/Modal";
import { testPlansAPI } from "../services/api";
import "./Pages.css";

export default function TestPlan() {
  const [plans, setPlans] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    titulo: "",
    descricao: "",
    escopo: "",
    objetivo: "",
    ambiente: ""
  });
  const toastTimerRef = useRef(null);
  const [toast, setToast] = useState({ message: "", type: "" });

  useEffect(() => {
    loadPlans();
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

  async function loadPlans() {
    try {
      const data = await testPlansAPI.list();
      setPlans(data);
    } catch (err) {
      console.error(err);
      showToast("Erro ao carregar test plans", "error");
    }
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

      if (!res.id) {
        showToast(await res.text(), "error");
        setLoading(false);
        return;
      }

      showToast("Test Plan criado com sucesso!", "success");
      setFormData({
        titulo: "",
        descricao: "",
        escopo: "",
        objetivo: "",
        ambiente: ""
      });
      setIsModalOpen(false);
      loadPlans();
    } catch (err) {
      console.error(err);
      showToast("Erro ao criar test plan", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeletePlan(id) {
    if (!confirm("Deseja deletar este test plan?")) return;

    try {
      await testPlansAPI.delete(id);
      showToast("Test Plan deletado", "success");
      loadPlans();
    } catch (err) {
      console.error(err);
      showToast("Erro ao deletar test plan", "error");
    }
  }

  return (
    <div className="page">
      <h1>📋 Test Plans</h1>
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
                <div
                  key={plan.id}
                  style={{
                    padding: "16px",
                    background: "#f9fafb",
                    borderRadius: "8px",
                    border: "1px solid #e5e7eb"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ margin: "0 0 8px 0", color: "#111827" }}>{plan.titulo}</h3>
                      <p style={{ margin: "0 0 8px 0", color: "#6b7280", fontSize: "14px" }}>
                        {plan.descricao}
                      </p>
                      {plan.escopo && (
                        <p style={{ margin: "0 0 4px 0", color: "#9ca3af", fontSize: "12px" }}>
                          <strong>Escopo:</strong> {plan.escopo}
                        </p>
                      )}
                      {plan.objetivo && (
                        <p style={{ margin: "0 0 4px 0", color: "#9ca3af", fontSize: "12px" }}>
                          <strong>Objetivo:</strong> {plan.objetivo}
                        </p>
                      )}
                      {plan.ambiente && (
                        <p style={{ margin: "0", color: "#9ca3af", fontSize: "12px" }}>
                          <strong>Ambiente:</strong> {plan.ambiente}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeletePlan(plan.id)}
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
              ))}
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        title="Create New Test Plan"
        onClose={() => setIsModalOpen(false)}
      >
        <form onSubmit={handleCreatePlan}>
          <input
            type="text"
            placeholder="Plan Title"
            value={formData.titulo}
            onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
            required
          />

          <textarea
            placeholder="Description"
            value={formData.descricao}
            onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
            style={{ minHeight: "80px", marginBottom: "16px" }}
          />

          <textarea
            placeholder="Scope (Escopo)"
            value={formData.escopo}
            onChange={(e) => setFormData({ ...formData, escopo: e.target.value })}
            style={{ minHeight: "60px", marginBottom: "16px" }}
          />

          <textarea
            placeholder="Objective (Objetivo)"
            value={formData.objetivo}
            onChange={(e) => setFormData({ ...formData, objetivo: e.target.value })}
            style={{ minHeight: "60px", marginBottom: "16px" }}
          />

          <input
            type="text"
            placeholder="Environment (Ambiente)"
            value={formData.ambiente}
            onChange={(e) => setFormData({ ...formData, ambiente: e.target.value })}
          />

          <div style={{ display: "flex", gap: "12px", marginTop: "20px" }}>
            <button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Plan"}
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

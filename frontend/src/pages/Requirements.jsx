import { useState, useEffect, useRef } from "react";
import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";
import { requirementsAPI } from "../services/api";
import "./Pages.css";

export default function Requirements() {
  const [requirements, setRequirements] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    titulo: "",
    descricao: "",
    status: "Open",
    prioridade: "Medium"
  });
  const toastTimerRef = useRef(null);
  const [toast, setToast] = useState({ message: "", type: "" });
  const [confirmState, setConfirmState] = useState({ isOpen: false, message: "", onConfirm: null, danger: true });

  useEffect(() => {
    loadRequirements();
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

  // Busca todos os requirements da API
  async function loadRequirements() {
    try {
      const data = await requirementsAPI.list();
      setRequirements(data);
    } catch (err) {
      console.error(err);
      showToast("Erro ao carregar requirements", "error");
    }
  }

  // Cria um novo requirement via API; valida campo título
  async function handleCreateRequirement(e) {
    e.preventDefault();
    setLoading(true);

    if (!formData.titulo.trim()) {
      showToast("Preencha o título", "warning");
      setLoading(false);
      return;
    }

    try {
      const res = await requirementsAPI.create(formData);

      if (!res.id) {
        showToast(await res.text(), "error");
        setLoading(false);
        return;
      }

      showToast("Requirement criado com sucesso!", "success");
      setFormData({ titulo: "", descricao: "", status: "Open", prioridade: "Medium" });
      setIsModalOpen(false);
      loadRequirements();
    } catch (err) {
      console.error(err);
      showToast("Erro ao criar requirement", "error");
    } finally {
      setLoading(false);
    }
  }

  // Abre dialog de confirmação antes de deletar um requirement
  function handleDeleteRequirement(id) {
    setConfirmState({
      isOpen: true,
      message: "Deseja deletar este requirement?",
      danger: true,
      onConfirm: async () => {
        setConfirmState((s) => ({ ...s, isOpen: false }));
        try {
          await requirementsAPI.delete(id);
          showToast("Requirement deletado", "success");
          loadRequirements();
        } catch (err) {
          console.error(err);
          showToast("Erro ao deletar requirement", "error");
        }
      },
    });
  }

  // Retorna a cor hex correspondente à prioridade do requirement
  const getPriorityColor = (prioridade) => {
    switch (prioridade) {
      case "High":
        return "#ef4444";
      case "Medium":
        return "#f59e0b";
      case "Low":
        return "#10b981";
      default:
        return "#6b7280";
    }
  };

  return (
    <div className="page">
      <h1>Requirements</h1>
      <p>Manage test requirements and specifications</p>

      <div className="page-content">
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h2>Create New Requirement</h2>
              <p>Define requirements for your test cases</p>
            </div>
            <button onClick={() => setIsModalOpen(true)}>+ New Requirement</button>
          </div>
        </div>

        <div className="card">
          <h2>Your Requirements ({requirements.length})</h2>
          {requirements.length === 0 ? (
            <p>No requirements created yet.</p>
          ) : (
            <div style={{ display: "grid", gap: "16px", marginTop: "16px" }}>
              {requirements.map((req) => (
                <div
                  key={req.id}
                  style={{
                    padding: "16px",
                    background: "#f9fafb",
                    borderRadius: "8px",
                    border: "1px solid #e5e7eb"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ margin: "0 0 8px 0", color: "#111827" }}>{req.titulo}</h3>
                      <p style={{ margin: "0 0 8px 0", color: "#6b7280", fontSize: "14px" }}>
                        {req.descricao}
                      </p>
                      <div style={{ display: "flex", gap: "12px", fontSize: "12px" }}>
                        <span style={{ background: "#e5e7eb", padding: "4px 8px", borderRadius: "4px" }}>
                          Status: {req.status}
                        </span>
                        <span style={{ background: getPriorityColor(req.prioridade), color: "white", padding: "4px 8px", borderRadius: "4px" }}>
                          Priority: {req.prioridade}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteRequirement(req.id)}
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
        title="Create New Requirement"
        onClose={() => setIsModalOpen(false)}
      >
        <form onSubmit={handleCreateRequirement}>
          <input
            type="text"
            placeholder="Requirement Title"
            value={formData.titulo}
            onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
            required
          />

          <textarea
            placeholder="Description (optional)"
            value={formData.descricao}
            onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
            style={{ minHeight: "80px", marginBottom: "16px" }}
          />

          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            style={{ marginBottom: "16px" }}
          >
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Closed">Closed</option>
          </select>

          <select
            value={formData.prioridade}
            onChange={(e) => setFormData({ ...formData, prioridade: e.target.value })}
            style={{ marginBottom: "16px" }}
          >
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
          </select>

          <div style={{ display: "flex", gap: "12px", marginTop: "20px" }}>
            <button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Requirement"}
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

      <ConfirmDialog
        isOpen={confirmState.isOpen}
        message={confirmState.message}
        danger={confirmState.danger}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState((s) => ({ ...s, isOpen: false }))}
      />
      {toast.message && (
        <div className={`toast ${toast.type}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
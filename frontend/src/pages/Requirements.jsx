import ActionButton from "../components/ActionButton";
import { useAuth } from "../contexts/AuthContext";
import { useState, useEffect, useRef, useCallback } from "react";
import RecordDetailsModal, { ViewRecordButton } from "../components/RecordDetails";
import useRecordDetails from "../hooks/useRecordDetails";
import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";
import Pagination from "../components/Pagination";
import usePaginatedList from "../hooks/usePaginatedList";
import { requirementsAPI } from "../services/api";
import "./Pages.css";

export default function Requirements() {
  const { user } = useAuth();
  const canWrite = ["admin", "qa"].includes(user?.role);
  const canDelete = user?.role === "admin";
  const details = useRecordDetails(requirementsAPI.getById);
  const {
    data: requirements, page, pageSize, total, setPage, setPageSize,
    isLoading, error: listError, reload: loadRequirements, mounted,
  } = usePaginatedList(requirementsAPI.list);
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

  // Stable callbacks keep closed sibling modals from resetting the scroll lock.
  const closeCreate = useCallback(() => setIsModalOpen(false), []);

  useEffect(() => () => clearTimeout(toastTimerRef.current), []);

  // Exibe uma notificação temporária por 3 segundos
  function showToast(message, type = "info") {
    if (!mounted.current) return;
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => {
      setToast({ message: "", type: "" });
    }, 3000);
  }

  // Cria um novo requirement via API; valida campo título
  async function handleCreateRequirement(e) {
    e.preventDefault();
    if (!canWrite) return;
    setLoading(true);

    if (!formData.titulo.trim()) {
      showToast("Preencha o título", "warning");
      setLoading(false);
      return;
    }

    try {
      const res = await requirementsAPI.create(formData);
      if (!mounted.current) return;

      if (!res.id) {
        showToast(await res.text(), "error");
        if (!mounted.current) return;
        setLoading(false);
        return;
      }

      showToast("Requirement criado com sucesso!", "success");
      setFormData({ titulo: "", descricao: "", status: "Open", prioridade: "Medium" });
      setIsModalOpen(false);
      loadRequirements();
    } catch (err) {
      if (!mounted.current) return;
      console.error(err);
      showToast("Erro ao criar requirement", "error");
    } finally {
      if (mounted.current) setLoading(false);
    }
  }

  // Abre dialog de confirmação antes de deletar um requirement
  function handleDeleteRequirement(id) {
    if (!canDelete) return;
    setConfirmState({
      isOpen: true,
      message: "Deseja deletar este requirement?",
      danger: true,
      onConfirm: async () => {
        setConfirmState((s) => ({ ...s, isOpen: false }));
        try {
          await requirementsAPI.delete(id);
          if (!mounted.current) return;
          showToast("Requirement deletado", "success");
          loadRequirements();
        } catch (err) {
          if (!mounted.current) return;
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
            {canWrite && (<button onClick={() => setIsModalOpen(true)}>+ New Requirement</button>)}
          </div>
        </div>

        <div className="card">
          <h2>Your Requirements ({isLoading || listError ? "..." : total})</h2>
          {isLoading ? (
            <p role="status">Carregando registros...</p>
          ) : listError ? (
            <div role="alert">
              <p>Não foi possível carregar os registros: {listError}</p>
              <button onClick={loadRequirements}>Tentar novamente</button>
            </div>
          ) : requirements.length === 0 && total > 0 ? (
            <p>Nenhum registro nesta página.</p>
          ) : requirements.length === 0 ? (
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
                  <div className="record-list-row">
                    <div className="record-list-info">
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
                    <div className="record-list-actions">
                      <ViewRecordButton record={req} onView={details.open} />
                      {canDelete && (<ActionButton action="delete" onClick={() => handleDeleteRequirement(req.id)}>Excluir</ActionButton>)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Pagination
            loading={isLoading}
            error={Boolean(listError)}
            empty={requirements.length === 0}
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      </div>

      <Modal
        isOpen={isModalOpen && canWrite}
        title="Create New Requirement"
        onClose={closeCreate}
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

      <RecordDetailsModal viewer={details} kind="requirement" />
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

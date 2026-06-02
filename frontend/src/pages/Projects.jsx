import { useState, useEffect, useRef } from "react";
import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";
import { projectsAPI } from "../services/api";
import "./Pages.css";

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    titulo: "",
    descricao: "",
    feature: ""
  });
  const [editData, setEditData] = useState({ titulo: "", descricao: "", feature: "" });
  const toastTimerRef = useRef(null);
  const [toast, setToast] = useState({ message: "", type: "" });
  const [confirmState, setConfirmState] = useState({ isOpen: false, message: "", onConfirm: null, danger: true });

  useEffect(() => {
    loadProjects();
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

  // Busca todos os projetos da API
  async function loadProjects() {
    try {
      const data = await projectsAPI.list();
      setProjects(data);
    } catch (err) {
      console.error(err);
      showToast("Erro ao carregar projetos", "error");
    }
  }

  // Cria um novo projeto via API; valida campos obrigatórios
  async function handleCreateProject(e) {
    e.preventDefault();
    setLoading(true);

    if (!formData.titulo.trim() || !formData.descricao.trim() || !formData.feature.trim()) {
      showToast("Preencha todos os campos", "warning");
      setLoading(false);
      return;
    }

    try {
      const res = await projectsAPI.create({
        ...formData,
        cenarios: []
      });

      if (!res.id) {
        showToast(res.error || "Erro ao criar projeto", "error");
        setLoading(false);
        return;
      }

      showToast("Projeto criado com sucesso!", "success");
      setFormData({ titulo: "", descricao: "", feature: "" });
      setIsModalOpen(false);
      loadProjects();
    } catch (err) {
      console.error(err);
      showToast("Erro ao criar projeto", "error");
    } finally {
      setLoading(false);
    }
  }

  // Abre o modal de edição com os dados do projeto selecionado
  function openEdit(project) {
    setEditingProject(project);
    setEditData({ titulo: project.titulo, descricao: project.descricao, feature: project.feature });
    setIsEditOpen(true);
  }

  // Salva as alterações do projeto via API
  async function handleUpdateProject(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await projectsAPI.update(editingProject.id, editData);
      showToast("Projeto atualizado!", "success");
      setIsEditOpen(false);
      setEditingProject(null);
      loadProjects();
    } catch (err) {
      console.error(err);
      showToast("Erro ao atualizar projeto", "error");
    } finally {
      setLoading(false);
    }
  }

  // Abre dialog de confirmação antes de deletar um projeto
  function handleDeleteProject(id) {
    setConfirmState({
      isOpen: true,
      message: "Deseja deletar este projeto?",
      danger: true,
      onConfirm: async () => {
        setConfirmState((s) => ({ ...s, isOpen: false }));
        try {
          await projectsAPI.delete(id);
          showToast("Projeto deletado", "success");
          loadProjects();
        } catch (err) {
          console.error(err);
          showToast("Erro ao deletar projeto", "error");
        }
      },
    });
  }

  return (
    <div className="page">
      <h1>Projects</h1>
      <p>Manage and organize your test projects</p>

      <div className="page-content">
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h2>Create New Project</h2>
              <p>Start a new project by clicking the button</p>
            </div>
            <button onClick={() => setIsModalOpen(true)}>+ New Project</button>
          </div>
        </div>

        <div className="card">
          <h2>Your Projects ({projects.length})</h2>
          {projects.length === 0 ? (
            <p>No projects created yet. Create one to get started!</p>
          ) : (
            <div style={{ display: "grid", gap: "16px", marginTop: "16px" }}>
              {projects.map((project) => (
                <div
                  key={project.id}
                  style={{
                    padding: "16px",
                    background: "#f9fafb",
                    borderRadius: "8px",
                    border: "1px solid #e5e7eb"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ margin: "0 0 8px 0", color: "#111827" }}>{project.titulo}</h3>
                      <p style={{ margin: "0 0 4px 0", color: "#6b7280", fontSize: "14px" }}>
                        {project.descricao}
                      </p>
                      <p style={{ margin: "0", color: "#9ca3af", fontSize: "12px" }}>
                        Feature: {project.feature}
                      </p>
                    </div>
                    <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                      <button
                        onClick={() => openEdit(project)}
                        style={{ background: "#6366f1", padding: "8px 16px", fontSize: "12px" }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteProject(project.id)}
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

      {/* Modal: Create */}
      <Modal
        isOpen={isModalOpen}
        title="Create New Project"
        onClose={() => setIsModalOpen(false)}
      >
        <form onSubmit={handleCreateProject}>
          <input
            type="text"
            placeholder="Project Title"
            value={formData.titulo}
            onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
            required
          />
          <textarea
            placeholder="Description"
            value={formData.descricao}
            onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
            required
            style={{ minHeight: "80px", marginBottom: "16px" }}
          />
          <input
            type="text"
            placeholder="Feature"
            value={formData.feature}
            onChange={(e) => setFormData({ ...formData, feature: e.target.value })}
            required
          />
          <div style={{ display: "flex", gap: "12px", marginTop: "20px" }}>
            <button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Project"}
            </button>
            <button type="button" onClick={() => setIsModalOpen(false)} style={{ background: "#6b7280" }}>
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Edit */}
      <Modal
        isOpen={isEditOpen}
        title="Edit Project"
        onClose={() => { setIsEditOpen(false); setEditingProject(null); }}
      >
        <form onSubmit={handleUpdateProject}>
          <input
            type="text"
            placeholder="Project Title"
            value={editData.titulo}
            onChange={(e) => setEditData({ ...editData, titulo: e.target.value })}
            required
          />
          <textarea
            placeholder="Description"
            value={editData.descricao}
            onChange={(e) => setEditData({ ...editData, descricao: e.target.value })}
            required
            style={{ minHeight: "80px", marginBottom: "16px" }}
          />
          <input
            type="text"
            placeholder="Feature"
            value={editData.feature}
            onChange={(e) => setEditData({ ...editData, feature: e.target.value })}
            required
          />
          <div style={{ display: "flex", gap: "12px", marginTop: "20px" }}>
            <button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </button>
            <button
              type="button"
              onClick={() => { setIsEditOpen(false); setEditingProject(null); }}
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
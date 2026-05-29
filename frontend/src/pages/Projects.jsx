import { useState, useEffect, useRef } from "react";
import Modal from "../components/Modal";
import { projectsAPI } from "../services/api";
import "./Pages.css";

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    titulo: "",
    descricao: "",
    feature: ""
  });
  const toastTimerRef = useRef(null);
  const [toast, setToast] = useState({ message: "", type: "" });

  useEffect(() => {
    loadProjects();
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

  async function loadProjects() {
    try {
      const data = await projectsAPI.list();
      setProjects(data);
    } catch (err) {
      console.error(err);
      showToast("Erro ao carregar projetos", "error");
    }
  }

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

  async function handleDeleteProject(id) {
    if (!confirm("Deseja deletar este projeto?")) return;

    try {
      await projectsAPI.delete(id);
      showToast("Projeto deletado", "success");
      loadProjects();
    } catch (err) {
      console.error(err);
      showToast("Erro ao deletar projeto", "error");
    }
  }

  return (
    <div className="page">
      <h1>📁 Projects</h1>
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
                    <button
                      onClick={() => handleDeleteProject(project.id)}
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
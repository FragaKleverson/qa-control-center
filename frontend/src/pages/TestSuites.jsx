import { useState, useEffect, useRef } from "react";
import Modal from "../components/Modal";
import { testSuitesAPI } from "../services/api";
import "./Pages.css";

export default function TestSuites() {
  const [suites, setSuites] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome: "",
    descricao: ""
  });
  const toastTimerRef = useRef(null);
  const [toast, setToast] = useState({ message: "", type: "" });

  useEffect(() => {
    loadSuites();
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

  async function loadSuites() {
    try {
      const data = await testSuitesAPI.list();
      setSuites(data);
    } catch (err) {
      console.error(err);
      showToast("Erro ao carregar test suites", "error");
    }
  }

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

      if (!res.id) {
        showToast(await res.text(), "error");
        setLoading(false);
        return;
      }

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

  async function handleDeleteSuite(id) {
    if (!confirm("Deseja deletar esta test suite?")) return;

    try {
      await testSuitesAPI.delete(id);
      showToast("Test Suite deletada", "success");
      loadSuites();
    } catch (err) {
      console.error(err);
      showToast("Erro ao deletar test suite", "error");
    }
  }

  return (
    <div className="page">
      <h1>📦 Test Suites</h1>
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
                <div
                  key={suite.id}
                  style={{
                    padding: "16px",
                    background: "#f9fafb",
                    borderRadius: "8px",
                    border: "1px solid #e5e7eb"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ margin: "0 0 8px 0", color: "#111827" }}>{suite.nome}</h3>
                      <p style={{ margin: "0", color: "#6b7280", fontSize: "14px" }}>
                        {suite.descricao}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteSuite(suite.id)}
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
        title="Create New Test Suite"
        onClose={() => setIsModalOpen(false)}
      >
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
            <button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Suite"}
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
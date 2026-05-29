import { useState, useEffect, useRef } from "react";
import Modal from "../components/Modal";
import { projectsAPI } from "../services/api";
import "./Pages.css";

const CATEGORIAS = [
  "Happy Path", "Sad Path", "Edge Case", "Validation",
  "Regression", "Integration", "Security", "Smoke Test",
];

const EMPTY_DOC = {
  titulo: "",
  descricao: "",
  feature: "",
  cenarios: [{ nome: "", tipo: "Happy Path", passos: "" }],
};

function formatTCId(id) {
  return `TC${String(id).padStart(4, "0")}`;
}

function PencilIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

const thStyle = {
  padding: "10px 14px",
  textAlign: "left",
  fontSize: "12px",
  fontWeight: "700",
  color: "#374151",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const tdStyle = {
  padding: "12px 14px",
  color: "#374151",
  verticalAlign: "middle",
};

export default function TestCases() {
  const [testCases, setTestCases] = useState([]);
  const [sortAsc, setSortAsc] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [doc, setDoc] = useState(EMPTY_DOC);
  const toastTimerRef = useRef(null);
  const [toast, setToast] = useState({ message: "", type: "" });

  useEffect(() => { loadTestCases(); }, []);

  function showToast(message, type = "info") {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => setToast({ message: "", type: "" }), 3000);
  }

  async function loadTestCases() {
    try {
      const data = await projectsAPI.list();
      setTestCases(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      showToast("Erro ao carregar test cases", "error");
    }
  }

  function openAddModal() {
    setEditingId(null);
    setDoc({ ...EMPTY_DOC, cenarios: [{ nome: "", tipo: "Happy Path", passos: "" }] });
    setIsModalOpen(true);
  }

  function openEditModal(tc) {
    setEditingId(tc.id);
    setDoc({
      titulo: tc.titulo || "",
      descricao: tc.descricao || "",
      feature: tc.feature || "",
      cenarios:
        Array.isArray(tc.cenarios) && tc.cenarios.length > 0
          ? tc.cenarios.map((c) => ({ nome: c.nome || "", tipo: c.tipo || "Happy Path", passos: c.passos || "" }))
          : [{ nome: "", tipo: "Happy Path", passos: "" }],
    });
    setIsModalOpen(true);
  }

  function updateField(field, value) {
    setDoc((prev) => ({ ...prev, [field]: value }));
  }

  function updateCenario(field, value) {
    setDoc((prev) => ({ ...prev, cenarios: [{ ...prev.cenarios[0], [field]: value }] }));
  }

  async function saveTestCase() {
    setLoading(true);
    const hasEmpty = doc.cenarios.some((c) => !c.nome.trim() || !c.tipo.trim() || !c.passos.trim());
    if (!doc.titulo.trim() || !doc.descricao.trim() || !doc.feature.trim() || hasEmpty) {
      showToast("Preenche tudo direito aí", "warning");
      setLoading(false);
      return;
    }
    try {
      if (editingId) {
        await projectsAPI.update(editingId, doc);
        showToast("Atualizado com sucesso", "success");
      } else {
        await projectsAPI.create(doc);
        showToast("Salvo com sucesso", "success");
      }
      setIsModalOpen(false);
      loadTestCases();
    } catch (err) {
      console.error(err);
      showToast("Erro na API", "error");
    } finally {
      setLoading(false);
    }
  }

  const sorted = [...testCases].sort((a, b) => sortAsc ? a.id - b.id : b.id - a.id);

  return (
    <div className="page">
      <h1>Test Cases</h1>
      <p>Manage your test cases</p>

      <div className="page-content">
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <h2 style={{ margin: 0 }}>All Test Cases ({testCases.length})</h2>
            <button onClick={openAddModal}>+ New Test Case</button>
          </div>

          {testCases.length === 0 ? (
            <p style={{ color: "#9ca3af", margin: 0 }}>
              Nenhum test case criado. Clique em &quot;+ New Test Case&quot; para adicionar.
            </p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
                <thead>
                  <tr style={{ background: "#f9fafb", borderBottom: "2px solid #e5e7eb" }}>
                    <th style={thStyle}>
                      <button
                        onClick={() => setSortAsc((v) => !v)}
                        style={{
                          background: "none",
                          color: "#374151",
                          padding: "4px 8px",
                          fontSize: "12px",
                          fontWeight: "700",
                          border: "1px solid #d1d5db",
                          borderRadius: "4px",
                          boxShadow: "none",
                          transform: "none",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        ID {sortAsc ? "▲" : "▼"}
                      </button>
                    </th>
                    <th style={thStyle}>Descricao</th>
                    <th style={thStyle}>Feature</th>
                    <th style={thStyle}>Data</th>
                    <th style={{ ...thStyle, textAlign: "center" }}>Editar</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((tc) => (
                    <tr
                      key={tc.id}
                      style={{ borderBottom: "1px solid #f3f4f6", transition: "background 0.1s" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#f9fafb")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                    >
                      <td style={{ ...tdStyle, fontFamily: "monospace", fontWeight: "700", color: "#6366f1", whiteSpace: "nowrap" }}>
                        {formatTCId(tc.id)}
                      </td>
                      <td style={{ ...tdStyle, maxWidth: "340px" }}>
                        <span
                          title={tc.descricao}
                          style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                        >
                          {tc.descricao}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, maxWidth: "200px" }}>
                        <code
                          title={tc.feature}
                          style={{ display: "block", background: "#f3f4f6", padding: "2px 8px", borderRadius: "4px", fontSize: "12px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                        >
                          {tc.feature}
                        </code>
                      </td>
                      <td style={{ ...tdStyle, color: "#9ca3af", whiteSpace: "nowrap", fontSize: "12px" }}>
                        {tc.created_at ? new Date(tc.created_at).toLocaleDateString("pt-BR") : "-"}
                      </td>
                      <td style={{ ...tdStyle, textAlign: "center" }}>
                        <button
                          onClick={() => openEditModal(tc)}
                          title="Editar"
                          style={{ background: "#e0e7ff", color: "#4338ca", padding: "6px 10px", fontSize: "12px", boxShadow: "none", transform: "none" }}
                        >
                          <PencilIcon />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        title={editingId ? `Editar ${formatTCId(editingId)}` : "New Test Case"}
        onClose={() => setIsModalOpen(false)}
      >
        <div style={{ maxHeight: "68vh", overflowY: "auto", paddingRight: "4px" }}>
          <input
            placeholder="Título"
            value={doc.titulo}
            onChange={(e) => updateField("titulo", e.target.value)}
          />
          <textarea
            placeholder="Descrição"
            value={doc.descricao}
            onChange={(e) => updateField("descricao", e.target.value)}
          />
          <input
            placeholder="Feature"
            value={doc.feature}
            onChange={(e) => updateField("feature", e.target.value)}
          />

          <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "16px", marginBottom: "16px" }}>
            <input
              placeholder="Nome do cenario"
              value={doc.cenarios[0].nome}
              onChange={(e) => updateCenario("nome", e.target.value)}
            />
            <select
              value={doc.cenarios[0].tipo}
              onChange={(e) => updateCenario("tipo", e.target.value)}
              style={{ marginBottom: "12px", marginTop: "2px" }}
            >
              {CATEGORIAS.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <textarea
              placeholder="Given / When / Then"
              value={doc.cenarios[0].passos}
              onChange={(e) => updateCenario("passos", e.target.value)}
            />
          </div>

          <div style={{ display: "flex", gap: "12px", marginTop: "4px", paddingTop: "16px", borderTop: "1px solid #e5e7eb" }}>
            <button onClick={saveTestCase} disabled={loading}>
              {loading ? "Salvando..." : editingId ? "Atualizar" : "Salvar"}
            </button>
            <button onClick={() => setIsModalOpen(false)} style={{ background: "#6b7280" }}>Cancelar</button>
          </div>
        </div>
      </Modal>

      {toast.message && (
        <div className={`toast ${toast.type}`}>{toast.message}</div>
      )}
    </div>
  );
}
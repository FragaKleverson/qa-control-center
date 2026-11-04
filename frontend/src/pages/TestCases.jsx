import ActionButton from "../components/ActionButton";
import { useState, useEffect, useRef } from "react";
import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";
import { useAuth } from "../contexts/AuthContext";
import Pagination from "../components/Pagination";
import usePaginatedList from "../hooks/usePaginatedList";
import { projectsAPI } from "../services/api";
import useProjectLink from "../hooks/useProjectLink";
import TestCaseProjectField, { TestCaseProjectValue } from "../components/TestCaseProject";
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

// Formata o ID numérico para o padrão TCxxxx (ex: 1 → TC0001)
function formatTCId(id) {
  return `TC${String(id).padStart(4, "0")}`;
}

// Ícone SVG para o botão de edição na tabela


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
  const { user } = useAuth();
  const canWrite = ["admin", "qa"].includes(user?.role);
  const canDelete = user?.role === "admin";
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const deletePending = useRef(false);
  const {
    data: testCases, page, pageSize, total, setPage, setPageSize,
    isLoading, error: listError, reload: loadTestCases, mounted,
    query, setQuery,
  } = usePaginatedList(projectsAPI.list, { sort_by: "id", sort_dir: "desc" });
  const sortAsc = query.sort_dir === "asc";
  const [isModalOpen, setIsModalOpen] = useState(false);
  const projectLink = useProjectLink(isModalOpen);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const formSession = useRef(null);
  const [cenariosChanged, setCenariosChanged] = useState(false);
  const [doc, setDoc] = useState(EMPTY_DOC);
  const [viewingTC, setViewingTC] = useState(null);
  const toastTimerRef = useRef(null);
  const [toast, setToast] = useState({ message: "", type: "" });

  useEffect(() => () => clearTimeout(toastTimerRef.current), []);

  // Exibe uma notificação temporária por 3 segundos
  function showToast(message, type = "info") {
    if (!mounted.current) return;
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => setToast({ message: "", type: "" }), 3000);
  }

  // Abre o modal de visualização read-only de um test case
  function openViewModal(tc) {
    setViewingTC(tc);
  }

  function beginForm() {
    formSession.current = { pending: false };
    setLoading(false); setCenariosChanged(false);
    clearTimeout(toastTimerRef.current); setToast({ message: "", type: "" });
  }
  function closeForm() {
    formSession.current = null;
    setIsModalOpen(false); setLoading(false);
  }

  // Abre o modal para criação de novo test case com campos zerados
  function openAddModal() {
    if (!canWrite) return;
    beginForm();
    projectLink.reset();
    setEditingId(null);
    setDoc({ ...EMPTY_DOC, cenarios: [{ nome: "", tipo: "Happy Path", passos: "" }] });
    setIsModalOpen(true);
  }

  // Abre o modal de edição preenchido com os dados do test case selecionado
  function openEditModal(tc) {
    if (!canWrite) return;
    beginForm();
    projectLink.reset(tc);
    setEditingId(tc.id);
    setDoc({
      titulo: tc.titulo || "",
      descricao: tc.descricao || "",
      feature: tc.feature || "",
      cenarios:
        Array.isArray(tc.cenarios) && tc.cenarios.length > 0
          ? tc.cenarios.map((c, index) => index > 0 ? c : ({
              ...(c && typeof c === "object" && !Array.isArray(c) ? c : {}),
              nome: c?.nome || "", tipo: c?.tipo || "Happy Path", passos: c?.passos || "",
            }))
          : [{ nome: "", tipo: "Happy Path", passos: "" }],
    });
    setIsModalOpen(true);
  }

  // Atualiza um campo do documento sendo editado
  function updateField(field, value) {
    setDoc((prev) => ({ ...prev, [field]: value }));
  }

  // Atualiza um campo do único cenário (sempre índice 0)
  function updateCenario(field, value) {
    setCenariosChanged(true);
    setDoc((prev) => ({ ...prev, cenarios: [{ ...prev.cenarios[0], [field]: value }, ...prev.cenarios.slice(1)] }));
  }

  // Valida e persiste o test case (cria ou atualiza conforme editingId)
  async function saveTestCase() {
    const session = formSession.current;
    if (!canWrite || !session || session.pending) return;
    const isCurrent = () => mounted.current && formSession.current === session;
    const sendScenarios = !editingId || cenariosChanged;
    session.pending = true;
    setLoading(true);
    const hasEmpty = sendScenarios && doc.cenarios.slice(0, 1).some((c) => [c.nome, c.tipo, c.passos].some(value => typeof value !== "string" || !value.trim()));
    if (!doc.titulo.trim() || !doc.descricao.trim() || !doc.feature.trim() || hasEmpty) {
      showToast("Preenche tudo direito aí", "warning");
      session.pending = false; setLoading(false);
      return;
    }
    try {
      const { cenarios, ...fields } = doc;
      const payload = { ...fields, ...(sendScenarios ? { cenarios } : {}), ...projectLink.payload() };
      if (editingId) {
        await projectsAPI.update(editingId, payload);
        if (!isCurrent()) return;
        showToast("Atualizado com sucesso", "success");
      } else {
        await projectsAPI.create(payload);
        if (!isCurrent()) return;
        showToast("Salvo com sucesso", "success");
      }
      closeForm();
      loadTestCases();
    } catch (err) {
      if (!isCurrent()) return;
      console.error(err);
      showToast(err.message || "Erro na API", "error");
    } finally {
      if (isCurrent()) { session.pending = false; setLoading(false); }
    }
  }

  async function deleteTestCase() {
    if (!canDelete || !deleteTarget || deletePending.current) return;
    const id = deleteTarget.id;
    deletePending.current = true;
    setDeletingId(id);
    setDeleteTarget(null);
    try {
      await projectsAPI.delete(id);
      if (!mounted.current) return;
      setViewingTC((current) => current?.id === id ? null : current);
      showToast("Test case excluído com sucesso", "success");
      loadTestCases();
    } catch (err) {
      showToast(err.message || "Erro ao excluir test case", "error");
    } finally {
      deletePending.current = false;
      if (mounted.current) setDeletingId(null);
    }
  }

  return (
    <div className="page">
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        message={`Excluir ${formatTCId(deleteTarget?.id)}? O catálogo independente de Projects será preservado.`}
        onConfirm={deleteTestCase}
        onCancel={() => setDeleteTarget(null)}
      />
      <h1>Test Cases</h1>
      <p>Manage your test cases</p>

      <div className="page-content">
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <h2 style={{ margin: 0 }}>All Test Cases ({isLoading || listError ? "..." : total})</h2>
            {canWrite && <button onClick={openAddModal}>+ New Test Case</button>}
          </div>

          {isLoading ? (
            <p role="status">Carregando registros...</p>
          ) : listError ? (
            <div role="alert">
              <p>Não foi possível carregar os registros: {listError}</p>
              <button onClick={loadTestCases}>Tentar novamente</button>
            </div>
          ) : testCases.length === 0 && total > 0 ? (
            <p>Nenhum registro nesta página.</p>
          ) : testCases.length === 0 ? (
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
                        onClick={() => setQuery({ sort_by: "id", sort_dir: sortAsc ? "desc" : "asc" })}
                        aria-label={`Ordenar por ID ${sortAsc ? "decrescente" : "crescente"}`}
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
                    <th style={{ ...thStyle, textAlign: "center" }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {testCases.map((tc) => (
                    <tr
                      key={tc.id}
                      style={{ borderBottom: "1px solid #f3f4f6", transition: "background 0.1s" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#f9fafb")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                    >
                      <td style={{ ...tdStyle, fontFamily: "monospace", fontWeight: "700", whiteSpace: "nowrap" }}>
                        <ActionButton action="view" aria-label={`Visualizar ${formatTCId(tc.id)}`} onClick={() => openViewModal(tc)}>
                          {formatTCId(tc.id)}
                        </ActionButton>
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
                      <td style={{ ...tdStyle, textAlign: "center" }}><div className="action-buttons">
                        {canWrite && <ActionButton action="edit" onClick={() => openEditModal(tc)} title="Editar">Editar</ActionButton>}
                        {canDelete && (
                          <ActionButton action="delete" onClick={() => setDeleteTarget(tc)} disabled={deletingId !== null} aria-label={`Excluir ${formatTCId(tc.id)}`}>Excluir</ActionButton>
                        )}</div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <Pagination
            loading={isLoading}
            error={Boolean(listError)}
            empty={testCases.length === 0}
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        title={editingId ? `Editar ${formatTCId(editingId)}` : "New Test Case"}
        onClose={closeForm}
        dialogLabel="Formulario de Test Case"
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

          <TestCaseProjectField link={projectLink} disabled={loading || !canWrite} />

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
            <button onClick={closeForm} style={{ background: "#6b7280" }}>Cancelar</button>
          </div>
        </div>
      </Modal>

      {/* Modal: Visualização read-only */}
      <Modal
        isOpen={!!viewingTC}
        title={viewingTC ? formatTCId(viewingTC.id) : ""}
        onClose={() => setViewingTC(null)}
      >
        {viewingTC && (
          <div style={{ maxHeight: "70vh", overflowY: "auto", paddingRight: "4px" }}>
            <div style={{ marginBottom: "16px" }}>
              <p style={{ margin: "0 0 4px 0", fontSize: "11px", fontWeight: "700", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em" }}>Título</p>
              <p style={{ margin: 0, fontSize: "16px", fontWeight: "600", color: "#111827" }}>{viewingTC.titulo}</p>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <p style={{ margin: "0 0 4px 0", fontSize: "11px", fontWeight: "700", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em" }}>Descrição</p>
              <p style={{ margin: 0, color: "#374151", lineHeight: "1.6" }}>{viewingTC.descricao}</p>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <p style={{ margin: "0 0 4px 0", fontSize: "11px", fontWeight: "700", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em" }}>Feature</p>
              <code style={{ display: "inline-block", background: "#f3f4f6", padding: "4px 10px", borderRadius: "6px", fontSize: "13px", color: "#374151" }}>
                {viewingTC.feature}
              </code>
            </div>

            <TestCaseProjectValue record={viewingTC} />

            {Array.isArray(viewingTC.cenarios) && viewingTC.cenarios.length > 0 && (
              <div>
                {viewingTC.cenarios.map((c, i) => c && typeof c === "object" && !Array.isArray(c) && [c.nome, c.tipo, c.passos].every(value => value == null || typeof value === "string") ? (
                  <div key={i} style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "16px", marginBottom: "12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                      <span style={{ fontWeight: "700", fontSize: "14px", color: "#111827" }}>{c.nome}</span>
                      <span style={{ background: "#e0e7ff", color: "#4338ca", padding: "2px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: "600" }}>{c.tipo}</span>
                    </div>
                    <pre style={{ margin: 0, background: "#1e1e2e", color: "#cdd6f4", padding: "14px", borderRadius: "6px", fontSize: "13px", lineHeight: "1.7", overflowX: "auto", whiteSpace: "pre-wrap", fontFamily: "monospace" }}>
                      {c.passos}
                    </pre>
                  </div>
                ) : <pre key={i} style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{JSON.stringify(c, null, 2)}</pre>)}
              </div>
            )}
            {viewingTC.cenarios != null && !Array.isArray(viewingTC.cenarios) && (
              <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{JSON.stringify(viewingTC.cenarios, null, 2)}</pre>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "16px", borderTop: "1px solid #e5e7eb", marginTop: "4px" }}>
              <span style={{ fontSize: "12px", color: "#9ca3af" }}>
                {viewingTC.created_at ? new Date(viewingTC.created_at).toLocaleDateString("pt-BR") : ""}
              </span>
              <div style={{ display: "flex", gap: "10px" }}>
                {canWrite && <ActionButton action="edit" onClick={() => { setViewingTC(null); openEditModal(viewingTC); }}>Editar</ActionButton>}
                <button onClick={() => setViewingTC(null)} style={{ background: "#6b7280" }}>Fechar</button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {toast.message && (
        <div className={`toast ${toast.type}`}>{toast.message}</div>
      )}
    </div>
  );
}

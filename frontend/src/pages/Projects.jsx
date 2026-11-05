import ActionButton from "../components/ActionButton";
import React, { useState, useRef, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import { projectCatalogAPI, projectsAPI } from "../services/api";
import usePaginatedList from "../hooks/usePaginatedList";
import useRecordDetails from "../hooks/useRecordDetails";
import RecordDetailsModal, { ViewRecordButton } from "../components/RecordDetails";
import Modal from "../components/Modal";
import Pagination from "../components/Pagination";
import "./Pages.css";

const rowStyle = { padding: "12px", textAlign: "left", verticalAlign: "top", overflowWrap: "anywhere" };
const toolbar = { display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center", marginBottom: "16px" };
const emptyForm = { nome: "", descricao: "" };

export function ProjectArea({ legacy = false, role }) {
  const api = legacy ? projectsAPI : projectCatalogAPI;
  const list = usePaginatedList(api.list);
  const viewer = useRecordDetails(api.getById);
  const canWrite = !legacy && ["admin", "qa"].includes(role);
  const canDelete = !legacy && role === "admin";
  const [filter, setFilter] = useState("");
  const [form, setForm] = useState(null);
  const [values, setValues] = useState(emptyForm);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const closeForm = useCallback(() => { if (!pending.current) { setForm(null); setError(""); } }, []);
  const closeDelete = useCallback(() => { if (!pending.current) { setDeleting(null); setError(""); } }, []);
  const name = record => legacy ? record.titulo : record.nome;

  function openForm(record = null) {
    if (!canWrite || pending.current) return;
    setError(""); setNotice("");
    setValues({ nome: record?.nome ?? "", descricao: record?.descricao ?? "" });
    setForm(record ? { id: record.id } : {});
  }
  async function save(event) {
    event.preventDefault();
    if (!canWrite || !form || pending.current) return;
    const nome = values.nome.trim();
    if (!nome) { setError("Informe o nome do Project."); return; }
    pending.current = true; setBusy(true); setError("");
    try {
      const payload = { nome, descricao: values.descricao === "" ? null : values.descricao };
      if (form.id) await projectCatalogAPI.update(form.id, payload);
      else await projectCatalogAPI.create(payload);
      if (!list.mounted.current) return;
      setForm(null); setNotice("Project salvo com sucesso."); list.reload();
    } catch (failure) {
      if (list.mounted.current) setError(failure.message || "Não foi possível salvar o Project.");
    } finally { pending.current = false; if (list.mounted.current) setBusy(false); }
  }
  async function remove() {
    if (!canDelete || !deleting || pending.current) return;
    pending.current = true; setBusy(true); setError("");
    try {
      await projectCatalogAPI.delete(deleting.id);
      if (!list.mounted.current) return;
      setDeleting(null); setNotice("Project excluído com sucesso."); list.reload();
    } catch (failure) {
      if (list.mounted.current) setError(failure.message || "Não foi possível excluir o Project.");
    } finally { pending.current = false; if (list.mounted.current) setBusy(false); }
  }
  const visible = list.data.filter(record => [name(record), record.descricao, record.id].some(value => String(value ?? "").toLocaleLowerCase("pt-BR").includes(filter.toLocaleLowerCase("pt-BR"))));
  const title = legacy ? "Registros legados" : "Projects";
  return React.createElement("div", { className: "card" },
    React.createElement("h2", null, title),
    legacy && React.createElement("p", null, "Armazenamento legado compartilhado, somente leitura. Os registros serão revisados posteriormente, sem classificação ou conversão automática para Project ou Test Case."),
    React.createElement("div", { style: toolbar },
      React.createElement("label", null, "Filtrar nesta página ", React.createElement("input", { type: "search", value: filter, onChange: event => setFilter(event.target.value), "aria-label": `Filtrar nesta página de ${title}` })),
      canWrite && React.createElement("button", { type: "button", onClick: () => openForm() }, "Novo Project")),
    notice && React.createElement("p", { role: "status" }, notice),
    list.isLoading ? React.createElement("p", { role: "status" }, "Carregando registros...") : list.error ?
      React.createElement("div", { role: "alert" }, React.createElement("p", null, list.error), React.createElement("button", { type: "button", onClick: list.reload }, "Tentar novamente")) :
      visible.length === 0 ? React.createElement("p", null, filter ? "Nenhum registro corresponde ao filtro nesta página." : "Nenhum registro nesta página.") :
      React.createElement("div", { style: { overflowX: "auto" } }, React.createElement("table", { style: { width: "100%", borderCollapse: "collapse" } },
        React.createElement("caption", { style: { textAlign: "left" } }, legacy ? "Registros do armazenamento legado compartilhado" : "Catálogo de Projects ativos"),
        React.createElement("thead", null, React.createElement("tr", null, ["ID", legacy ? "Título" : "Nome", "Descrição", "Ações"].map(label => React.createElement("th", { key: label, scope: "col", style: rowStyle }, label)))),
        React.createElement("tbody", null, visible.map(record => React.createElement("tr", { key: record.id },
          React.createElement("td", { style: rowStyle }, record.id), React.createElement("td", { style: rowStyle }, name(record) || "Não informado"),
          React.createElement("td", { style: rowStyle }, record.descricao || "Não informado"),
          React.createElement("td", { style: rowStyle }, React.createElement("div", { style: toolbar },
            React.createElement(ViewRecordButton, { record, onView: viewer.open }),
            canWrite && React.createElement(ActionButton, { action: "edit", type: "button", onClick: () => openForm(record), "aria-label": `Editar ${record.nome}` }, "Editar"),
            canDelete && React.createElement(ActionButton, { action: "delete", type: "button", disabled: busy, onClick: () => { setError(""); setNotice(""); setDeleting(record); }, "aria-label": `Excluir ${record.nome}` }, "Excluir")))))))),
    React.createElement(Pagination, { page: list.page, pageSize: list.pageSize, total: list.total, loading: list.isLoading, error: Boolean(list.error), empty: list.data.length === 0, onPageChange: list.setPage, onPageSizeChange: list.setPageSize }),
    React.createElement(RecordDetailsModal, { viewer, kind: legacy ? "project" : "catalog" }),
    canWrite && React.createElement(Modal, { isOpen: Boolean(form), title: form?.id ? "Editar Project" : "Novo Project", onClose: closeForm, dialogLabel: "Formulário de Project" },
      React.createElement("form", { onSubmit: save },
        React.createElement("label", null, "Nome (obrigatório)", React.createElement("input", { name: "nome", required: true, disabled: busy, value: values.nome, onChange: event => setValues(current => ({ ...current, nome: event.target.value })) })),
        React.createElement("label", null, "Descrição (opcional)", React.createElement("textarea", { name: "descricao", disabled: busy, value: values.descricao, onChange: event => setValues(current => ({ ...current, descricao: event.target.value })) })),
        error && React.createElement("p", { role: "alert" }, error),
        React.createElement("div", { style: toolbar }, React.createElement("button", { type: "submit", disabled: busy }, busy ? "Salvando..." : "Salvar"), React.createElement("button", { type: "button", disabled: busy, onClick: closeForm }, "Cancelar")))),
    canDelete && React.createElement(Modal, { isOpen: Boolean(deleting), title: "Excluir Project", onClose: closeDelete, dialogLabel: "Confirmar exclusão de Project" },
      React.createElement("p", null, `Excluir ${deleting?.nome ?? ""}? Os vínculos existentes serão preservados.`),
      error && React.createElement("p", { role: "alert" }, error),
      React.createElement("div", { style: toolbar }, React.createElement("button", { type: "button", disabled: busy, onClick: closeDelete }, "Cancelar"), React.createElement(ActionButton, { action: "delete", type: "button", disabled: busy, onClick: remove }, busy ? "Excluindo..." : "Confirmar exclusão"))));
}

export default function Projects() {
  const { user } = useAuth();
  const [area, setArea] = useState("catalog");
  return React.createElement("div", { className: "page" }, React.createElement("h1", null, "Projects"),
    React.createElement("div", { role: "group", "aria-label": "Áreas de Projects", style: toolbar },
      React.createElement("button", { type: "button", "aria-pressed": area === "catalog", "aria-controls": "projects-catalog", onClick: () => setArea("catalog") }, "Projects"),
      React.createElement("button", { type: "button", "aria-pressed": area === "legacy", "aria-controls": "projects-legacy", onClick: () => setArea("legacy") }, "Registros legados")),
    React.createElement("section", { id: "projects-catalog", hidden: area !== "catalog", "aria-label": "Catálogo de Projects" }, React.createElement(ProjectArea, { role: user?.role })),
    React.createElement("section", { id: "projects-legacy", hidden: area !== "legacy", "aria-label": "Registros legados" }, React.createElement(ProjectArea, { legacy: true, role: user?.role })));
}

import ActionButton from "./ActionButton";
import { createElement as h } from "react";
import Modal from "./Modal";
import "./RecordDetails.css";

function valueText(value) {
  if (value === undefined || value === null || (typeof value === "string" && !value.trim())) return "Não informado";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}
function dateText(value) {
  if (!value) return "Não informado";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? valueText(value) : date.toLocaleString("pt-BR");
}
export function ViewRecordButton({ record, onView }) {
  const label = `Visualizar ${valueText(record.nome ?? record.titulo)}`;
  return h(ActionButton, { action: "view", "aria-label": label, title: label, onClick: () => onView(record) });
}
export function RecordDetailsBody({ record, kind }) {
  const fields = [["ID", record.id], [kind === "catalog" ? "Nome" : "Título", kind === "catalog" ? record.nome : record.titulo], ["Descrição", record.descricao]];
  if (kind === "requirement") fields.push(["Status", record.status], ["Prioridade", record.prioridade]);
  else if (kind !== "catalog") fields.push(["Feature", record.feature], ["Cenários", record.cenarios]);
  fields.push(["ID do autor", record.created_by], ["Criado em", dateText(record.created_at)], ["Atualizado em", dateText(record.updated_at)]);
  return h("dl", { className: "record-details-fields" }, fields.map(([label, value]) =>
    h("div", { key: label }, h("dt", null, label), h("dd", null, valueText(value)))));
}
export default function RecordDetailsModal({ viewer, kind }) {
  const title = viewer.record?.nome || viewer.record?.titulo || viewer.selected?.titulo || (kind === "requirement" ? "Requisito" : "Projeto");
  return h(Modal, { isOpen: Boolean(viewer.selected), title, onClose: viewer.close, dialogLabel: "Detalhes do registro" },
    h("div", { className: "record-details" },
      viewer.loading ? h("p", { role: "status" }, "Carregando detalhes...") : viewer.error ?
        h("div", { role: "alert" }, h("p", null, viewer.error), h("button", { type: "button", onClick: viewer.retry }, "Tentar novamente")) :
        viewer.record ? h(RecordDetailsBody, { record: viewer.record, kind }) : null,
      h("button", { type: "button", onClick: viewer.close }, "Fechar")));
}

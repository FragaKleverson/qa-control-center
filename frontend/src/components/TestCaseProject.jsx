import { createElement as h } from "react";

import { projectText } from "../domain/projectText";

export function TestCaseProjectValue({ record }) {
  return h("div", { style: { marginBottom: "16px" } }, h("p", { style: { marginBottom: "4px", fontWeight: 700 } }, "Project"), h("p", null, projectText(record)));
}
export default function TestCaseProjectField({ link, disabled = false }) {
  const currentId = link.current?.project_id;
  const currentMissing = currentId != null && !link.data.some(project => project.id === currentId);
  return h("div", { style: { marginBottom: "16px" } },
    h("label", null, "Project (opcional)", h("select", {
      name: "project_id", value: link.selection, disabled, onChange: event => link.select(event.target.value),
    }, h("option", { value: "" }, "Sem projeto vinculado"),
    currentMissing && h("option", { value: String(currentId), disabled: true }, projectText(link.current)),
    link.data.map(project => h("option", { key: project.id, value: String(project.id) }, project.nome)))),
    link.loading && h("p", { role: "status" }, "Carregando Projects…"),
    link.error && h("p", { role: "alert" }, `${link.error} Você pode salvar sem vínculo ou preservar o vínculo atual.`),
    !link.loading && !link.error && !link.data.length && h("p", { role: "status" }, "Nenhum Project ativo disponível."));
}

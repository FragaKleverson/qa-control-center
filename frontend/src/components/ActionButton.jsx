import { createElement as h } from "react";
import "./ActionButton.css";

const actions = {
  view: { label: "Visualizar", paths: ["M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z", "M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0"] },
  edit: { label: "Editar", paths: ["m16 3 5 5-12 12-6 1 1-6L16 3Z", "m14 5 5 5"] },
  delete: { label: "Excluir", paths: ["M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"] },
  restore: { label: "Restaurar", paths: ["M3 4v6h6", "M3 10a9 9 0 1 1 1 8", "M12 7v5l3 2"] },
};

export default function ActionButton({ action = "view", children, className = "", ...props }) {
  const { label, paths } = actions[action];
  return h("button", {
    type: "button",
    title: label,
    ...props,
    className: `action-button action-button--${action} ${className}`.trim(),
  }, h("svg", { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true, focusable: false },
    ...paths.map((d, index) => h("path", { key: index, d }))), h("span", null, children ?? label));
}

import { useEffect, useState } from "react";
import { projectCatalogAPI, parsePaginationResponse } from "../services/api";

export default function useProjectLink(isOpen) {
  const [current, setCurrent] = useState(null);
  const [selection, setSelection] = useState("");
  const [changed, setChanged] = useState(false);
  const [catalog, setCatalog] = useState({ data: [], loading: isOpen, error: "" });
  useEffect(() => {
    if (!isOpen) return;
    const controller = new AbortController();
    // reset() initializes loading when the form opens; only async results update it here.
    async function load() {
      try {
        const response = await projectCatalogAPI.list(undefined, { signal: controller.signal });
        if (controller.signal.aborted) return;
        const { data, total } = parsePaginationResponse(response);
        if (data.length !== total || data.some(project => !Number.isInteger(project.id) || project.id <= 0 || project.id > 2147483647 || typeof project.nome !== "string")) {
          throw new Error("Catálogo de Projects inválido ou incompleto.");
        }
        setCatalog({ data: data.filter(project => !project.deleted_at), loading: false, error: "" });
      } catch (error) {
        if (!controller.signal.aborted) setCatalog({ data: [], loading: false, error: error.message || "Não foi possível carregar Projects." });
      }
    }
    load();
    return () => controller.abort();
  }, [isOpen]);
  function reset(record = null) {
    setCatalog({ data: [], loading: true, error: "" });
    setCurrent(record); setSelection(record?.project_id == null ? "" : String(record.project_id)); setChanged(false);
  }
  function select(value) { setSelection(value); setChanged(true); }
  function payload() {
    const original = current?.project_id == null ? "" : String(current.project_id);
    if (!changed || (current && selection === original)) return {};
    if (selection === "") return { project_id: null };
    const project = catalog.data.find(item => String(item.id) === selection);
    if (catalog.loading || catalog.error || !project || project.deleted_at) throw new Error("Selecione um Project ativo disponível no catálogo.");
    return { project_id: project.id };
  }
  return { ...catalog, current, selection, reset, select, payload };
}

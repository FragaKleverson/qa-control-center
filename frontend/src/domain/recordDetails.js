// Independent of pagination and forms: the viewer only receives a GET function.
export function createRecordViewer(fetchRecord, onChange) {
  let controller = null;
  let state = { selected: null, record: null, loading: false, error: "" };
  const emit = (next) => { state = next; onChange(next); };
  const cancel = () => { controller?.abort(); controller = null; };
  const close = () => { cancel(); emit({ selected: null, record: null, loading: false, error: "" }); };
  async function open(selected) {
    cancel();
    const request = new AbortController(); controller = request;
    const selection = { id: selected.id, titulo: selected.titulo };
    emit({ selected: selection, record: null, loading: true, error: "" });
    try {
      const record = await fetchRecord(selection.id, { signal: request.signal });
      if (controller !== request || request.signal.aborted) return;
      if (!record || Array.isArray(record) || String(record.id) !== String(selection.id)) {
        throw new Error("Resposta de detalhes inválida.");
      }
      if (record.deleted_at) throw Object.assign(new Error(), { status: 404 });
      emit({ selected: selection, record, loading: false, error: "" });
    } catch (error) {
      if (controller !== request || request.signal.aborted) return;
      const message = error.status === 404 ? "Registro não encontrado ou excluído." :
        error.status === 403 ? "Você não possui permissão para visualizar este registro." :
        error.message || "Não foi possível consultar os detalhes.";
      emit({ selected: selection, record: null, loading: false, error: message });
    }
  }
  const retry = () => state.selected ? open(state.selected) : Promise.resolve();
  return { open, close, retry, cancel };
}

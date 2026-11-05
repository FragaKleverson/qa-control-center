export function projectText(record) {
  if (record?.project_id == null) return "Sem projeto vinculado";
  return `${record.project_nome || `Project #${record.project_id}`}${record.project_deleted_at ? " — Excluído" : ""}`;
}

// Informational state only; execution eligibility remains enforced by the backend.
export function planExecutionView(plan) {
  if (!plan.execution_id) return { available: false, message: "" };
  if (plan.execution_deleted_at) return {
    available: false,
    message: "Execu\u00e7\u00e3o exclu\u00edda: consulta indispon\u00edvel. O plano permanece executado.",
  };
  return { available: true, message: "" };
}
export function executionLookupMessage(error) {
  return error.status === 404
    ? "Execu\u00e7\u00e3o indispon\u00edvel para consulta. O plano permanece executado."
    : error.message;
}

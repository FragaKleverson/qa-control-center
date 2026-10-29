// API Service - Centraliza todas as chamadas à API
// A URL base é definida em frontend/.env (ou .env.local) via VITE_API_BASE_URL.
// Nunca hardcode a URL aqui — use a variável de ambiente para suportar múltiplos ambientes.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

// Monta querystring de paginação, filtro e ordenação — omite chaves ausentes.
// Usado pelas listagens paginadas (Fase 4, item 12 / UI).
function buildPaginationQuery({ page, limit, projeto_id, sort_by, sort_dir } = {}) {
  const params = new URLSearchParams();
  if (page !== undefined) params.set("page", page);
  if (limit !== undefined) params.set("limit", limit);
  if (projeto_id !== undefined) params.set("projeto_id", projeto_id);
  if (sort_by !== undefined) params.set("sort_by", sort_by);
  if (sort_dir !== undefined) params.set("sort_dir", sort_dir);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

// Mantém o Response de sucesso intacto, inclusive para downloads.
async function checkHttpResponse(res) {
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const message = typeof body?.error === "string" && body.error.trim()
      ? body.error
      : `Erro HTTP ${res.status}`;
    const error = new Error(message);
    error.status = res.status;
    throw error;
  }
  return res;
}

// Valida antes de atualizar o estado, preservando a lista anterior em caso de erro.
export function parsePaginationResponse(response) {
  const legacy = Array.isArray(response);
  const data = legacy ? response : response?.data;
  const total = legacy ? response.length : response?.total;
  if (
    !Array.isArray(data) ||
    data.some((item) => !item || typeof item !== "object" || Array.isArray(item)) ||
    !Number.isSafeInteger(total) || total < 0 || total < data.length ||
    (!legacy && (
      !Number.isSafeInteger(response.page) || response.page < 1 ||
      !Number.isSafeInteger(response.limit) || response.limit < 1 || response.limit > 100
    ))
  ) {
    throw new Error("Resposta de listagem inválida");
  }
  return { data, total };
}

// Wrapper que injeta o Bearer token e redireciona para /login em 401
function apiFetch(url, options = {}) {
  const token = localStorage.getItem("qa_token");
  const headers = {
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  return fetch(url, { ...options, headers }).then((res) => {
    if (res.status === 401) {
      localStorage.removeItem("qa_token");
      localStorage.removeItem("qa_user");
      window.location.href = "/login";
      throw new Error("Sessão expirada. Faça login novamente.");
    }
    return checkHttpResponse(res);
  });
}

// ==================== AUTH ====================
export const authAPI = {
  login: (email, password) =>
    fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    }).then(checkHttpResponse).then(r => r.json()),
};

// ==================== PROJETOS ====================
export const projectsAPI = {
  // Sem params: array simples (compat). Com { page, limit }: { data, total, page, limit }.
  list: (pagination, options) => apiFetch(`${API_BASE_URL}/projetos${buildPaginationQuery(pagination)}`, options).then(r => r.json()),
  create: (data) =>
    apiFetch(`${API_BASE_URL}/projetos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(r => r.json()),
  update: (id, data) =>
    apiFetch(`${API_BASE_URL}/projetos/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(r => r.json()),
  delete: (id) =>
    apiFetch(`${API_BASE_URL}/projetos/${id}`, { method: "DELETE" }).then(r =>
      r.json()
    ),
};

// ==================== TEST SUITES ====================
export const testSuitesAPI = {
  list: (pagination, options) => apiFetch(`${API_BASE_URL}/test-suites${buildPaginationQuery(pagination)}`, options).then(r => r.json()),
  create: (data) =>
    apiFetch(`${API_BASE_URL}/test-suites`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(r => r.json()),
  delete: (id) =>
    apiFetch(`${API_BASE_URL}/test-suites/${id}`, { method: "DELETE" }).then(r =>
      r.json()
    ),
  getCases: (suiteId) =>
    apiFetch(`${API_BASE_URL}/test-suites/${suiteId}/cases`).then(r => r.json()),
  addCase: (suiteId, projetoId) =>
    apiFetch(`${API_BASE_URL}/test-suites/${suiteId}/cases`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projeto_id: projetoId }),
    }).then(r => r.json()),
  removeCase: (suiteId, projetoId) =>
    apiFetch(`${API_BASE_URL}/test-suites/${suiteId}/cases/${projetoId}`, {
      method: "DELETE",
    }).then(r => r.json()),
};

// ==================== REQUIREMENTS ====================
export const requirementsAPI = {
  list: (pagination, options) => apiFetch(`${API_BASE_URL}/requirements${buildPaginationQuery(pagination)}`, options).then(r => r.json()),
  create: (data) =>
    apiFetch(`${API_BASE_URL}/requirements`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(r => r.json()),
  delete: (id) =>
    apiFetch(`${API_BASE_URL}/requirements/${id}`, { method: "DELETE" }).then(r =>
      r.json()
    ),
};

// ==================== TEST PLANS ====================
export const testPlansAPI = {
  list: (pagination, options) => apiFetch(`${API_BASE_URL}/test-plans${buildPaginationQuery(pagination)}`, options).then(r => r.json()),
  create: (data) =>
    apiFetch(`${API_BASE_URL}/test-plans`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(r => r.json()),
  update: (id, data) =>
    apiFetch(`${API_BASE_URL}/test-plans/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(r => r.json()),
  delete: (id) =>
    apiFetch(`${API_BASE_URL}/test-plans/${id}`, { method: "DELETE" }).then(r =>
      r.json()
    ),
  getSuites: (planId) =>
    apiFetch(`${API_BASE_URL}/test-plans/${planId}/suites`).then(r => r.json()),
  addSuite: (planId, suiteId) =>
    apiFetch(`${API_BASE_URL}/test-plans/${planId}/suites`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ suite_id: suiteId }),
    }).then(r => r.json()),
  removeSuite: (planId, suiteId) =>
    apiFetch(`${API_BASE_URL}/test-plans/${planId}/suites/${suiteId}`, {
      method: "DELETE",
    }).then(r => r.json()),
  execute: (planId, ambiente = "staging") =>
    apiFetch(`${API_BASE_URL}/test-plans/${planId}/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ambiente }),
    }).then(r => r.json()),
};

// ==================== EXECUÇÕES ====================
export const executionsAPI = {
  list: (pagination, options) => apiFetch(`${API_BASE_URL}/execucoes${buildPaginationQuery(pagination)}`, options).then(r => r.json()),
  create: (data) =>
    apiFetch(`${API_BASE_URL}/execucoes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(r => r.json()),
  delete: (id) =>
    apiFetch(`${API_BASE_URL}/execucoes/${id}`, { method: "DELETE" }).then(r =>
      r.json()
    ),
  getStats: (options) =>
    apiFetch(`${API_BASE_URL}/execucoes/stats/summary`, options).then(r => r.json()),
  getResults: (execucaoId) =>
    apiFetch(`${API_BASE_URL}/execucoes/${execucaoId}/results`).then(r => r.json()),
  updateResult: (execucaoId, projetoId, data) =>
    apiFetch(`${API_BASE_URL}/execucoes/${execucaoId}/results/${projetoId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(r => r.json()),
  finalize: (execucaoId) =>
    apiFetch(`${API_BASE_URL}/execucoes/${execucaoId}/finalize`, {
      method: "POST",
    }).then(r => r.json()),
};

// ==================== RELATÓRIOS ====================
export const reportsAPI = {
  list: (pagination, options) => apiFetch(`${API_BASE_URL}/relatorios${buildPaginationQuery(pagination)}`, options).then(r => r.json()),
  generate: (filters) =>
    apiFetch(`${API_BASE_URL}/relatorios/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(filters),
    }).then(r => r.json()),
  // Retorna o Response bruto para download do blob .docx
  exportDocx: (filters) =>
    apiFetch(`${API_BASE_URL}/relatorios/export`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(filters),
    }),
};

// ==================== ESTATÍSTICAS GERAIS ====================
export const statsAPI = {
  getDashboard: () => apiFetch(`${API_BASE_URL}/stats`).then(r => r.json()),
};

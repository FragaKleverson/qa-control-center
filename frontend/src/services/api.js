// API Service - Centraliza todas as chamadas à API
// A URL base é definida em frontend/.env (ou .env.local) via VITE_API_BASE_URL.
// Nunca hardcode a URL aqui — use a variável de ambiente para suportar múltiplos ambientes.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

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
    return res;
  });
}

// ==================== AUTH ====================
export const authAPI = {
  login: (email, password) =>
    fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    }).then(r => r.json()),
};

// ==================== PROJETOS ====================
export const projectsAPI = {
  list: () => apiFetch(`${API_BASE_URL}/projetos`).then(r => r.json()),
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
  list: () => apiFetch(`${API_BASE_URL}/test-suites`).then(r => r.json()),
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
  list: () => apiFetch(`${API_BASE_URL}/requirements`).then(r => r.json()),
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
  list: () => apiFetch(`${API_BASE_URL}/test-plans`).then(r => r.json()),
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
  list: () => apiFetch(`${API_BASE_URL}/execucoes`).then(r => r.json()),
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
  getStats: () =>
    apiFetch(`${API_BASE_URL}/execucoes/stats/summary`).then(r => r.json()),
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
  list: () => apiFetch(`${API_BASE_URL}/relatorios`).then(r => r.json()),
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

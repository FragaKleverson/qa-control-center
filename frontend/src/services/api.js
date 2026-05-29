// API Service - Centraliza todas as chamadas à API
const API_BASE_URL = "http://localhost:3001";

// ==================== PROJETOS ====================
export const projectsAPI = {
  list: () => fetch(`${API_BASE_URL}/projetos`).then(r => r.json()),
  create: (data) =>
    fetch(`${API_BASE_URL}/projetos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(r => r.json()),
  update: (id, data) =>
    fetch(`${API_BASE_URL}/projetos/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(r => r.json()),
  delete: (id) =>
    fetch(`${API_BASE_URL}/projetos/${id}`, { method: "DELETE" }).then(r =>
      r.json()
    ),
};

// ==================== TEST SUITES ====================
export const testSuitesAPI = {
  list: () => fetch(`${API_BASE_URL}/test-suites`).then(r => r.json()),
  create: (data) =>
    fetch(`${API_BASE_URL}/test-suites`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(r => r.json()),
  update: (id, data) =>
    fetch(`${API_BASE_URL}/test-suites/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(r => r.json()),
  delete: (id) =>
    fetch(`${API_BASE_URL}/test-suites/${id}`, { method: "DELETE" }).then(r =>
      r.json()
    ),
  getCases: (suiteId) =>
    fetch(`${API_BASE_URL}/test-suites/${suiteId}/cases`).then(r => r.json()),
  addCase: (suiteId, projetoId) =>
    fetch(`${API_BASE_URL}/test-suites/${suiteId}/cases`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projeto_id: projetoId }),
    }).then(r => r.json()),
  removeCase: (suiteId, projetoId) =>
    fetch(`${API_BASE_URL}/test-suites/${suiteId}/cases/${projetoId}`, {
      method: "DELETE",
    }).then(r => r.json()),
};

// ==================== REQUIREMENTS ====================
export const requirementsAPI = {
  list: () => fetch(`${API_BASE_URL}/requirements`).then(r => r.json()),
  create: (data) =>
    fetch(`${API_BASE_URL}/requirements`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(r => r.json()),
  update: (id, data) =>
    fetch(`${API_BASE_URL}/requirements/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(r => r.json()),
  delete: (id) =>
    fetch(`${API_BASE_URL}/requirements/${id}`, { method: "DELETE" }).then(r =>
      r.json()
    ),
};

// ==================== TEST PLANS ====================
export const testPlansAPI = {
  list: () => fetch(`${API_BASE_URL}/test-plans`).then(r => r.json()),
  create: (data) =>
    fetch(`${API_BASE_URL}/test-plans`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(r => r.json()),
  update: (id, data) =>
    fetch(`${API_BASE_URL}/test-plans/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(r => r.json()),
  delete: (id) =>
    fetch(`${API_BASE_URL}/test-plans/${id}`, { method: "DELETE" }).then(r =>
      r.json()
    ),
  getSuites: (planId) =>
    fetch(`${API_BASE_URL}/test-plans/${planId}/suites`).then(r => r.json()),
  addSuite: (planId, suiteId) =>
    fetch(`${API_BASE_URL}/test-plans/${planId}/suites`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ suite_id: suiteId }),
    }).then(r => r.json()),
  removeSuite: (planId, suiteId) =>
    fetch(`${API_BASE_URL}/test-plans/${planId}/suites/${suiteId}`, {
      method: "DELETE",
    }).then(r => r.json()),
  execute: (planId, ambiente = "staging") =>
    fetch(`${API_BASE_URL}/test-plans/${planId}/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ambiente }),
    }).then(r => r.json()),
};

// ==================== EXECUÇÕES ====================
export const executionsAPI = {
  list: () => fetch(`${API_BASE_URL}/execucoes`).then(r => r.json()),
  create: (data) =>
    fetch(`${API_BASE_URL}/execucoes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(r => r.json()),
  update: (id, data) =>
    fetch(`${API_BASE_URL}/execucoes/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(r => r.json()),
  delete: (id) =>
    fetch(`${API_BASE_URL}/execucoes/${id}`, { method: "DELETE" }).then(r =>
      r.json()
    ),
  getStats: () =>
    fetch(`${API_BASE_URL}/execucoes/stats/summary`).then(r => r.json()),
  getResults: (execucaoId) =>
    fetch(`${API_BASE_URL}/execucoes/${execucaoId}/results`).then(r => r.json()),
  updateResult: (execucaoId, projetoId, data) =>
    fetch(`${API_BASE_URL}/execucoes/${execucaoId}/results/${projetoId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(r => r.json()),
};

// ==================== RELATÓRIOS ====================
export const reportsAPI = {
  list: () => fetch(`${API_BASE_URL}/relatorios`).then(r => r.json()),
  generate: (filters) =>
    fetch(`${API_BASE_URL}/relatorios/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(filters),
    }).then(r => r.json()),
};

// ==================== ESTATÍSTICAS GERAIS ====================
export const statsAPI = {
  getDashboard: () => fetch(`${API_BASE_URL}/stats`).then(r => r.json()),
};

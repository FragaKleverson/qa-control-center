/**
 * Barrel de serviços — Fase 4, Item 13 (Refatoração da Service Layer).
 *
 * Cada serviço vive em seu próprio arquivo (projectsService.js, executionsService.js, etc.)
 * em vez de um único index.js monolítico. Este arquivo apenas reexporta,
 * preservando o contrato `const { xService } = require("../services")` já usado nas rotas.
 */

const projectsService = require("./projectsService");
const testSuitesService = require("./testSuitesService");
const requirementsService = require("./requirementsService");
const testPlansService = require("./testPlansService");
const executionsService = require("./executionsService");
const reportsService = require("./reportsService");
const statsService = require("./statsService");

module.exports = {
  projectsService,
  testSuitesService,
  requirementsService,
  testPlansService,
  executionsService,
  reportsService,
  statsService
};

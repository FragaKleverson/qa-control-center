/**
 * Schemas Zod para as rotas de /execucoes.
 */

const { z } = require("zod");

// Status válidos para execuções e resultados
const STATUS_EXECUCAO = [
  "pending",
  "in_progress",
  "running",
  "passed",
  "failed",
  "blocked",
  "completed",
  "skipped",
];

// Criação: suite_id obrigatório
const createSchema = z.object({
  suite_id: z.coerce
    .number()
    .int()
    .positive("suite_id deve ser um inteiro positivo"),
  ambiente: z.string().max(255).optional().default("staging"),
  status: z.enum(STATUS_EXECUCAO, {
    errorMap: () => ({ message: `Status deve ser: ${STATUS_EXECUCAO.join(", ")}` }),
  }).optional().default("pending"),
  resultado: z.string().nullable().optional(),
});

// Atualização: todos opcionais
const updateSchema = z.object({
  status: z.enum(STATUS_EXECUCAO, {
    errorMap: () => ({ message: `Status deve ser: ${STATUS_EXECUCAO.join(", ")}` }),
  }).optional(),
  resultado: z.string().nullable().optional(),
});

// Atualizar resultado de um test case dentro de uma execução
const updateResultSchema = z.object({
  status: z.enum(STATUS_EXECUCAO, {
    errorMap: () => ({ message: `Status deve ser: ${STATUS_EXECUCAO.join(", ")}` }),
  }),
  comentario: z.string().max(2000).nullable().optional(),
});

module.exports = { createSchema, updateSchema, updateResultSchema };

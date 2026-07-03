/**
 * Schemas Zod compartilhados entre rotas.
 */

const { z } = require("zod");

// Valida que o param :id da rota é um número inteiro positivo
// (Express sempre passa params como string, ex: "42")
const idParamSchema = z.object({
  id: z
    .string()
    .regex(/^\d+$/, "ID deve ser um número inteiro positivo"),
});

// Valida dois params inteiros: :id e :projetoId
// Usado em: PUT /execucoes/:id/results/:projetoId
const idAndProjetoIdSchema = z.object({
  id: z.string().regex(/^\d+$/, "ID deve ser um número inteiro positivo"),
  projetoId: z
    .string()
    .regex(/^\d+$/, "projetoId deve ser um número inteiro positivo"),
});

// Valida dois params inteiros: :id e :suiteId
// Usado em: DELETE /test-plans/:id/suites/:suiteId
const idAndSuiteIdSchema = z.object({
  id: z.string().regex(/^\d+$/, "ID deve ser um número inteiro positivo"),
  suiteId: z
    .string()
    .regex(/^\d+$/, "suiteId deve ser um número inteiro positivo"),
});

module.exports = { idParamSchema, idAndProjetoIdSchema, idAndSuiteIdSchema };

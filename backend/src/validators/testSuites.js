/**
 * Schemas Zod para as rotas de /test-suites.
 */

const { z } = require("zod");

// Criação: nome é obrigatório
const createSchema = z.object({
  nome: z.string().trim().min(1, "Nome é obrigatório"),
  descricao: z.string().optional().default(""),
  // projeto_id é opcional; coerce para aceitar string "5" vindo de forms
  projeto_id: z.coerce.number().int().positive().nullable().optional().default(null),
});

// Atualização: todos opcionais
const updateSchema = z.object({
  nome: z.string().trim().min(1, "Nome não pode ser vazio").optional(),
  descricao: z.string().optional(),
  projeto_id: z.coerce.number().int().positive().nullable().optional(),
});

// Vincular test case à suite: projeto_id obrigatório
const addCaseSchema = z.object({
  projeto_id: z.coerce
    .number()
    .int()
    .positive("projeto_id deve ser um inteiro positivo"),
});

module.exports = { createSchema, updateSchema, addCaseSchema };

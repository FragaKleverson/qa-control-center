/**
 * Schemas Zod para as rotas de /test-plans.
 */

const { z } = require("zod");

// Criação: titulo obrigatório; demais campos opcionais com default vazio
const createSchema = z.object({
  titulo: z.string().trim().min(1, "Título é obrigatório"),
  descricao: z.string().optional().default(""),
  escopo: z.string().optional().default(""),
  objetivo: z.string().optional().default(""),
  ambiente: z.string().optional().default(""),
});

// Atualização: todos opcionais
const updateSchema = z.object({
  titulo: z.string().trim().min(1, "Título não pode ser vazio").optional(),
  descricao: z.string().optional(),
  escopo: z.string().optional(),
  objetivo: z.string().optional(),
  ambiente: z.string().optional(),
});

// Vincular suite ao plan: suite_id obrigatório
const addSuiteSchema = z.object({
  suite_id: z.coerce
    .number()
    .int()
    .positive("suite_id deve ser um inteiro positivo"),
});

// Executar plan: ambiente opcional com default "staging"
const executeSchema = z.object({
  ambiente: z.string().max(255).optional().default("staging"),
});

module.exports = { createSchema, updateSchema, addSuiteSchema, executeSchema };

/**
 * Schemas Zod para as rotas de /test-plans.
 */

const { z } = require("zod");
const { environmentSchema } = require("../domain/environments");

// Criacao: titulo e ambiente obrigatorios; demais campos opcionais.
const createSchema = z.object({
  titulo: z.string().trim().min(1, "Título é obrigatório"),
  descricao: z.string().optional().default(""),
  escopo: z.string().optional().default(""),
  objetivo: z.string().optional().default(""),
  ambiente: environmentSchema,
});

// Atualização: todos opcionais
const updateSchema = z.object({
  titulo: z.string().trim().min(1, "Título não pode ser vazio").optional(),
  descricao: z.string().optional(),
  escopo: z.string().optional(),
  objetivo: z.string().optional(),
  ambiente: environmentSchema.optional(),
});

// Vincular suite ao plan: suite_id obrigatório
const addSuiteSchema = z.object({
  suite_id: z.coerce
    .number()
    .int()
    .positive("suite_id deve ser um inteiro positivo"),
});

// Ambiente enviado por clientes antigos e descartado; a origem e o plano.
const executeSchema = z.object({});

module.exports = { createSchema, updateSchema, addSuiteSchema, executeSchema };

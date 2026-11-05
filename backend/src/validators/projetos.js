/**
 * Schemas Zod para as rotas de /projetos (test cases).
 */

const { z } = require("zod");
const { paginationQuerySchema } = require("./common");

// Preserve the existing permissive JSON contract, including null and legacy shapes.
const cenariosSchema = z.json().optional();

const projectLinkSchema = z.number().int().positive().max(2147483647).nullable().optional();

const listQuerySchema = paginationQuerySchema.extend({
  sort_by: z.enum(["id", "created_at"]).optional(),
  sort_dir: z.enum(["asc", "desc"]).optional(),
});

// Criação: titulo, descricao e feature são obrigatórios (regra do service)
const createSchema = z.object({
  titulo: z.string().trim().min(1, "Título é obrigatório"),
  descricao: z.string().trim().min(1, "Descrição é obrigatória"),
  feature: z.string().trim().min(1, "Feature é obrigatória"),
  // JSONB accepts any JSON value; omission is preserved on partial update.
  cenarios: cenariosSchema,
  project_id: projectLinkSchema,
});

// Atualização: todos os campos são opcionais (partial update)
const updateSchema = z.object({
  titulo: z.string().trim().min(1, "Título não pode ser vazio").optional(),
  descricao: z.string().optional(),
  feature: z.string().optional(),
  cenarios: cenariosSchema,
  project_id: projectLinkSchema,
});

module.exports = { cenariosSchema, createSchema, updateSchema, listQuerySchema, projectLinkSchema };

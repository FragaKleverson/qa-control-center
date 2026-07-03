/**
 * Schemas Zod para as rotas de /projetos (test cases).
 */

const { z } = require("zod");

// Criação: titulo, descricao e feature são obrigatórios (regra do service)
const createSchema = z.object({
  titulo: z.string().trim().min(1, "Título é obrigatório"),
  descricao: z.string().trim().min(1, "Descrição é obrigatória"),
  feature: z.string().trim().min(1, "Feature é obrigatória"),
  // cenarios aceita qualquer formato — o service já trata internamente
  cenarios: z.any().optional(),
});

// Atualização: todos os campos são opcionais (partial update)
const updateSchema = z.object({
  titulo: z.string().trim().min(1, "Título não pode ser vazio").optional(),
  descricao: z.string().optional(),
  feature: z.string().optional(),
  cenarios: z.any().optional(),
});

module.exports = { createSchema, updateSchema };

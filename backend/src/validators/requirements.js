/**
 * Schemas Zod para as rotas de /requirements.
 */

const { z } = require("zod");

// Valores permitidos conforme o banco e regras de negócio
const STATUS_VALIDOS = ["Open", "In Progress", "Closed", "Blocked"];
const PRIORIDADE_VALIDA = ["Low", "Medium", "High", "Critical"];

// Criação: titulo obrigatório; status e prioridade têm default
const createSchema = z.object({
  titulo: z.string().trim().min(1, "Título é obrigatório"),
  descricao: z.string().optional().default(""),
  status: z.enum(STATUS_VALIDOS, {
    errorMap: () => ({ message: `Status deve ser: ${STATUS_VALIDOS.join(", ")}` }),
  }).optional().default("Open"),
  prioridade: z.enum(PRIORIDADE_VALIDA, {
    errorMap: () => ({ message: `Prioridade deve ser: ${PRIORIDADE_VALIDA.join(", ")}` }),
  }).optional().default("Medium"),
});

// Atualização: todos opcionais
const updateSchema = z.object({
  titulo: z.string().trim().min(1, "Título não pode ser vazio").optional(),
  descricao: z.string().optional(),
  status: z.enum(STATUS_VALIDOS, {
    errorMap: () => ({ message: `Status deve ser: ${STATUS_VALIDOS.join(", ")}` }),
  }).optional(),
  prioridade: z.enum(PRIORIDADE_VALIDA, {
    errorMap: () => ({ message: `Prioridade deve ser: ${PRIORIDADE_VALIDA.join(", ")}` }),
  }).optional(),
});

module.exports = { createSchema, updateSchema };

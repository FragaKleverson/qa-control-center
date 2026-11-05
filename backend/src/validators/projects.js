const { z } = require("zod");
const { paginationQuerySchema } = require("./common");

const projectIdSchema = z.number().int().positive().max(2147483647);
const idParamSchema = z.object({
  id: z.string().regex(/^[1-9]\d*$/, "ID deve ser um inteiro positivo")
    .refine((value) => Number(value) <= 2147483647, "ID fora do intervalo permitido")
    .transform(Number),
});
const nome = z.string().trim().min(1, "Nome é obrigatório");
const descricao = z.string().nullable().optional();
// Strip server-managed fields: never accept author, timestamps or soft-delete state.
const createSchema = z.object({ nome, descricao });
const updateSchema = z.object({ nome: nome.optional(), descricao })
  .refine((data) => data.nome !== undefined || data.descricao !== undefined, "Informe nome ou descrição");
module.exports = { projectIdSchema, idParamSchema, createSchema, updateSchema, listQuerySchema: paginationQuerySchema };

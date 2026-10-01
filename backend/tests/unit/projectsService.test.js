/**
 * Teste unitário — services/projectsService.js (Fase 5, item 16)
 * Isolado: mocka o pool do banco (../../src/db) — não abre conexão real.
 */

jest.mock("../../src/db", () => ({ query: jest.fn() }));

const pool = require("../../src/db");
const projectsService = require("../../src/services/projectsService");
const AppError = require("../../src/middleware/AppError");

beforeEach(() => {
    pool.query.mockReset();
});

describe("projectsService.listAll", () => {
    it("sem page/limit, retorna o array de rows diretamente", async () => {
        pool.query.mockResolvedValueOnce({ rows: [{ id: 1 }, { id: 2 }] });

        const result = await projectsService.listAll();

        expect(Array.isArray(result)).toBe(true);
        expect(result).toHaveLength(2);
        expect(pool.query).toHaveBeenCalledTimes(1);
    });

    it("com page/limit, retorna envelope paginado", async () => {
        pool.query
            .mockResolvedValueOnce({ rows: [{ id: 1 }] })
            .mockResolvedValueOnce({ rows: [{ count: "1" }] });

        const result = await projectsService.listAll({ page: 1, limit: 5 });

        expect(result).toEqual({ data: [{ id: 1 }], total: 1, page: 1, limit: 5 });
    });
});

describe("projectsService.create", () => {
    it("lança erro sem tocar no banco quando título está ausente", async () => {
        await expect(
            projectsService.create({ descricao: "d", feature: "f" })
        ).rejects.toThrow("Título, descrição e feature são obrigatórios");

        expect(pool.query).not.toHaveBeenCalled();
    });

    it("lança erro quando descrição é só espaços em branco", async () => {
        await expect(
            projectsService.create({ titulo: "t", descricao: "   ", feature: "f" })
        ).rejects.toThrow(/obrigat/);

        expect(pool.query).not.toHaveBeenCalled();
    });

    it("insere com sucesso quando todos os campos obrigatórios estão presentes", async () => {
        const criado = { id: 1, titulo: "t", descricao: "d", feature: "f", cenarios: [] };
        pool.query.mockResolvedValueOnce({ rows: [criado] });

        const result = await projectsService.create({ titulo: "t", descricao: "d", feature: "f" }, 42);

        expect(result).toEqual(criado);
        expect(pool.query).toHaveBeenCalledWith(
            expect.stringContaining("INSERT INTO projetos"),
            ["t", "d", "f", "[]", 42]
        );
    });
});

describe("projectsService.update / delete / restore — 404 quando não encontrado", () => {
    it("update lança AppError 404 quando nenhuma linha é afetada", async () => {
        pool.query.mockResolvedValueOnce({ rows: [] });

        await expect(projectsService.update(999, { titulo: "x" })).rejects.toMatchObject({
            statusCode: 404,
        });
    });

    it("delete lança AppError 404 quando o projeto não existe", async () => {
        pool.query.mockResolvedValueOnce({ rows: [] });

        await expect(projectsService.delete(999)).rejects.toBeInstanceOf(AppError);
    });

    it("restore lança AppError 404 quando o projeto não está deletado", async () => {
        pool.query.mockResolvedValueOnce({ rows: [] });

        await expect(projectsService.restore(999)).rejects.toMatchObject({
            statusCode: 404,
        });
    });
});

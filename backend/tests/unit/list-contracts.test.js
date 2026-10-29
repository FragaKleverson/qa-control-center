// Sem conexão real: até a importação do módulo de banco é substituída.
jest.mock("../../src/db", () => ({ query: jest.fn() }));

const pool = require("../../src/db");
const projectsService = require("../../src/services/projectsService");
const executionsService = require("../../src/services/executionsService");
const { listQuerySchema: projectsQuery } = require("../../src/validators/projetos");
const { listQuerySchema: executionsQuery } = require("../../src/validators/execucoes");

beforeEach(() => pool.query.mockReset());

describe("Contratos de listagem sem banco", () => {
  it("aplica o parâmetro de projeto nas linhas e no total, sem colidir com LIMIT/OFFSET", async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 7, projeto_id: 42 }] })
      .mockResolvedValueOnce({ rows: [{ count: "3" }] });
    const result = await executionsService.listAll({ projeto_id: 42, page: 2, limit: 2 });
    expect(result).toEqual({ data: [{ id: 7, projeto_id: 42 }], total: 3, page: 2, limit: 2 });
    expect(pool.query).toHaveBeenNthCalledWith(1,
      expect.stringMatching(/ts\.projeto_id = \$1 ORDER BY e\.created_at DESC, e\.id DESC LIMIT \$2 OFFSET \$3/),
      [42, 2, 2]);
    expect(pool.query).toHaveBeenNthCalledWith(2,
      expect.stringContaining("AND ts.projeto_id = $1"), [42]);
  });

  it("preserva array sem paginação e parametriza o filtro", async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 7 }] });
    expect(await executionsService.listAll({ projeto_id: 42 })).toEqual([{ id: 7 }]);
    expect(pool.query).toHaveBeenCalledTimes(1);
    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining("ts.projeto_id = $1"), [42]);
  });

  it.each(["asc", "desc"])("resolve apenas ordenação permitida antes de LIMIT (%s)", async (sort_dir) => {
    pool.query.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [{ count: "0" }] });
    await projectsService.listAll({ sort_by: "id", sort_dir, page: 2, limit: 3 });
    expect(pool.query).toHaveBeenNthCalledWith(1,
      expect.stringContaining(`ORDER BY id ${sort_dir.toUpperCase()} LIMIT $1 OFFSET $2`), [3, 3]);
  });

  it.each(["asc", "desc"])("usa ID para desempatar datas (%s)", async (sort_dir) => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    await projectsService.listAll({ sort_by: "created_at", sort_dir });
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining(`ORDER BY created_at ${sort_dir.toUpperCase()}, id ${sort_dir.toUpperCase()}`), undefined);
  });

  it.each(["__proto__", "constructor", "id DESC; DROP TABLE projetos"])(
    "rejeita campo arbitrário mesmo em chamada direta ao serviço: %s", async (sort_by) => {
      await expect(projectsService.listAll({ sort_by })).rejects.toMatchObject({ statusCode: 422 });
      expect(pool.query).not.toHaveBeenCalled();
    },
  );

  it.each(["ASC", "desc; SELECT 1", ""])("rejeita direção arbitrária: %s", async (sort_dir) => {
    await expect(projectsService.listAll({ sort_dir })).rejects.toMatchObject({ statusCode: 422 });
    expect(pool.query).not.toHaveBeenCalled();
  });

  it("transforma parâmetros válidos sem ativar paginação ao omitir page e limit", () => {
    expect(executionsQuery.parse({ projeto_id: "42" })).toEqual({ projeto_id: 42 });
    expect(projectsQuery.parse({ sort_by: "id", sort_dir: "asc" }))
      .toEqual({ sort_by: "id", sort_dir: "asc" });
  });

  it.each(["0", "-1", "1.5", "abc", "2147483648", ""])("rejeita ID inválido no schema: %s", (projeto_id) => {
    expect(executionsQuery.safeParse({ projeto_id }).success).toBe(false);
  });
});

// Isolado: o pool é substituído antes do import; não carregar app, setup ou .env.
jest.mock("../../src/db", () => ({ query: jest.fn() }));

const pool = require("../../src/db");
const reports = require("../../src/services/reportsService");

const emptyCases = {
  total: 0, passed: 0, failed: 0, pending: 0, blocked: 0, skipped: 0,
};

beforeEach(() => {
  pool.query.mockReset();
  // Consultas inesperadas devem falhar, em vez de produzir sucesso vazio.
  pool.query.mockRejectedValue(new Error("Consulta sintética não prevista"));
});

describe("reportsService.generateReport — contrato isolado", () => {
  it("associa casos por execução e agrega separadamente execuções e resultados", async () => {
    const executions = Object.freeze([
      Object.freeze({ id: 31, status: "passed", ambiente: "qa" }),
      Object.freeze({ id: 32, status: "failed", ambiente: "qa" }),
      Object.freeze({ id: 33, status: "pending", ambiente: "qa" }),
    ]);
    const cases = {
      31: [{ id: 101, projeto_id: 7, titulo: "Caso sintético A", status: "passed" },
        { id: 102, projeto_id: 8, titulo: "Caso sintético B", status: "passed" }],
      32: [{ id: 103, status: "failed" }, { id: 104, status: "blocked" }],
      33: [{ id: 105, status: "pending" }, { id: 106, status: "skipped" }],
    };
    pool.query.mockResolvedValueOnce({ rows: executions });
    pool.query.mockImplementation((_sql, [id]) => {
      if (!Object.hasOwn(cases, id)) throw new Error("Execução sintética inesperada");
      return Promise.resolve({ rows: cases[id] });
    });

    const report = await reports.generateReport({});

    expect(report).toEqual({
      summary: {
        total: 3, passed: 1, failed: 1, pending: 1, successRate: 33.3,
        testCases: { total: 6, passed: 2, failed: 1, pending: 1, blocked: 1, skipped: 1 },
      },
      executions: executions.map(ex => ({ ...ex, testCases: cases[ex.id] })),
    });
    expect(pool.query).toHaveBeenCalledTimes(4);
    expect(pool.query).toHaveBeenNthCalledWith(
      1, "SELECT * FROM execucoes WHERE 1=1 ORDER BY created_at DESC", [],
    );
    executions.forEach((ex, index) => {
      const [sql, params] = pool.query.mock.calls[index + 1];
      expect(sql).toMatch(/FROM execution_results er/);
      expect(sql).toMatch(/INNER JOIN projetos p ON p\.id = er\.projeto_id/);
      expect(sql).toMatch(/WHERE er\.execucao_id = \$1\s+ORDER BY er\.id ASC/);
      expect(params).toEqual([ex.id]);
      expect(ex).not.toHaveProperty("testCases");
    });
  });

  it.each([
    ["data inicial", { startDate: "2026-11-01" },
      " AND created_at >= $1::date", ["2026-11-01"]],
    ["data final inclusiva", { endDate: "2026-11-12" },
      " AND created_at < ($1::date + INTERVAL '1 day')", ["2026-11-12"]],
    ["suíte", { suite_id: 9 }, " AND suite_id = $1", [9]],
    ["todos os filtros", { startDate: "2026-11-01", endDate: "2026-11-12", suite_id: 9 },
      " AND created_at >= $1::date AND created_at < ($2::date + INTERVAL '1 day') AND suite_id = $3",
      ["2026-11-01", "2026-11-12", 9]],
  ])("parametriza %s sem alterar o objeto de filtros", async (_label, filters, clause, params) => {
    const original = { ...filters };
    Object.freeze(filters);
    pool.query.mockResolvedValueOnce({ rows: [] });

    await reports.generateReport(filters);

    expect(pool.query).toHaveBeenCalledTimes(1);
    expect(pool.query).toHaveBeenCalledWith(
      `SELECT * FROM execucoes WHERE 1=1${clause} ORDER BY created_at DESC`, params,
    );
    expect(filters).toEqual(original);
  });

  it("mantém conteúdo semelhante a SQL exclusivamente nos parâmetros", async () => {
    const value = "9 OR 1=1 -- sintetico";
    pool.query.mockResolvedValueOnce({ rows: [] });

    await reports.generateReport({ suite_id: value });

    expect(pool.query).toHaveBeenCalledTimes(1);
    expect(pool.query).toHaveBeenCalledWith(
      "SELECT * FROM execucoes WHERE 1=1 AND suite_id = $1 ORDER BY created_at DESC", [value],
    );
    expect(pool.query.mock.calls[0][0]).not.toContain(value);
    // Parametrização comprovada aqui; validação de tipo/PostgreSQL fica fora da suíte.
  });

  it("retorna resumo zerado e não consulta casos quando não existem execuções", async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    expect(await reports.generateReport({})).toEqual({
      summary: { total: 0, passed: 0, failed: 0, pending: 0, successRate: 0, testCases: emptyCases },
      executions: [],
    });
    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  it("preserva execução sem resultados e calcula sua taxa independentemente dos casos", async () => {
    const execution = { id: 41, status: "passed" };
    pool.query.mockResolvedValueOnce({ rows: [execution] }).mockResolvedValueOnce({ rows: [] });

    expect(await reports.generateReport({})).toEqual({
      summary: { total: 1, passed: 1, failed: 0, pending: 0, successRate: 100, testCases: emptyCases },
      executions: [{ ...execution, testCases: [] }],
    });
    expect(pool.query).toHaveBeenCalledTimes(2);
    expect(pool.query.mock.calls[1][1]).toEqual([execution.id]);
  });

  it("propaga o erro original da consulta inicial sem produzir relatório vazio", async () => {
    const failure = new Error("Falha sintética ao consultar execuções");
    pool.query.mockRejectedValueOnce(failure);

    await expect(reports.generateReport({})).rejects.toBe(failure);

    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  it("rejeita o relatório inteiro quando a consulta de casos falha após outra ter sucesso", async () => {
    const failure = new Error("Falha sintética ao consultar resultados");
    pool.query.mockResolvedValueOnce({ rows: [{ id: 51, status: "passed" }, { id: 52, status: "failed" }] })
      .mockResolvedValueOnce({ rows: [{ id: 201, status: "passed" }] })
      .mockRejectedValueOnce(failure);

    await expect(reports.generateReport({})).rejects.toBe(failure);

    expect(pool.query).toHaveBeenCalledTimes(3);
    expect(pool.query.mock.calls.slice(1).map(([, params]) => params)).toEqual([[51], [52]]);
  });
});

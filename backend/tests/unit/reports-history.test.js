// Isolado: nenhuma conexão PostgreSQL é criada.
jest.mock("../../src/db", () => ({ query: jest.fn() }));
const pool = require("../../src/db");
const reports = require("../../src/services/reportsService");

beforeEach(() => pool.query.mockReset());

describe("histórico de Reports", () => {
  const stats = [{ status: "passed", count: "42" }];
  const suiteStats = [{ suite_id: 1, total: "42", passed: "42" }];

  it("preserva o array legado e os agregados globais", async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 42 }] })
      .mockResolvedValueOnce({ rows: stats }).mockResolvedValueOnce({ rows: suiteStats });
    expect(await reports.listAll()).toEqual({ executions: [{ id: 42 }], stats, suiteStats });
    expect(pool.query.mock.calls[0][0]).toMatch(/ORDER BY created_at DESC, id DESC LIMIT 100$/);
  });

  it.each([1, 2, 3])("pagina %i mantém envelope aninhado e estatísticas integrais", async (page) => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 43 - page }] })
      .mockResolvedValueOnce({ rows: [{ count: "42" }] })
      .mockResolvedValueOnce({ rows: stats }).mockResolvedValueOnce({ rows: suiteStats });
    expect(await reports.listAll({ page, limit: 20 })).toEqual({
      executions: { data: [{ id: 43 - page }], total: 42, page, limit: 20 }, stats, suiteStats,
    });
    expect(pool.query.mock.calls[0]).toEqual([
      "SELECT * FROM execucoes ORDER BY created_at DESC, id DESC LIMIT $1 OFFSET $2",
      [20, (page - 1) * 20],
    ]);
    expect(pool.query.mock.calls[1][0]).toBe("SELECT COUNT(*) FROM execucoes");
    // Os agregados não recebem LIMIT/OFFSET da página.
    for (const [sql, params] of pool.query.mock.calls.slice(2)) {
      expect(sql).not.toMatch(/LIMIT|OFFSET/);
      expect(params).toBeUndefined();
    }
  });
});

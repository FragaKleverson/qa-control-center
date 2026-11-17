// Isolado: substituir o pool antes do import, sem app, setup de integração ou .env.
jest.mock("../../src/db", () => ({ query: jest.fn() }));

const pool = require("../../src/db");
const executions = require("../../src/services/executionsService");
const AppError = require("../../src/middleware/AppError");

const executionId = 71;
const counts = { total: "3", passed: "3", failed: "0", pending: "0" };

beforeEach(() => {
  pool.query.mockReset();
  pool.query.mockRejectedValue(new Error("Consulta sintética não prevista"));
});

describe("executionsService.finalize — contrato isolado", () => {
  it.each([
    ["todos aprovados", counts, "passed"],
    ["reprovação prevalece sobre aprovados e pendentes",
      { total: "3", passed: "1", failed: "1", pending: "1" }, "failed"],
    ["aprovados e pendentes",
      { total: "3", passed: "2", failed: "0", pending: "1" }, "completed"],
    ["somente pendentes",
      { total: "2", passed: "0", failed: "0", pending: "2" }, "completed"],
    ["outros status sem aprovados, reprovados ou pendentes",
      { total: "2", passed: "0", failed: "0", pending: "0" }, "completed"],
    ["nenhum resultado, com SUM nulo como no PostgreSQL",
      { total: "0", passed: null, failed: null, pending: null }, "completed"],
  ])("finaliza com %s", async (_label, aggregate, status) => {
    const persisted = { id: executionId, status, finalized: true, resultado: "Dados sintéticos" };
    pool.query.mockResolvedValueOnce({ rows: [{ finalized: false }] })
      .mockResolvedValueOnce({ rows: [aggregate] })
      .mockResolvedValueOnce({ rows: [persisted] });

    expect(await executions.finalize(executionId)).toBe(persisted);

    expect(pool.query).toHaveBeenCalledTimes(3);
    expect(pool.query).toHaveBeenNthCalledWith(
      1, "SELECT finalized FROM execucoes WHERE id = $1", [executionId],
    );
    const [sql, params] = pool.query.mock.calls[1];
    expect(sql).toMatch(/COUNT\(\*\) AS total/);
    for (const name of ["passed", "failed", "pending"]) {
      expect(sql).toMatch(new RegExp(`SUM\\(CASE\\s+WHEN\\s+status\\s*=\\s*'${name}'\\s+THEN\\s+1\\s+ELSE\\s+0\\s+END\\)\\s+AS\\s+${name}\\b`));
    }
    expect(sql).toMatch(/FROM execution_results WHERE execucao_id = \$1/);
    expect(params).toEqual([executionId]);
    expect(pool.query).toHaveBeenNthCalledWith(3,
      expect.stringMatching(/UPDATE execucoes SET status = \$1, finalized = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = \$2 RETURNING \*/),
      [status, executionId]);
  });

  it("rejeita execução inexistente com 404 antes de agregar ou atualizar", async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const result = executions.finalize(executionId);
    await expect(result).rejects.toBeInstanceOf(AppError);
    await expect(result).rejects.toMatchObject({ statusCode: 404, message: "Execução não encontrada" });

    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  it("rejeita nova finalização após o banco informar finalized sem recalcular ou regravar", async () => {
    const persisted = { id: executionId, status: "passed", finalized: true };
    pool.query.mockResolvedValueOnce({ rows: [{ finalized: false }] })
      .mockResolvedValueOnce({ rows: [counts] })
      .mockResolvedValueOnce({ rows: [persisted] })
      .mockResolvedValueOnce({ rows: [persisted] });

    expect(await executions.finalize(executionId)).toBe(persisted);
    await expect(executions.finalize(executionId)).rejects.toMatchObject({
      statusCode: 422, message: "Execução já foi finalizada.",
    });

    expect(pool.query).toHaveBeenCalledTimes(4);
    expect(pool.query).toHaveBeenLastCalledWith(
      "SELECT finalized FROM execucoes WHERE id = $1", [executionId],
    );
  });

  it.each([
    ["verificação inicial", 0],
    ["agregação de resultados", 1],
    ["gravação da finalização", 2],
  ])("propaga falha na %s sem retornar sucesso nem tentar consultas posteriores", async (_label, stage) => {
    const failure = new Error(`Falha sintética na etapa ${stage}`);
    if (stage >= 1) pool.query.mockResolvedValueOnce({ rows: [{ finalized: false }] });
    if (stage >= 2) pool.query.mockResolvedValueOnce({ rows: [counts] });
    pool.query.mockRejectedValueOnce(failure);

    await expect(executions.finalize(executionId)).rejects.toBe(failure);

    expect(pool.query).toHaveBeenCalledTimes(stage + 1);
    if (stage < 2) {
      expect(pool.query.mock.calls.some(([sql]) => /^UPDATE\b/.test(sql))).toBe(false);
    }
    // Rejeição da Promise não comprova rollback ou ausência de commit no banco real.
  });
});

describe("executionsService.updateResult — bloqueio após finalização", () => {
  it("rejeita alteração de resultado finalizado antes de qualquer UPDATE", async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ finalized: true }] });

    const result = executions.updateResult(executionId, 81, "failed", "Comentário sintético");
    await expect(result).rejects.toBeInstanceOf(AppError);
    await expect(result).rejects.toMatchObject({
      statusCode: 422, message: "Execução finalizada — não é possível editar os resultados.",
    });

    expect(pool.query).toHaveBeenCalledTimes(1);
    expect(pool.query).toHaveBeenCalledWith(
      "SELECT finalized FROM execucoes WHERE id = $1", [executionId],
    );
  });
});

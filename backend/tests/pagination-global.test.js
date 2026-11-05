const request = require("supertest");
const app = require("../src/app");
const pool = require("../src/db");
const { clearTables, closePool, createProjeto, createSuite } = require("./helpers/db");

beforeEach(clearTables);
afterAll(closePool);

describe("Filtro global de execuções", () => {
  async function seed() {
    // Títulos iguais não devem misturar projetos diferentes.
    const a = await createProjeto({ titulo: "Mesmo título" });
    const b = await createProjeto({ titulo: "Mesmo título" });
    const suiteA = await createSuite({ nome: "Suite A" });
    const suiteB = await createSuite({ nome: "Suite B" });
    await pool.query("UPDATE test_suites SET projeto_id = $1 WHERE id = $2", [a.id, suiteA.id]);
    await pool.query("UPDATE test_suites SET projeto_id = $1 WHERE id = $2", [b.id, suiteB.id]);
    const ids = [];
    for (const suiteId of [suiteA.id, suiteB.id, suiteA.id, suiteB.id, suiteA.id]) {
      const result = await pool.query(
        "INSERT INTO execucoes (suite_id, created_at) VALUES ($1, '2026-01-01T00:00:00Z') RETURNING id",
        [suiteId],
      );
      if (suiteId === suiteA.id) ids.push(result.rows[0].id);
    }
    await pool.query(
      "INSERT INTO execucoes (suite_id, deleted_at) VALUES ($1, NOW())",
      [suiteA.id],
    );
    return { a, ids: ids.reverse() };
  }

  it("filtra antes da paginação, conta apenas ativos e navega com desempate estável", async () => {
    const { a, ids } = await seed();
    const first = await request(app).get("/execucoes").query({ projeto_id: a.id, page: 1, limit: 2 });
    const second = await request(app).get("/execucoes").query({ projeto_id: a.id, page: 2, limit: 2 });
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(first.body).toMatchObject({ total: 3, page: 1, limit: 2 });
    expect(second.body).toMatchObject({ total: 3, page: 2, limit: 2 });
    expect(first.body.data.map((row) => row.id)).toEqual(ids.slice(0, 2));
    expect(second.body.data.map((row) => row.id)).toEqual(ids.slice(2));
    expect([...first.body.data, ...second.body.data].every((row) => row.projeto_id === a.id)).toBe(true);
    expect(first.body.data[0]).toHaveProperty("total_cases");
  });

  it("mantém arrays legados com e sem filtro, sem ativar paginação implicitamente", async () => {
    const { a } = await seed();
    const all = await request(app).get("/execucoes");
    const filtered = await request(app).get("/execucoes").query({ projeto_id: a.id });
    expect(all.status).toBe(200);
    expect(filtered.status).toBe(200);
    expect(Array.isArray(all.body)).toBe(true);
    expect(Array.isArray(filtered.body)).toBe(true);
    expect(all.body).toHaveLength(5);
    expect(filtered.body).toHaveLength(3);
  });

  it("retorna total zero para projeto sem execuções e preserva total em página fora do intervalo", async () => {
    const { a } = await seed();
    const emptyProject = await createProjeto();
    const empty = await request(app).get("/execucoes").query({ projeto_id: emptyProject.id, page: 1 });
    const beyond = await request(app).get("/execucoes").query({ projeto_id: a.id, page: 9, limit: 2 });
    expect(empty.status).toBe(200);
    expect(beyond.status).toBe(200);
    expect(empty.body).toEqual({ data: [], total: 0, page: 1, limit: 20 });
    expect(beyond.body).toEqual({ data: [], total: 3, page: 9, limit: 2 });
  });

  it.each(["0", "-1", "abc", "1.5", "2147483648", "1 OR 1=1", ""])(
    "rejeita projeto_id inválido: %s", async (projeto_id) => {
      const response = await request(app).get("/execucoes").query({ projeto_id, page: 1 });
      expect(response.status).toBe(422);
    },
  );
});

describe("Ordenação global dos casos de teste", () => {
  async function seed() {
    const rows = [];
    for (let i = 0; i < 5; i++) rows.push(await createProjeto({ titulo: `Caso ${i}` }));
    // Datas em ordem contrária ao ID detectam ordenação apenas no cliente.
    for (let i = 0; i < rows.length; i++) {
      await pool.query("UPDATE projetos SET created_at = $1 WHERE id = $2", [
        `2026-01-0${5 - i}T00:00:00Z`, rows[i].id,
      ]);
    }
    return rows.map((row) => row.id);
  }

  it.each(["asc", "desc"])("ordena globalmente por ID %s em páginas distintas", async (sort_dir) => {
    const ids = await seed();
    const expected = sort_dir === "asc" ? ids : [...ids].reverse();
    const received = [];
    for (const page of [1, 2, 3]) {
      const response = await request(app).get("/projetos").query({ sort_by: "id", sort_dir, page, limit: 2 });
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ total: 5, page, limit: 2 });
      received.push(...response.body.data.map((row) => row.id));
    }
    expect(received).toEqual(expected);
  });

  it.each(["asc", "desc"])("desempata datas iguais por ID %s", async (sort_dir) => {
    const ids = await seed();
    await pool.query("UPDATE projetos SET created_at = '2026-01-01T00:00:00Z'");
    const first = await request(app).get("/projetos").query({ sort_by: "created_at", sort_dir, page: 1, limit: 3 });
    const second = await request(app).get("/projetos").query({ sort_by: "created_at", sort_dir, page: 2, limit: 3 });
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect([...first.body.data, ...second.body.data].map((row) => row.id))
      .toEqual(sort_dir === "asc" ? ids : [...ids].reverse());
  });

  it("preserva array legado, ordem padrão por data e ordenação explícita sem paginação", async () => {
    const ids = await seed();
    const legacy = await request(app).get("/projetos");
    const sorted = await request(app).get("/projetos").query({ sort_by: "id", sort_dir: "desc" });
    expect(legacy.status).toBe(200);
    expect(sorted.status).toBe(200);
    expect(Array.isArray(legacy.body)).toBe(true);
    expect(Array.isArray(sorted.body)).toBe(true);
    expect(legacy.body.map((row) => row.id)).toEqual(ids);
    expect(sorted.body.map((row) => row.id)).toEqual([...ids].reverse());
  });

  it.each([
    { sort_by: "titulo" }, { sort_by: "id; DROP TABLE projetos" },
    { sort_by: "__proto__" }, { sort_dir: "sideways" }, { sort_dir: "ASC" },
    { sort_by: ["id", "created_at"] }, { page: 0 }, { limit: 101 },
  ])("rejeita parâmetros inválidos: %j", async (query) => {
    const response = await request(app).get("/projetos").query(query);
    expect(response.status).toBe(422);
  });
});

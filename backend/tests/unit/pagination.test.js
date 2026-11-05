/**
 * Teste unitário — services/pagination.js (Fase 5, item 16)
 * Isolado: não toca no banco, usa um `query` mockado.
 */

const { paginate, isPaginationRequested } = require("../../src/services/pagination");

describe("isPaginationRequested", () => {
    it("retorna false quando nem page nem limit são informados", () => {
        expect(isPaginationRequested({})).toBe(false);
        expect(isPaginationRequested(undefined)).toBe(false);
    });

    it("retorna true quando page é informado", () => {
        expect(isPaginationRequested({ page: 1 })).toBe(true);
    });

    it("retorna true quando limit é informado", () => {
        expect(isPaginationRequested({ limit: 10 })).toBe(true);
    });
});

describe("paginate", () => {
    const fakeRows = [{ id: 1 }, { id: 2 }];

    function makeMockQuery() {
        return jest.fn()
            .mockResolvedValueOnce({ rows: fakeRows })          // query paginada
            .mockResolvedValueOnce({ rows: [{ count: "42" }] }); // count
    }

    it("monta LIMIT/OFFSET corretamente para page=1", async () => {
        const query = makeMockQuery();
        const result = await paginate(query, {
            baseSql: "SELECT * FROM x",
            countSql: "SELECT COUNT(*) FROM x",
            page: 1,
            limit: 10,
        });

        expect(query).toHaveBeenNthCalledWith(1, "SELECT * FROM x LIMIT $1 OFFSET $2", [10, 0]);
        expect(result).toEqual({ data: fakeRows, total: 42, page: 1, limit: 10 });
    });

    it("calcula o OFFSET corretamente para páginas além da primeira", async () => {
        const query = makeMockQuery();
        await paginate(query, {
            baseSql: "SELECT * FROM x",
            countSql: "SELECT COUNT(*) FROM x",
            page: 3,
            limit: 20,
        });

        expect(query).toHaveBeenNthCalledWith(1, "SELECT * FROM x LIMIT $1 OFFSET $2", [20, 40]);
    });

    it("aplica valores padrão quando page/limit não são números válidos", async () => {
        const query = makeMockQuery();
        const result = await paginate(query, {
            baseSql: "SELECT * FROM x",
            countSql: "SELECT COUNT(*) FROM x",
            page: "abc",
            limit: undefined,
        });

        // page inválida → 1; limit ausente → default (20)
        expect(query).toHaveBeenNthCalledWith(1, "SELECT * FROM x LIMIT $1 OFFSET $2", [20, 0]);
        expect(result.page).toBe(1);
        expect(result.limit).toBe(20);
    });

    it("nunca ultrapassa o limite máximo (100), mesmo se solicitado maior", async () => {
        const query = makeMockQuery();
        const result = await paginate(query, {
            baseSql: "SELECT * FROM x",
            countSql: "SELECT COUNT(*) FROM x",
            page: 1,
            limit: 9999,
        });

        expect(result.limit).toBe(100);
    });

    it("nunca gera página menor que 1", async () => {
        const query = makeMockQuery();
        const result = await paginate(query, {
            baseSql: "SELECT * FROM x",
            countSql: "SELECT COUNT(*) FROM x",
            page: -5,
            limit: 10,
        });

        expect(result.page).toBe(1);
    });
});

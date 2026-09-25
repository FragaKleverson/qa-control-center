/**
 * Helper de paginação — Fase 4, Item 12.
 *
 * Paginação é opt-in: se o caller não passar page/limit, o comportamento
 * original (retornar todas as linhas como array) é preservado — isso evita
 * quebrar consumidores existentes (ex: frontend) que ainda esperam um array.
 * Quando page e/ou limit são informados, retorna o envelope
 * { data, total, page, limit } (mesmo formato já usado em listAuditLogs).
 */

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

// Indica se a paginação foi solicitada explicitamente pelo caller
function isPaginationRequested({ page, limit } = {}) {
  return page !== undefined || limit !== undefined;
}

/**
 * Executa a query paginada + contagem total em paralelo.
 * @param {Function} query - helper de query (sql, params) => Promise<pg.Result>
 * @param {object} opts
 * @param {string} opts.baseSql - SELECT completo, incluindo WHERE/ORDER BY, sem LIMIT/OFFSET
 * @param {string} opts.countSql - SELECT COUNT(*) equivalente ao baseSql (mesmo WHERE)
 * @param {number} [opts.page]
 * @param {number} [opts.limit]
 */
async function paginate(query, { baseSql, countSql, page, limit }) {
  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(limit, 10) || DEFAULT_LIMIT, 1), MAX_LIMIT);
  const offset = (pageNum - 1) * limitNum;

  const [rows, count] = await Promise.all([
    query(`${baseSql} LIMIT $1 OFFSET $2`, [limitNum, offset]),
    query(countSql),
  ]);

  return {
    data: rows.rows,
    total: parseInt(count.rows[0].count, 10),
    page: pageNum,
    limit: limitNum,
  };
}

module.exports = { paginate, isPaginationRequested };

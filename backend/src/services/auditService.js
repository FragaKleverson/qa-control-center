/**
 * Serviço de Audit Log — Fase 3, Item 9.
 *
 * logAudit: grava uma entrada na tabela audit_logs.
 *   - Nunca lança exceção: falha silenciosa com log de console.
 *   - Seguro para chamar com await antes de res.json().
 *
 * listAuditLogs: busca entradas com filtros opcionais e paginação.
 */

const pool = require("../db");

/**
 * @param {object} opts
 * @param {number|null} opts.userId
 * @param {string}      opts.entityType  — 'projeto' | 'test_suite' | 'requirement' | 'execucao' | 'test_plan'
 * @param {number|null} opts.entityId
 * @param {string}      opts.action      — 'CREATE' | 'UPDATE' | 'DELETE'
 * @param {object|null} opts.oldValues
 * @param {object|null} opts.newValues
 * @param {string|null} opts.ipAddress
 */
async function logAudit({ userId, entityType, entityId, action, oldValues = null, newValues = null, ipAddress = null }) {
  try {
    await pool.query(
      `INSERT INTO audit_logs (user_id, entity_type, entity_id, action, old_values, new_values, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        userId   ?? null,
        entityType,
        entityId ?? null,
        action,
        oldValues  ? JSON.stringify(oldValues)  : null,
        newValues  ? JSON.stringify(newValues)  : null,
        ipAddress ?? null,
      ]
    );
  } catch (err) {
    console.error("[audit] falha ao gravar log:", err.message);
  }
}

/**
 * Lista entradas do audit log com filtros e paginação.
 * Usado pelo endpoint GET /admin/audit-log.
 */
async function listAuditLogs({ entityType, entityId, userId, action, from, to, page = 1, limit = 20 } = {}) {
  const conditions = [];
  const params    = [];

  if (entityType) { conditions.push(`al.entity_type = $${params.length + 1}`); params.push(entityType); }
  if (entityId)   { conditions.push(`al.entity_id   = $${params.length + 1}`); params.push(parseInt(entityId)); }
  if (userId)     { conditions.push(`al.user_id     = $${params.length + 1}`); params.push(parseInt(userId)); }
  if (action)     { conditions.push(`al.action      = $${params.length + 1}`); params.push(action.toUpperCase()); }
  if (from)       { conditions.push(`al.created_at >= $${params.length + 1}`); params.push(from); }
  if (to)         { conditions.push(`al.created_at <= $${params.length + 1}`); params.push(to); }

  const where  = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const offset = (parseInt(page) - 1) * parseInt(limit);

  const [rows, count] = await Promise.all([
    pool.query(
      `SELECT al.*, u.name AS user_name, u.email AS user_email
       FROM audit_logs al
       LEFT JOIN users u ON u.id = al.user_id
       ${where}
       ORDER BY al.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, parseInt(limit), offset]
    ),
    pool.query(`SELECT COUNT(*) FROM audit_logs al ${where}`, params),
  ]);

  return {
    data:  rows.rows,
    total: parseInt(count.rows[0].count),
    page:  parseInt(page),
    limit: parseInt(limit),
  };
}

module.exports = { logAudit, listAuditLogs };

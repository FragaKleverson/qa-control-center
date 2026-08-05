/**
 * Rotas de gestão de usuários — acesso exclusivo para role 'admin'.
 *
 * GET    /admin/usuarios          — lista todos os usuários
 * PATCH  /admin/usuarios/:id/role — altera o role de um usuário
 * DELETE /admin/usuarios/:id      — remove um usuário
 */

const express = require("express");
const router = express.Router();
const { z } = require("zod");
const authService = require("../services/authService");
const { listAuditLogs } = require("../services/auditService");
const { authorize } = require("../middleware/authorize");
const { validate } = require("../middleware/validate");
const { idParamSchema } = require("../validators/common");

const changeRoleSchema = z.object({
  role: z.enum(["admin", "qa", "reader"], {
    errorMap: () => ({ message: "Role inválido. Valores aceitos: admin, qa, reader" }),
  }),
});

// Todas as rotas aqui exigem role 'admin'
router.use(authorize("admin"));

/**
 * @swagger
 * /admin/usuarios:
 *   get:
 *     summary: Listar todos os usuários
 *     tags:
 *       - Admin
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de usuários (sem password_hash)
 *       403:
 *         description: Acesso negado — requer role admin
 */
router.get("/usuarios", async (req, res, next) => {
  try {
    const users = await authService.getAllUsers();
    res.json(users);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /admin/usuarios/{id}/role:
 *   patch:
 *     summary: Alterar role de um usuário
 *     tags:
 *       - Admin
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [admin, qa, reader]
 *     responses:
 *       200:
 *         description: Role atualizado
 *       400:
 *         description: Role inválido
 *       403:
 *         description: Não pode alterar próprio role
 *       404:
 *         description: Usuário não encontrado
 */
router.patch(
  "/usuarios/:id/role",
  validate(idParamSchema, "params"),
  validate(changeRoleSchema),
  async (req, res, next) => {
    try {
      const user = await authService.changeUserRole(
        req.params.id,
        req.user.id,
        req.body.role
      );
      res.json(user);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @swagger
 * /admin/usuarios/{id}:
 *   delete:
 *     summary: Remover usuário
 *     tags:
 *       - Admin
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Usuário removido
 *       403:
 *         description: Não pode deletar própria conta
 *       404:
 *         description: Usuário não encontrado
 */
router.delete(
  "/usuarios/:id",
  validate(idParamSchema, "params"),
  async (req, res, next) => {
    try {
      await authService.deleteUser(req.params.id, req.user.id);
      res.json({ message: "Usuário removido com sucesso." });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @swagger
 * /admin/audit-log:
 *   get:
 *     summary: Listar entradas do audit log
 *     tags:
 *       - Admin
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: query, name: entity_type, schema: { type: string } }
 *       - { in: query, name: entity_id,   schema: { type: integer } }
 *       - { in: query, name: user_id,     schema: { type: integer } }
 *       - { in: query, name: action,      schema: { type: string, enum: [CREATE, UPDATE, DELETE] } }
 *       - { in: query, name: from,        schema: { type: string, format: date-time } }
 *       - { in: query, name: to,          schema: { type: string, format: date-time } }
 *       - { in: query, name: page,        schema: { type: integer, default: 1 } }
 *       - { in: query, name: limit,       schema: { type: integer, default: 20 } }
 *     responses:
 *       200:
 *         description: Lista paginada de audit logs
 *       403:
 *         description: Acesso negado — requer role admin
 */
router.get("/audit-log", async (req, res, next) => {
  try {
    const { entity_type, entity_id, user_id, action, from, to, page, limit } = req.query;
    const result = await listAuditLogs({ entityType: entity_type, entityId: entity_id, userId: user_id, action, from, to, page, limit });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;

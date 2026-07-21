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

module.exports = router;

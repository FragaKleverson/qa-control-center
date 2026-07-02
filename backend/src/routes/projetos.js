const express = require("express");
const router = express.Router();
const { projectsService } = require("../services");
const { validate } = require("../middleware/validate");
const { idParamSchema } = require("../validators/common");
const { createSchema, updateSchema } = require("../validators/projetos");

/**
 * @swagger
 * /projetos:
 *   get:
 *     summary: Listar todos os projetos
 *     tags:
 *       - Projetos
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de projetos
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   nome:
 *                     type: string
 *                   descricao:
 *                     type: string
 *       401:
 *         description: Sem token de autenticação
 */
// GET - Listar todos os projetos
router.get("/", async (req, res, next) => {
  try {
    const projetos = await projectsService.listAll();
    res.json(projetos);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /projetos/{id}:
 *   get:
 *     summary: Obter projeto por ID
 *     tags:
 *       - Projetos
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
 *         description: Projeto encontrado
 *       404:
 *         description: Projeto não encontrado
 */
// GET - Obter projeto por ID
router.get("/:id", validate(idParamSchema, "params"), async (req, res, next) => {
  try {
    const projeto = await projectsService.getById(req.params.id);
    if (!projeto) return res.status(404).json({ error: "Projeto não encontrado" });
    res.json(projeto);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /projetos:
 *   post:
 *     summary: Criar novo projeto
 *     tags:
 *       - Projetos
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nome:
 *                 type: string
 *               descricao:
 *                 type: string
 *               status:
 *                 type: string
 *     responses:
 *       201:
 *         description: Projeto criado
 */
// POST - Criar novo projeto
router.post("/", validate(createSchema), async (req, res) => {
  try {
    const projeto = await projectsService.create(req.body);
    res.status(201).json(projeto);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

/**
 * @swagger
 * /projetos/{id}:
 *   put:
 *     summary: Atualizar projeto
 *     tags:
 *       - Projetos
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
 *     responses:
 *       200:
 *         description: Projeto atualizado
 */
// PUT - Atualizar projeto
router.put("/:id", validate(idParamSchema, "params"), validate(updateSchema), async (req, res) => {
  try {
    const projeto = await projectsService.update(req.params.id, req.body);
    res.json(projeto);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

/**
 * @swagger
 * /projetos/{id}:
 *   delete:
 *     summary: Deletar projeto
 *     tags:
 *       - Projetos
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
 *         description: Projeto deletado
 */
// DELETE - Deletar projeto
router.delete("/:id", validate(idParamSchema, "params"), async (req, res) => {
  try {
    await projectsService.delete(req.params.id);
    res.json({ message: "Projeto deletado com sucesso" });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;